jest.mock('@/core/utils', () => ({
  __esModule: true,
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { ConfigManager } from '@/core/config/configManager';
import { OpenAIProviderSpecificConfig, ProviderSpecificConfig } from '../../../src/core/types/config.types'; // <-- Check if this file exists
import { ProviderRequest, ProviderResponse } from '../../../src/core/types/provider.types'; // <-- Check if this file exists

// ESM-compatible mock for logger
jest.unstable_mockModule('@/core/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock ConfigManager
const MockedConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>;
jest.mock('@/core/config/configManager');

describe('OpenAIProvider', () => {
;

  let OpenAIProvider: any;
  let loggerActual: any;
  let provider: any;
  let mockOpenAIConstructorSpy: any;
  let mockCreate: any;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let baseConfig: OpenAIProviderSpecificConfig;
  let chatRequest: ProviderRequest;
  let completionRequest: ProviderRequest;
  let infoMock: jest.Mock;
  let errorMock: jest.Mock;

  beforeAll(async () => {
    jest.resetModules();
    const openaiProviderModule = await import('../../../src/providers/openai/openaiProvider');
    OpenAIProvider = openaiProviderModule.OpenAIProvider;
    loggerActual = await import('@/core/utils');
    const openaiMock = await import('../../../__mocks__/openai');
    mockCreate = openaiMock.mockCreate;
    mockOpenAIConstructorSpy = openaiMock.mockOpenAIConstructorSpy;
    // Use ESM-compatible mocking for logger
    const loggerModule = await import('@/core/utils/logger');
    infoMock = loggerModule.info as jest.Mock;
    errorMock = loggerModule.error as jest.Mock;
  });

  beforeEach(() => {
    // mockOpenAIConstructorSpy.mockClear(); // Not needed, use jest.clearAllMocks() below
    mockCreate.mockClear();
    infoMock.mockClear();
    errorMock.mockClear();
    if ((loggerActual.warn as jest.Mock).mockClear) (loggerActual.warn as jest.Mock).mockClear();
    if ((loggerActual.debug as jest.Mock).mockClear) (loggerActual.debug as jest.Mock).mockClear();
    // Removed MockedConfigManager.mockClear(); (not a function on class)
    mockConfigManager = new MockedConfigManager() as jest.Mocked<ConfigManager>;
    // Ensure getResolvedApiKey is a Jest mock
    mockConfigManager.getResolvedApiKey = jest.fn(async (_config: ProviderSpecificConfig) => { /* no explicit return */ }) as jest.MockedFunction<(providerConfig: ProviderSpecificConfig) => Promise<string | undefined>>;

    baseConfig = {
      providerType: 'openai-chat',
      instanceName: 'testInstance',
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
    };

    provider = new OpenAIProvider(mockConfigManager, mockOpenAIConstructorSpy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and name', () => {
    it('should have the correct name', () => {
      expect(provider.name).toBe('openai');
    });

    it('should initialize with a config manager', () => {
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });
  });

  describe('configure', () => {
    it('should configure successfully with a valid API key', async () => {
      mockConfigManager.getResolvedApiKey.mockResolvedValue('resolved-api-key');
      await provider.configure(baseConfig);

      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(baseConfig);
      expect(mockOpenAIConstructorSpy).toHaveBeenCalledWith({
        apiKey: 'resolved-api-key',
        // baseURL omitted if undefined,
        // timeout omitted if undefined,
        maxRetries: baseConfig.maxRetries || 2,
      });
      expect(infoMock).toHaveBeenCalledWith(`OpenAIProvider configured for instance: ${baseConfig.instanceName}`);
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

      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(fullConfig);
      expect(mockOpenAIConstructorSpy).toHaveBeenCalledWith({
        apiKey: 'resolved-api-key',
        baseURL: 'https://api.example.com/v1',
        timeout: 60_000,
        maxRetries: 5,
      });
      expect(infoMock).toHaveBeenCalledWith(`OpenAIProvider configured for instance: ${fullConfig.instanceName}`);
    });

    it('should throw an error if API key is missing during configuration', async () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce(undefined);
      await expect(provider.configure(baseConfig)).rejects.toThrow(
        `OpenAI API key not found for providerType: ${baseConfig.providerType} (instance: ${baseConfig.instanceName}). Please configure it using the CLI.`
      );
    });

    it('should reconfigure the client if already configured', async () => {
      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce('initial-key');
      await provider.configure(baseConfig);
      expect(mockOpenAIConstructorSpy).toHaveBeenCalledTimes(1);
      expect(infoMock).toHaveBeenCalledWith(`OpenAIProvider configured for instance: ${baseConfig.instanceName}`);

      const newConfig: OpenAIProviderSpecificConfig = { ...baseConfig, model: 'gpt-4-turbo', instanceName: 'testInstanceNew' };
      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce('new-key');
      await provider.configure(newConfig);
      expect(mockOpenAIConstructorSpy).toHaveBeenCalledTimes(2);
      expect(mockOpenAIConstructorSpy).toHaveBeenLastCalledWith({
        apiKey: 'new-key',
        // baseURL omitted if undefined,
        // timeout omitted if undefined,
        maxRetries: newConfig.maxRetries || 2,
      });
      expect(infoMock).toHaveBeenCalledWith(`OpenAIProvider configured for instance: ${newConfig.instanceName}`);
    });
  });

  it('should throw an error if not configured before chat', async () => {
    const unconfiguredProvider = new OpenAIProvider(mockConfigManager, mockOpenAIConstructorSpy);
    await expect(unconfiguredProvider.chat(chatRequest)).rejects.toThrow('OpenAIProvider not configured. Call configure() first.');
  });

  it('should throw an error if API key is missing during chat after attempting configuration', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockConfigManager.getResolvedApiKey.mockResolvedValue(undefined);
    await expect(provider.configure(baseConfig)).rejects.toThrow(
      `OpenAI API key not found for providerType: ${baseConfig.providerType} (instance: ${baseConfig.instanceName}). Please configure it using the CLI.`
    );
  });

  describe('chat', () => {
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
      // Set up the mock to resolve with a known response
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

      expect(mockCreate).toHaveBeenCalledWith({
        model: chatRequest.model,
        messages: chatRequest.messages,
        temperature: chatRequest.temperature,
        max_tokens: chatRequest.maxTokens,
      });
      expect(response.success).toBe(true);
      expect(response.content).toBe('Hello! How can I help you today?');
      expect(response.error).toBeUndefined();
      expect(
        infoMock.mock.calls.map(args => args[0])
      ).toContain(
        `Chat completion successful for instance ${baseConfig.instanceName} with model ${chatRequest.model}`
      );

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

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: baseConfig.model,
      }));
    });

    it('should handle API error during chat completion', async () => {
      const apiError = new Error('API connection timed out');
      mockCreate.mockRejectedValueOnce(apiError);

      const response = await provider.chat(chatRequest);

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('API connection timed out');
      expect(response.rawResponse).toBe(apiError);
      expect(errorMock).toHaveBeenCalledWith(
        `Error during OpenAI chat completion: API connection timed out`
      );
    });

    it('should handle API error with no specific message', async () => {
      const apiError = new Error('An error occurred');
      mockCreate.mockRejectedValue(apiError);

      const response = await provider.chat(chatRequest);

      expect(response.success).toBe(false);
      expect(response.error?.message).toEqual(apiError.message);
      expect(response.rawResponse).toEqual(apiError);
    });
  });

  it('should throw an error if not configured before generateCompletion', async () => {
    const unconfiguredProvider = new OpenAIProvider(mockConfigManager, mockOpenAIConstructorSpy);
    await expect(unconfiguredProvider.generateCompletion(completionRequest)).rejects.toThrow('OpenAIProvider not configured. Call configure() first.');
  });

  describe('generateCompletion', () => {
    let baseConfigForCompletion: OpenAIProviderSpecificConfig;

    beforeEach(async () => {
      baseConfigForCompletion = {
        providerType: 'openai-completion',
        instanceName: 'testInstanceGenCompletion',
        apiKey: 'test-api-key-gen',
        model: 'gpt-3.5-turbo-instruct',
      };
      mockConfigManager.getResolvedApiKey.mockResolvedValue('resolved-api-key-gen');
      await provider.configure(baseConfigForCompletion);
      completionRequest = {
        messages: [{ role: 'user', content: 'Write a tagline for a coffee shop.' }],
        temperature: 0.7,
        maxTokens: 50,
      };
      mockCreate.mockClear();
      mockCreate.mockResolvedValue({
        id: 'cmpl-xxxx',
        object: 'text_completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo-instruct',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Coffee: Brewtiful Mornings!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      });
    });

    it('should return a successful completion', async () => {
      const response = await provider.generateCompletion(completionRequest);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: completionRequest.model || baseConfigForCompletion.model,
        messages: [{ role: 'user', content: completionRequest.messages![0].content }],
        temperature: completionRequest.temperature,
        max_tokens: completionRequest.maxTokens,
      }));
      expect(response.success).toBe(true);
      expect(response.content).toBe('Coffee: Brewtiful Mornings!');
      expect(
        infoMock.mock.calls.map(args => args[0])
      ).toContain(
        `Chat completion successful for instance ${baseConfigForCompletion.instanceName} with model ${completionRequest.model || baseConfigForCompletion.model}`
      );

    });

    it('should use providerConfig model if request model is not provided for completion', async () => {
      const requestWithoutModel = { ...completionRequest };
      delete requestWithoutModel.model;
      await provider.generateCompletion(requestWithoutModel);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: baseConfigForCompletion.model,
        messages: [{ role: 'user', content: 'Write a tagline for a coffee shop.' }],
      }));
    });

    it('should handle API error during completion', async () => {
      const apiError = new Error('Completion API failed');
      mockCreate.mockRejectedValue(apiError);

      const response = await provider.generateCompletion(completionRequest);

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Completion API failed');
      expect(response.rawResponse).toBe(apiError);
      expect(errorMock).toHaveBeenCalledWith(
        `Error during OpenAI chat completion: Completion API failed`
      );
    });

    it('should return a failed response if the underlying chat call fails', async () => {
      const apiError = new Error('Underlying API Error');
      mockCreate.mockRejectedValue(apiError);
      const response = await provider.generateCompletion(completionRequest);

      expect(response.success).toBe(false);
      expect(response.error?.message).toEqual(apiError.message);
      expect(response.rawResponse).toEqual(apiError);
    });
  });
});
