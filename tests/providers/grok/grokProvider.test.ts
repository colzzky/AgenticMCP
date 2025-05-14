/**
 * Unit tests for GrokProvider
 * Tests the provider implementation for X/Grok API
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GrokProvider } from '../../../src/providers/grok/grokProvider.js';
import type { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { OpenAIProviderSpecificConfig } from '../../../src/core/types/config.types.js';

// Mock OpenAI SDK (used by GrokProvider)
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            id: 'mock-completion-id',
            model: 'grok-1',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Mock completion from Grok',
                  tool_calls: []
                },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30
            }
          })
        }
      }
    }))
  };
});

describe('GrokProvider', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockConfigManager = {
    loadConfig: jest.fn(),
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    getProviderConfigByAlias: jest.fn(),
    getResolvedApiKey: jest.fn().mockResolvedValue('mock-api-key'),
    getDefaults: jest.fn(),
    getMcpConfig: jest.fn()
  } as unknown as ConfigManager;

  // Mock OpenAI constructor and client (used by GrokProvider)
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  };
  
  const MockOpenAIClass = jest.fn().mockImplementation(() => mockOpenAIClient);

  let provider: GrokProvider;
  const mockConfig: OpenAIProviderSpecificConfig = {
    providerType: 'grok',
    model: 'grok-1',
    temperature: 0.7
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue('mock-api-key');
    // Create provider with the mocked OpenAI class
    provider = new GrokProvider(mockConfigManager, mockLogger);
    // Replace the provider's internal OpenAI class with our mock
    Object.defineProperty(provider, 'OpenAIClass', { value: MockOpenAIClass });
  });

  describe('name property', () => {
    it('should return the correct provider name', () => {
      expect(provider.name).toBe('grok');
    });
  });

  describe('configure', () => {
    it('should use default Grok API endpoint when not specified', async () => {
      await provider.configure(mockConfig);
      
      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(mockConfig);
      expect(MockOpenAIClass).toHaveBeenCalledWith({
        apiKey: 'mock-api-key',
        baseURL: 'https://api.x.ai/v1'
      });
    });

    it('should use custom API endpoint when specified', async () => {
      const configWithBaseURL = {
        ...mockConfig,
        baseURL: 'https://custom-grok-api.example.com/v1'
      };
      
      await provider.configure(configWithBaseURL);
      
      expect(MockOpenAIClass).toHaveBeenCalledWith({
        apiKey: 'mock-api-key',
        baseURL: 'https://custom-grok-api.example.com/v1'
      });
    });

    it('should include organization ID when provided', async () => {
      const configWithOrg = {
        ...mockConfig,
        organization: 'org-123'
      };
      
      await provider.configure(configWithOrg);
      
      expect(MockOpenAIClass).toHaveBeenCalledWith({
        apiKey: 'mock-api-key',
        baseURL: 'https://api.x.ai/v1',
        organization: 'org-123'
      });
    });
  });

  describe('chat', () => {
    beforeEach(async () => {
      await provider.configure(mockConfig);
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        id: 'mock-completion-id',
        model: 'grok-1',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Mock completion from Grok',
              tool_calls: []
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      });
    });

    it('should make a chat completion request with provided messages', async () => {
      const request = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Tell me about X/Grok AI.' }
        ]
      };
      
      await provider.chat(request);
      
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
        model: 'grok-1',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Tell me about X/Grok AI.' }
        ],
        temperature: 0.7
      }));
    });

    it('should properly parse Grok API response', async () => {
      const request = {
        messages: [{ role: 'user', content: 'Hello Grok' }]
      };
      
      const response = await provider.chat(request);
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Mock completion from Grok');
      expect(response.id).toBe('mock-completion-id');
      expect(response.model).toBe('grok-1');
      expect(response.finishReason).toBe('stop');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      });
    });

    it('should handle API errors gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('Grok API error'));
      
      const request = {
        messages: [{ role: 'user', content: 'This will cause an error' }]
      };
      
      const response = await provider.chat(request);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toBe('Grok API error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('generateText', () => {
    it('should delegate to chat method', async () => {
      const chatSpy = jest.spyOn(provider, 'chat').mockResolvedValue({
        success: true,
        content: 'Test content from Grok'
      });
      
      const request = {
        messages: [{ role: 'user', content: 'Generate some text with Grok' }]
      };
      
      const response = await provider.generateText(request);
      
      expect(chatSpy).toHaveBeenCalledWith(request);
      expect(response.success).toBe(true);
      expect(response.content).toBe('Test content from Grok');
    });
  });

  describe('Tool Integration', () => {
    it('should support tool calls like OpenAI', async () => {
      await provider.configure(mockConfig);
      
      // Configure with a function call in the response
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        id: 'mock-completion-id',
        model: 'grok-1',
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location":"San Francisco, CA"}'
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }
        ]
      });
      
      const sampleTools = [
        {
          type: 'function',
          name: 'get_weather',
          description: 'Get the current weather in a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA'
              }
            },
            required: ['location']
          }
        }
      ];
      
      const request = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: sampleTools
      };
      
      const response = await provider.chat(request);
      
      // Verify tools are passed correctly in the request
      const requestOptions = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      expect(requestOptions.tools).toBeDefined();
      expect(requestOptions.tools[0].function.name).toBe('get_weather');
      
      // Verify response parsing
      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![0].arguments).toBe('{"location":"San Francisco, CA"}');
      expect(response.finishReason).toBe('tool_calls');
    });
  });
});