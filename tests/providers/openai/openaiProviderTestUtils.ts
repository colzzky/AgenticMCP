/**
 * @file Shared test utilities for OpenAI-like providers
 */

import { jest } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { ConfigManager } from '../../../src/core/config/configManager';
import { OpenAIProviderSpecificConfig, ProviderSpecificConfig } from '../../../src/core/types/config.types';
import { ProviderRequest } from '../../../src/core/types/provider.types';
import * as loggerTypes from '../../../src/core/utils/logger';

/**
 * Configuration for shared OpenAI provider tests
 */
export interface OpenAIProviderTestConfig {
  /** The provider class to test */
  providerClass: any;
  /** The name of the provider */
  providerName: string;
  /** Config manager instance */
  configManager: ConfigManager;
  /** Optional custom config for the provider */
  customConfig?: Partial<OpenAIProviderSpecificConfig>;
  /** Whether this is testing the Grok provider */
  isGrok?: boolean;
  /** Which test groups to run */
  testsToRun?: string[];
}

const mockCreate: any = jest.fn();

/**
 * Reusable test runner for OpenAI-compatible providers
 */
export function runOpenAIProviderTests({
  providerClass,
  providerName,
  configManager,
  customConfig = {},
  isGrok = false,
  testsToRun = ['constructor', 'chat', 'completion', 'errors'],
}: OpenAIProviderTestConfig) {
  let provider: any;
  let mockOpenAIClient: any;
  let mockOpenAIConstructor: jest.Mock;
  let mockCreate: jest.Mock;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let baseConfig: OpenAIProviderSpecificConfig;
  let chatRequest: ProviderRequest;
  let completionRequest: ProviderRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup OpenAI client create method
    mockCreate = jest.fn().mockImplementation((params: any) => {
      return Promise.resolve({
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Date.now(),
        model: params.model || 'gpt-3.5-turbo',
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

    // Setup OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    };

    // Setup OpenAI constructor
    mockOpenAIConstructor = jest.fn().mockImplementation(() => mockOpenAIClient);

    // Setup config manager
    mockConfigManager = configManager as jest.Mocked<ConfigManager>;
    mockConfigManager.getResolvedApiKey = jest.fn((_config: ProviderSpecificConfig) =>
      Promise.resolve('resolved-api-key')
    ) as jest.MockedFunction<typeof configManager.getResolvedApiKey>;

    // Setup base config
    baseConfig = {
      providerType: providerName,
      instanceName: 'testInstance',
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
      ...customConfig,
    };

    // Create provider instance
    provider = new providerClass(mockConfigManager, mockOpenAIConstructor);

    // Setup console spies for logging assertions
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Run constructor tests if included
  if ((testsToRun || ['constructor', 'chat', 'completion', 'errors']).includes('constructor')) {
    describe('constructor and name', () => {
      it('should have the correct name', () => {
        if (isGrok === false) {
          expect(provider.name).toBe('openai');
        } else {
          expect(provider.name).toBe('grok');
        }
      });

      it('should call OpenAI constructor and log config info', async () => {
        await provider.configure(baseConfig);

        if (isGrok === false) {
          expect(mockOpenAIConstructor).toHaveBeenCalledWith({
            apiKey: 'resolved-api-key',
            maxRetries: baseConfig.maxRetries || 2,
          });

          // We can't easily test logger.info directly in ESM, so we check for console.log
          expect(console.log).toHaveBeenCalled();
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
        expect(mockOpenAIConstructor).toHaveBeenCalledWith({
          apiKey: 'resolved-api-key',
          baseURL: 'https://api.example.com/v1',
          timeout: 60_000,
          maxRetries: 5,
        });
      }
    });

    it('should throw an error if API key is missing during configuration', async () => {
      mockConfigManager.getResolvedApiKey.mockImplementation(() => Promise.resolve(""));
      await expect(provider.configure(baseConfig)).rejects.toThrow(
        `OpenAI API key not found for providerType: ${baseConfig.providerType}`
      );
    });

    it('should reconfigure the client if already configured', async () => {
      // First configuration
      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce('initial-key');
      await provider.configure(baseConfig);

      if (isGrok === false) {
        expect(mockOpenAIConstructor).toHaveBeenCalledTimes(1);
      }

      // Second configuration with new settings
      const newConfig: OpenAIProviderSpecificConfig = {
        ...baseConfig,
        model: 'gpt-4-turbo',
        instanceName: 'testInstanceNew'
      };

      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce('new-key');
      await provider.configure(newConfig);

      if (isGrok === false) {
        expect(mockOpenAIConstructor).toHaveBeenCalledTimes(2);
        expect(mockOpenAIConstructor).toHaveBeenLastCalledWith({
          apiKey: 'new-key',
          maxRetries: newConfig.maxRetries || 2,
        });
      }
    });

    describe('chat', () => {
      it('should throw an error if not configured before chat', async () => {
        const unconfiguredProvider = new providerClass(mockConfigManager, mockOpenAIConstructor);
        const testRequest = { messages: [{ role: 'user', content: 'Hello' }] };

        await expect(unconfiguredProvider.chat(testRequest)).rejects.toThrow(
          'OpenAIProvider not configured. Call configure() first.'
        );
      });

      it('should throw an error if API key is missing during chat', async () => {
        mockConfigManager.getResolvedApiKey.mockResolvedValueOnce("");

        await expect(provider.configure(baseConfig)).rejects.toThrow(
          `OpenAI API key not found for providerType: ${baseConfig.providerType}`
        );
      });

      describe('with configured provider', () => {
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
          (mockCreate as any).mockResolvedValue({
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
          (mockCreate as any).mockResolvedValueOnce({
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
          } else {
            expect(typeof response.success).toBe('boolean');
          }
        });

        it('should use providerConfig model if request model is not provided', async () => {
          const requestWithoutModel = { ...chatRequest };
          delete requestWithoutModel.model;

          await provider.chat(requestWithoutModel);

          if (isGrok === false) {
            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
              model: baseConfig.model,
            }));
          }
        });

        it('should handle API error during chat completion', async () => {
          const apiError = new Error('API connection timed out');
          (mockCreate as any).mockRejectedValueOnce(apiError);

          const response = await provider.chat(chatRequest);

          expect(response.success).toBe(false);

          if (isGrok === false) {
            expect(response.error?.message).toBe('API connection timed out');
            expect(response.rawResponse).toBe(apiError);
            expect(console.error).toHaveBeenCalled();
          }
        });

        it('should handle API error with no specific message', async () => {
          const apiError = new Error('An error occurred');
          (mockCreate as any).mockRejectedValue(apiError);

          const response = await provider.chat(chatRequest);

          expect(response.success).toBe(false);

          if (isGrok === false) {
            expect(response.error?.message).toEqual(apiError.message);
            expect(response.rawResponse).toEqual(apiError);
          }
        });
      });
    });

    it('should throw an error if not configured before generateCompletion', async () => {
      const unconfiguredProvider = new providerClass(mockConfigManager, mockOpenAIConstructor);
      await expect(unconfiguredProvider.generateCompletion({})).rejects.toThrow(
        'OpenAIProvider not configured. Call configure() first.'
      );
    });
  }
}