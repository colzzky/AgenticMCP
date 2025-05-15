/**
 * Unit tests for AnthropicProvider
 * Tests the basic functionality of the Anthropic provider implementation
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnthropicProvider } from '../../../src/providers/anthropic/anthropicProvider.js';
import type { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { ProviderRequest } from '../../../src/core/types/provider.types.js';
import type { AnthropicProviderSpecificConfig } from '../../../src/core/types/config.types.js';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn()
      }
    }))
  };
});

describe('AnthropicProvider', () => {
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
    getResolvedApiKey: jest.fn().mockResolvedValue('mock-api-key'),
    getDefaults: jest.fn(),
    getMcpConfig: jest.fn()
  } as unknown as ConfigManager;

  // Mock Anthropic client
  const mockAnthropicClient = {
    messages: {
      create: jest.fn()
    }
  };
  
  const MockAnthropicClass = jest.fn().mockImplementation(() => mockAnthropicClient);

  let provider: AnthropicProvider;
  const mockConfig: AnthropicProviderSpecificConfig = {
    providerType: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    temperature: 0.7
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue('mock-api-key');
    provider = new AnthropicProvider(mockConfigManager, mockLogger, MockAnthropicClass);
    await provider.configure(mockConfig);
  });

  describe('Configuration', () => {
    it('should configure the provider with API key from ConfigManager', async () => {
      // New instance for this test
      const newProvider = new AnthropicProvider(mockConfigManager, mockLogger, MockAnthropicClass);
      
      // Configure with custom config
      const testConfig: AnthropicProviderSpecificConfig = {
        providerType: 'anthropic',
        instanceName: 'test-instance',
        model: 'claude-3-opus-20240229',
        temperature: 0.5
      };
      
      await newProvider.configure(testConfig);
      
      // Verify API key was retrieved from ConfigManager
      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(testConfig);
      
      // Verify Anthropic client was initialized with the API key
      expect(MockAnthropicClass).toHaveBeenCalledWith({ apiKey: 'mock-api-key' });
      
      // Verify logger was called with debug (not info)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('test-instance')
      );
    });

    it('should throw an error if API key is not found', async () => {
      // New instance for this test
      const newProvider = new AnthropicProvider(mockConfigManager, mockLogger, MockAnthropicClass);
      
      // Make getResolvedApiKey return null
      mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue(null);
      
      // Expect configure to throw an error
      await expect(newProvider.configure(mockConfig))
        .rejects
        .toThrow('Anthropic API key not found for providerType: anthropic. Ensure it\'s set in credentials or as ANTHROPIC_API_KEY environment variable.');
    });
  });

  describe('Chat method', () => {
    it('should properly format and send a basic chat request', async () => {
      // Setup mock response
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_01Aq9w938a90dw8q',
        model: 'claude-3-5-sonnet-latest',
        content: [
          {
            type: 'text',
            text: 'Hello! How can I help you today?'
          }
        ],
        stop_reason: 'stop_sequence',
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });

      const request: ProviderRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how are you?' }
        ]
      };

      const response = await provider.chat(request);

      // Verify the request was properly formatted
      const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];
      
      // Anthropic doesn't handle system messages in the same way, 
      // so only the user and assistant messages should be included
      expect(requestOptions.messages).toHaveLength(1);
      expect(requestOptions.messages[0].role).toBe('user');
      expect(requestOptions.messages[0].content).toBe('Hello, how are you?');
      
      // Verify model and max_tokens were correctly set
      expect(requestOptions.model).toBe('claude-3-5-sonnet-latest');
      expect(requestOptions.max_tokens).toBe(1024); // Default value
      
      // Verify the response was properly formatted
      expect(response.success).toBe(true);
      expect(response.content).toBe('Hello! How can I help you today?');
      expect(response.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      });
    });

    it('should use configured model and temperature values', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_01',
        model: 'claude-3-opus-20240229',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'stop_sequence'
      });

      // New provider with custom config
      const customConfig: AnthropicProviderSpecificConfig = {
        providerType: 'anthropic',
        model: 'claude-3-opus-20240229',
        temperature: 0.2,
        maxTokens: 2048
      };
      
      const customProvider = new AnthropicProvider(mockConfigManager, mockLogger, MockAnthropicClass);
      await customProvider.configure(customConfig);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await customProvider.chat(request);

      const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(requestOptions.model).toBe('claude-3-opus-20240229');
      expect(requestOptions.temperature).toBe(0.2);
      expect(requestOptions.max_tokens).toBe(2048);
    });

    it('should override configured values with request values when provided', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_01',
        model: 'claude-3-7-sonnet-latest',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'stop_sequence'
      });

      // New request with overrides
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-3-7-sonnet-latest',
        temperature: 0.3,
        maxTokens: 4096
      };

      await provider.chat(request);

      const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(requestOptions.model).toBe('claude-3-7-sonnet-latest');
      expect(requestOptions.temperature).toBe(0.3);
      expect(requestOptions.max_tokens).toBe(4096);
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('Invalid API key')
      );

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error!.message).toBe('Invalid API key');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('AnthropicProvider chat error: Invalid API key')
      );
    });

    it('should return error response if provider is not configured', async () => {
      // New unconfigured provider
      const unconfiguredProvider = new AnthropicProvider(mockConfigManager, mockLogger, MockAnthropicClass);
      
      // Remove internal client and config to simulate unconfigured state
      (unconfiguredProvider as any).client = undefined;
      (unconfiguredProvider as any).providerConfig = undefined;
      
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(unconfiguredProvider.chat(request))
        .rejects
        .toThrow('AnthropicProvider not configured. Call configure() first.');
    });
  });

  describe('generateText and generateCompletion methods', () => {
    it('should call chat method when generateText is called', async () => {
      // Spy on the chat method
      const chatSpy = jest.spyOn(provider, 'chat')
        .mockResolvedValue({
          success: true,
          content: 'Generated text'
        });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Generate some text' }]
      };

      const response = await provider.generateText(request);

      expect(chatSpy).toHaveBeenCalledWith(request);
      expect(response.content).toBe('Generated text');
    });

    it('should call chat method when generateCompletion is called', async () => {
      // Spy on the chat method
      const chatSpy = jest.spyOn(provider, 'chat')
        .mockResolvedValue({
          success: true,
          content: 'Completion text'
        });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Complete this text' }]
      };

      const response = await provider.generateCompletion(request);

      expect(chatSpy).toHaveBeenCalledWith(request);
      expect(response.content).toBe('Completion text');
    });
  });

  describe('Message Handling', () => {
    it('should process multi-turn conversations and extract content blocks', async () => {
      // Multi-turn conversation
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_01',
        model: 'claude-3-5-sonnet-latest',
        content: 'Yes, I can help with that!',
        stop_reason: 'stop_sequence',
      });

      const multiTurnRequest: ProviderRequest = {
        messages: [
          { role: 'user', content: 'Can you help me write a poem?' },
          { role: 'assistant', content: 'I would be happy to help you write a poem. What kind of poem would you like?' },
          { role: 'user', content: 'A haiku about spring.' },
        ],
      };
      await provider.chat(multiTurnRequest);
      const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(requestOptions.messages).toHaveLength(3);

      // Content extraction from blocks
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_02',
        model: 'claude-3-5-sonnet-latest',
        content: [
          { type: 'text', text: 'This is the first part of the response.' },
          { type: 'text', text: 'This is the second part.' },
        ],
        stop_reason: 'stop_sequence',
      });
      const blockRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };
      const response = await provider.chat(blockRequest);
      expect(response.content).toBe('This is the first part of the response. This is the second part.');
    });
  });
});
