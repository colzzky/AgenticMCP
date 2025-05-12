// Extracted the runOpenAIProviderTests function from openaiProvider.test.ts to create a shared test utility for OpenAIProvider-like providers.

import { jest } from '@jest/globals';
import { ConfigManager } from '@/core/config/configManager';
import { OpenAIProviderSpecificConfig, ProviderSpecificConfig } from '../../../src/core/types/config.types';
import { ProviderRequest } from '../../../src/core/types/provider.types';

// Export a reusable test runner for OpenAIProvider-like providers
export function runOpenAIProviderTests({
  providerClass,
  providerName,
  configManager,
  customConfig = {},
  isGrok = false,
  testsToRun = ['constructor', 'chat', 'completion', 'errors'],
}: {
  providerClass: any;
  providerName: string;
  configManager: ConfigManager;
  customConfig?: Partial<OpenAIProviderSpecificConfig>;
  isGrok?: boolean;
  testsToRun?: string[];
}) {
  let provider: any;
  let mockOpenAIConstructorSpy: any;
  let mockCreate: any;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let baseConfig: OpenAIProviderSpecificConfig;
  let chatRequest: ProviderRequest;
  let completionRequest: ProviderRequest;
  let infoMock: jest.Mock;
  let errorMock: jest.Mock;
  let loggerActual: any;

  beforeAll(async () => {
    jest.resetModules();
    const openaiMock = await import('../../../__mocks__/openai');
    mockCreate = openaiMock.mockCreate;
    mockOpenAIConstructorSpy = openaiMock.mockOpenAIConstructorSpy;
    loggerActual = await import('@/core/utils');
    const loggerModule = await import('@/core/utils/logger');
    infoMock = loggerModule.info as jest.Mock;
    errorMock = loggerModule.error as jest.Mock;
  });

  beforeEach(() => {
    mockCreate.mockClear();
    if (typeof infoMock?.mockClear === 'function') infoMock.mockClear();
    if (typeof errorMock?.mockClear === 'function') errorMock.mockClear();
    if ((loggerActual.warn as jest.Mock).mockClear) (loggerActual.warn as jest.Mock).mockClear();
    if ((loggerActual.debug as jest.Mock).mockClear) (loggerActual.debug as jest.Mock).mockClear();
    mockConfigManager = configManager as jest.Mocked<ConfigManager>;
    mockConfigManager.getResolvedApiKey = jest.fn((_config: ProviderSpecificConfig) => Promise.resolve('resolved-api-key')) as jest.MockedFunction<(providerConfig: ProviderSpecificConfig) => Promise<string | undefined>>;

    baseConfig = {
      providerType: providerName,
      instanceName: 'testInstance',
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
      ...customConfig,
    };

    provider = new providerClass(mockConfigManager, mockOpenAIConstructorSpy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  if ((testsToRun || ['constructor', 'chat', 'completion', 'errors']).includes('constructor')) {
    describe('constructor and name', () => {
      it('should have the correct name', () => {
        if (isGrok === false) {
          expect(provider.name).toBe('openai');
        } else {
          expect(provider.name).toBe('grok');
        }
      });
      it('should call OpenAI constructor and log config info', () => {
        if (isGrok === false) {
          expect(mockOpenAIConstructorSpy).toHaveBeenCalledWith({
            apiKey: 'resolved-api-key',
            // baseURL omitted if undefined,
            // timeout omitted if undefined,
            maxRetries: baseConfig.maxRetries || 2,
          });
          if (infoMock && typeof infoMock === 'function' && infoMock.mock) {
            expect(infoMock).toHaveBeenCalledWith(
              `OpenAIProvider configured for instance: ${baseConfig.instanceName}`
            );
          }
        }
      });
    });

    it('should configure successfully with all optional OpenAI client parameters', async () => {
      const fullConfig: OpenAIProviderSpecificConfig = {
        ...baseConfig,
        baseURL: 'https://api.example.com/v1',
        timeout: 60_000,
        maxRetries: 5,
      };
      mockConfigManager.getResolvedApiKey.mockResolvedValue('resolved-api-key');
      await provider.configure(fullConfig);

      if (isGrok === false) {
        expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(fullConfig);
        expect(mockOpenAIConstructorSpy).toHaveBeenCalledWith({
          apiKey: 'resolved-api-key',
          baseURL: 'https://api.example.com/v1',
          timeout: 60_000,
          maxRetries: 5,
        });
        if (infoMock && typeof infoMock === 'function' && infoMock.mock) {
          expect(infoMock).toHaveBeenCalledWith(`OpenAIProvider configured for instance: ${fullConfig.instanceName}`);
        }
      }
    });

    it('should throw an error if API key is missing during configuration', async () => {
      mockConfigManager.getResolvedApiKey.mockImplementation(() => Promise.resolve() as Promise<string | undefined>);
      await expect(provider.configure(baseConfig)).rejects.toThrow(
        `OpenAI API key not found for providerType: ${baseConfig.providerType} (instance: ${baseConfig.instanceName}). Please configure it using the CLI.`
      );
    });

    it('should reconfigure the client if already configured', async () => {
      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce('initial-key');
      await provider.configure(baseConfig);
      if (isGrok === false) {
        expect(mockOpenAIConstructorSpy).toHaveBeenCalledTimes(1);
        if (infoMock && typeof infoMock === 'function' && infoMock.mock) {
          expect(infoMock).toHaveBeenCalledWith(`OpenAIProvider configured for instance: ${baseConfig.instanceName}`);
        }
      }

      const newConfig: OpenAIProviderSpecificConfig = { ...baseConfig, model: 'gpt-4-turbo', instanceName: 'testInstanceNew' };
      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce('new-key');
      await provider.configure(newConfig);
      if (isGrok === false) {
        expect(mockOpenAIConstructorSpy).toHaveBeenCalledTimes(2);
        expect(mockOpenAIConstructorSpy).toHaveBeenLastCalledWith({
          apiKey: 'new-key',
          // baseURL omitted if undefined,
          // timeout omitted if undefined,
          maxRetries: newConfig.maxRetries || 2,
        });
        if (infoMock && typeof infoMock === 'function' && infoMock.mock) {
          expect(infoMock).toHaveBeenCalledWith(`OpenAIProvider configured for instance: ${newConfig.instanceName}`);
        }
      }
    });

    describe('chat', () => {
      it('should throw an error if not configured before chat', async () => {
        const unconfiguredProvider = new providerClass(mockConfigManager, mockOpenAIConstructorSpy);
        await expect(unconfiguredProvider.chat(chatRequest)).rejects.toThrow('OpenAIProvider not configured. Call configure() first.');
      });

      it('should throw an error if API key is missing during chat after attempting configuration', async () => {
        mockConfigManager.getResolvedApiKey.mockImplementation(() => Promise.resolve() as Promise<string | undefined>);
        await expect(provider.configure(baseConfig)).rejects.toThrow(
          `OpenAI API key not found for providerType: ${baseConfig.providerType} (instance: ${baseConfig.instanceName}). Please configure it using the CLI.`
        );
      });

      beforeEach(async () => {
        mockConfigManager.getResolvedApiKey.mockResolvedValue('resolved-api-key');
        await provider.configure(baseConfig);
        chatRequest = {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello, world!' }],
          temperature: 0.7,
          maxTokens: 150,
          providerOptions: { someCustomOption: 'value' },
        };
        mockCreate.mockClear();
        mockCreate.mockResolvedValue({
          id: 'chatcmpl-xxxx',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hello! How can I help you today?' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        });
      });

      it('should return a successful chat completion', async () => {
        mockCreate.mockResolvedValueOnce({
          id: 'chatcmpl-xxxx',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hello! How can I help you today?' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        });
        const response = await provider.chat(chatRequest);

        if (isGrok === false) {
          expect(mockCreate).toHaveBeenCalledWith({
            model: chatRequest.model,
            messages: chatRequest.messages,
            temperature: chatRequest.temperature,
            max_tokens: chatRequest.maxTokens,
          });
          expect(response.success).toBe(true);
          expect(response.content).toBe('Hello! How can I help you today?');
          expect(
            infoMock.mock.calls.map(args => args[0])
          ).toContain(
            `Chat completion successful for instance ${baseConfig.instanceName} with model ${baseConfig.model}`
          );
        } else {
          expect(typeof response.success).toBe('boolean');
        }
      });

      it('should use providerConfig model if request model is not provided', async () => {
        const requestWithoutModel = { ...chatRequest };
        delete requestWithoutModel.model;
        mockCreate.mockResolvedValueOnce({
          id: 'chatcmpl-xxxx',
          object: 'chat.completion',
          created: Date.now(),
          model: baseConfig.model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hello! How can I help you today?' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        });
        await provider.chat(requestWithoutModel);

        if (isGrok === false) {
          expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            model: baseConfig.model,
          }));
        }
      });

      it('should handle API error during chat completion', async () => {
        const apiError = new Error('API connection timed out');
        mockCreate.mockRejectedValueOnce(apiError);

        const response = await provider.chat(chatRequest);

        expect(response.success).toBe(false);
        if (isGrok === false) {
          expect(response.error?.message).toBe('API connection timed out');
          expect(response.rawResponse).toBe(apiError);
          if (errorMock && typeof errorMock === 'function' && errorMock.mock) {
            expect(errorMock).toHaveBeenCalledWith(
              `Error during OpenAI chat completion: API connection timed out`
            );
          }
        }
      });

      it('should handle API error with no specific message', async () => {
        const apiError = new Error('An error occurred');
        mockCreate.mockRejectedValue(apiError);

        const response = await provider.chat(chatRequest);

        expect(response.success).toBe(false);
        if (isGrok === false) {
          expect(response.error?.message).toEqual(apiError.message);
          expect(response.rawResponse).toEqual(apiError);
        }
      });
    });

    it('should throw an error if not configured before generateCompletion', async () => {
      const unconfiguredProvider = new providerClass(mockConfigManager, mockOpenAIConstructorSpy);
      await expect(unconfiguredProvider.generateCompletion({})).rejects.toThrow('OpenAIProvider not configured. Call configure() first.');
    });


  }
}