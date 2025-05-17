/**
 * Unit tests for OpenAIProvider basic functionality
 * Tests the provider implementation for OpenAI
 */
// @ts-ignore
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider.js';
import type { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { 
  ProviderRequest, 
  ProviderResponse, 
  ToolCall
} from '../../../src/core/types/provider.types.js';
import type { OpenAIProviderSpecificConfig } from '../../../src/core/types/config.types.js';

// Mock OpenAI SDK
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: (jest.fn() as any).mockImplementation(() => ({
      chat: {
        completions: {
          create: (jest.fn() as any).mockResolvedValue({
            id: 'mock-completion-id',
            model: 'gpt-4',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Mock completion content',
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

describe('OpenAIProvider - Basic Functionality', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn()
  };

  const mockConfigManager = {
    loadConfig: jest.fn(),
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    getProviderConfigByAlias: jest.fn(),
    getResolvedApiKey: (jest.fn() as any).mockResolvedValue('mock-api-key'),
    getDefaults: jest.fn(),
    getMcpConfig: jest.fn()
  } as unknown as ConfigManager;

  // Mock OpenAI constructor
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  };
  
  const MockOpenAIClass = (jest.fn() as any).mockImplementation(() => mockOpenAIClient);

  let provider: OpenAIProvider;
  const mockConfig: OpenAIProviderSpecificConfig = {
    providerType: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    baseURL: 'https://api.openai.com/v1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure getResolvedApiKey always returns a mock API key
    mockConfigManager.getResolvedApiKey = (jest.fn() as any).mockResolvedValue('mock-api-key');
    provider = new OpenAIProvider(mockConfigManager, mockLogger, MockOpenAIClass);
  });

  describe('Constructor', () => {
    it('should initialize with dependencies', () => {
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.name).toBe('openai');
    });

    it('should not create an OpenAI client until configured', () => {
      expect(MockOpenAIClass).not.toHaveBeenCalled();
    });
  });

  describe('configure', () => {
    it('should create an OpenAI client with the provided configuration', async () => {
      await provider.configure(mockConfig);
      
      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(mockConfig);
      expect(MockOpenAIClass).toHaveBeenCalledWith({
        apiKey: 'mock-api-key',
        baseURL: 'https://api.openai.com/v1'
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
        baseURL: 'https://api.openai.com/v1',
        organization: 'org-123'
      });
    });

    it('should throw error if providerType is missing', async () => {
      const invalidConfig = { ...mockConfig };
      delete invalidConfig.providerType;
      
      await expect(provider.configure(invalidConfig)).rejects.toThrow(/missing 'providerType'/);
    });

    it('should throw error if API key cannot be resolved', async () => {
      mockConfigManager.getResolvedApiKey = (jest.fn() as any).mockResolvedValue(undefined);
      
      await expect(provider.configure(mockConfig)).rejects.toThrow(/API key not found/);
    });
  });

  describe('chat', () => {
    beforeEach(async () => {
      await provider.configure(mockConfig);
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        id: 'mock-completion-id',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Mock completion content',
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

    it('should throw error if not configured', async () => {
      const unconfiguredProvider = new OpenAIProvider(mockConfigManager, mockLogger, MockOpenAIClass);
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      const response = await unconfiguredProvider.chat(request);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('not configured');
    });

    it('should make a chat completion request with provided messages', async () => {
      const request: ProviderRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how are you?' }
        ]
      };
      
      await provider.chat(request);
      
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how are you?' }
        ],
        temperature: 0.7
      }));
    });

    it('should use request model and temperature if provided', async () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-3.5-turbo',
        temperature: 0.3
      };
      
      await provider.chat(request);
      
      const callArgs = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-3.5-turbo');
      expect(callArgs.temperature).toBe(0.3);
    });

    it('should handle successful response', async () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      const response = await provider.chat(request);
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Mock completion content');
      expect(response.id).toBe('mock-completion-id');
      expect(response.model).toBe('gpt-4');
      expect(response.finishReason).toBe('stop');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      });
    });

    it('should handle API errors gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('API error'));
      
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      const response = await provider.chat(request);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toBe('API error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('generateCompletion', () => {
    beforeEach(async () => {
      await provider.configure(mockConfig);
    });

    it('should convert the request to a chat format', async () => {
      const chatSpy = jest.spyOn(provider, 'chat');
      
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Complete this: Hello, world...' }]
      };
      
      await provider.generateCompletion(request);
      
      expect(chatSpy).toHaveBeenCalledWith({
        ...request,
        messages: [{ role: 'user', content: 'Complete this: Hello, world...' }],
        model: 'gpt-4'
      });
    });
  });

  describe('generateText', () => {
    it('should delegate to chat method', async () => {
      const chatSpy = jest.spyOn(provider, 'chat').mockResolvedValue({
        success: true,
        content: 'Test content'
      });
      
      const prompt = 'Generate some text';
      const request: ProviderRequest = { messages: [{ role: 'user', content: prompt }] };
      const response = await provider.generateText(request);
      
      expect(chatSpy).toHaveBeenCalledWith(request);
      expect(response.success).toBe(true);
      expect(response.content).toBe('Test content');
    });
  });

  describe('Tool Registry Integration', () => {
    it('should store the tool registry when set', () => {
      const mockToolRegistry = {
        getAllTools: (jest.fn() as any).mockReturnValue([
          { name: 'tool1', type: 'function', description: 'Test tool', parameters: {} }
        ])
      };
      
      provider.setToolRegistry(mockToolRegistry);
      
      expect(provider.getAvailableTools()).toHaveLength(1);
      expect(provider.getAvailableTools()[0].name).toBe('tool1');
    });

    it('should return empty array when no tool registry is set', () => {
      expect(provider.getAvailableTools()).toEqual([]);
    });

    it('should return empty array when tool registry has no getAllTools method', () => {
      provider.setToolRegistry({});
      expect(provider.getAvailableTools()).toEqual([]);
    });
  });

});