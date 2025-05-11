// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AnthropicProviderSpecificConfig } from '../../../src/core/types/config.types';
import { ProviderRequest } from '../../../src/core/types/provider.types';
import { AnthropicProvider } from '../../../src/providers/anthropic/anthropicProvider';

// This test takes a different approach from the other tests in the project
// Instead of mocking the imports, we directly mock the Anthropic client
// This is because Jest's ESM mocking is not working reliably for this module

describe('AnthropicProvider', () => {
  let provider;
  let mockAnthropicClient;
  let mockMessagesCreate;
  let baseConfig;
  let chatRequest;
  let mockInfo;
  let mockError;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock for Anthropic's messages.create method
    mockMessagesCreate = jest.fn().mockImplementation((params) => {
      return Promise.resolve({
        id: 'msg_12345',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello! How can I help you today?' }
        ],
        model: params.model || 'claude-3-5-sonnet-latest',
        usage: {
          input_tokens: 10,
          output_tokens: 15,
        }
      });
    });
    
    // Create mock for Anthropic client
    mockAnthropicClient = {
      messages: {
        create: mockMessagesCreate
      }
    };
    
    // Mock the AnthropicClass
    const MockAnthropicClass = jest.fn().mockImplementation(() => mockAnthropicClient);
    
    // Setup mocks for logger functions
    mockInfo = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Initialize provider with mock class
    provider = new AnthropicProvider(MockAnthropicClass);
    
    // Setup base config
    baseConfig = {
      instanceName: 'test-anthropic',
      apiKey: 'test-anthropic-key',
      model: 'claude-3-5-sonnet-latest',
      maxTokens: 1000,
      temperature: 0.7,
    };
    
    // Setup base chat request
    chatRequest = {
      messages: [
        { role: 'user', content: 'Hello, Claude!' }
      ],
      maxTokens: 500,
      temperature: 0.5,
    };
  });

  describe('constructor and name', () => {
    it('should have the correct name', () => {
      expect(provider.name).toBe('anthropic');
    });

    it('should initialize correctly', () => {
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });
  });

  describe('configure', () => {
    it('should throw error if API key is missing during configuration', async () => {
      const configWithoutKey = { ...baseConfig };
      delete configWithoutKey.apiKey;
      
      await expect(provider.configure(configWithoutKey)).rejects.toThrow(
        'Anthropic API key is required.'
      );
    });

    it('should use environment variable if API key not provided in config', async () => {
      // Store original env variable
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      
      try {
        // Set env variable for testing
        process.env.ANTHROPIC_API_KEY = 'env-api-key';
        
        // Create config without API key
        const configWithoutKey = { ...baseConfig };
        delete configWithoutKey.apiKey;
        
        // Configure provider
        await provider.configure(configWithoutKey);
      } finally {
        // Restore original env variable
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      }
    });
  });

  describe('chat', () => {
    beforeEach(async () => {
      // Configure provider before each test
      await provider.configure(baseConfig);
    });

    it('should throw an error if not configured before chat', async () => {
      const unconfiguredProvider = new AnthropicProvider();
      await expect(unconfiguredProvider.chat(chatRequest)).rejects.toThrow(
        'AnthropicProvider not configured. Call configure() first.'
      );
    });

    it('should return a successful chat completion', async () => {
      const mockResponse = {
        id: 'msg_12345',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello! How can I help you today?' }
        ],
        model: 'claude-3-5-sonnet-latest',
        usage: {
          input_tokens: 10,
          output_tokens: 15,
        }
      };
      
      mockMessagesCreate.mockResolvedValueOnce(mockResponse);
      
      const response = await provider.chat(chatRequest);
      
      // Verify correct parameters were passed to the SDK
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 500,
        messages: [{ role: 'user', content: 'Hello, Claude!' }],
        temperature: 0.5,
      });
      
      // Verify the response is properly formatted
      expect(response.success).toBe(true);
      expect(response.content).toBe('Hello! How can I help you today?');
      expect(response.choices).toEqual([{ text: 'Hello! How can I help you today?' }]);
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 15,
        totalTokens: 25,
      });
      expect(response.rawResponse).toEqual(mockResponse);
    });
    
    it('should use provider config values when request values are not provided', async () => {
      const requestWithoutParams = {
        messages: [{ role: 'user', content: 'Hello, Claude!' }]
      };
      
      await provider.chat(requestWithoutParams);
      
      expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: baseConfig.model,
        max_tokens: baseConfig.maxTokens,
        temperature: baseConfig.temperature,
      }));
    });
    
    it('should handle multiple text blocks in the content array', async () => {
      const mockResponseWithMultipleBlocks = {
        id: 'msg_12345',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello! ' },
          { type: 'text', text: 'How can I help you today?' }
        ],
        model: 'claude-3-5-sonnet-latest',
        usage: {
          input_tokens: 10,
          output_tokens: 15,
        }
      };
      
      mockMessagesCreate.mockResolvedValueOnce(mockResponseWithMultipleBlocks);
      
      const response = await provider.chat(chatRequest);
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Hello!  How can I help you today?');
      expect(response.choices).toEqual([
        { text: 'Hello! ' },
        { text: 'How can I help you today?' }
      ]);
    });
    
    it('should filter out messages with roles other than user and assistant', async () => {
      const requestWithSystemMessage = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, Claude!' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'unknown', content: 'This should be filtered out.' }
        ]
      };
      
      await provider.chat(requestWithSystemMessage);
      
      // Verify only user and assistant messages were included
      expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
        messages: [
          { role: 'user', content: 'Hello, Claude!' },
          { role: 'assistant', content: 'Hi there!' }
        ]
      }));
    });
    
    it('should handle API errors and return a failed response', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockMessagesCreate.mockRejectedValueOnce(apiError);
      
      const response = await provider.chat(chatRequest);
      
      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('API rate limit exceeded');
      expect(response.rawResponse).toBe(apiError);
    });
  });
  
  describe('generateCompletion', () => {
    beforeEach(async () => {
      await provider.configure(baseConfig);
    });
    
    it('should convert prompt to messages format and call chat method', async () => {
      const completionRequest = {
        prompt: 'Complete this sentence: The sky is',
        maxTokens: 20,
        temperature: 0.2,
      };
      
      // Spy on the chat method
      const chatSpy = jest.spyOn(provider, 'chat');
      
      await provider.generateCompletion(completionRequest);
      
      // Verify chat was called with converted messages
      expect(chatSpy).toHaveBeenCalledWith({
        ...completionRequest,
        messages: [{ role: 'user', content: 'Complete this sentence: The sky is' }]
      });
    });
    
    it('should use existing messages if provided instead of prompt', async () => {
      const completionRequest = {
        messages: [{ role: 'user', content: 'Hello from messages!' }],
        prompt: 'This should be ignored',
      };
      
      const chatSpy = jest.spyOn(provider, 'chat');
      
      await provider.generateCompletion(completionRequest);
      
      // Verify chat was called with the original messages, not the prompt
      expect(chatSpy).toHaveBeenCalledWith(completionRequest);
    });
    
    it('should handle empty messages and prompts gracefully', async () => {
      const emptyRequest = {};
      
      const chatSpy = jest.spyOn(provider, 'chat');
      
      await provider.generateCompletion(emptyRequest);
      
      // Verify chat was still called with the empty request
      expect(chatSpy).toHaveBeenCalledWith(emptyRequest);
    });
  });
});