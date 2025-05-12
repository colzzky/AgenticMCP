/**
 * @file Basic tests for OpenAI provider
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider';

describe('OpenAI Provider Basic Tests', () => {
  // Test variables
  let mockCreate;
  let mockOpenAIClient;
  let mockOpenAIConstructor;
  let mockConfigManager;
  let mockLogger;
  let provider;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock for the OpenAI create method
    const mockFxn: any = jest.fn()
    mockCreate = mockFxn.mockResolvedValue({
      id: 'chatcmpl-mock',
      choices: [
        {
          message: { role: 'assistant', content: 'Hello there!' },
          finish_reason: 'stop',
          index: 0
        }
      ]
    });
    
    // Create mock for the OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    };
    
    // Create mock for the OpenAI constructor
    mockOpenAIConstructor = jest.fn().mockReturnValue(mockOpenAIClient);
    
    // Create mock for the ConfigManager
    const mockConfigManagerFxn: any = jest.fn()
    mockConfigManager = {
      getResolvedApiKey: mockConfigManagerFxn.mockResolvedValue('resolved-api-key')
    };
    
    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    
    // Create the provider
    provider = new OpenAIProvider(mockConfigManager, mockOpenAIConstructor);
    
    // Set up a spy on console.error to verify error logging
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  describe('Basic functionality', () => {
    it('should have the correct name', () => {
      expect(provider.name).toBe('openai');
    });
    
    it('should configure with the API key', async () => {
      const config = {
        providerType: 'openai-chat',
        instanceName: 'test-instance',
        model: 'gpt-4'
      };
      
      await provider.configure(config);
      
      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(config);
      expect(mockOpenAIConstructor).toHaveBeenCalledWith({
        apiKey: 'resolved-api-key',
        maxRetries: 2
      });
    });
    
    it('should throw an error if API key is missing', async () => {
      mockConfigManager.getResolvedApiKey.mockResolvedValueOnce();
      
      const config = {
        providerType: 'openai-chat',
        instanceName: 'test-instance'
      };
      
      await expect(provider.configure(config)).rejects.toThrow(
        'OpenAI API key not found'
      );
    });
  });
  
  describe('Chat completions', () => {
    beforeEach(async () => {
      // Configure the provider
      await provider.configure({
        providerType: 'openai-chat',
        instanceName: 'test-instance',
        model: 'gpt-3.5-turbo'
      });
    });
    
    it('should make correct request to OpenAI', async () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100
      };
      
      await provider.chat(request);
      
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 100
      });
    });
    
    it('should handle successful response', async () => {
      mockCreate.mockResolvedValueOnce({
        id: 'chatcmpl-123',
        choices: [
          {
            message: { role: 'assistant', content: 'Hello, how can I help?' },
            finish_reason: 'stop',
            index: 0
          }
        ]
      });
      
      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Hello, how can I help?');
    });
    
    it('should handle errors', async () => {
      const error = new Error('API error');
      mockCreate.mockRejectedValueOnce(error);
      
      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('API error');
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('Tool calling', () => {
    beforeEach(async () => {
      await provider.configure({
        providerType: 'openai-chat',
        instanceName: 'test-instance'
      });
    });
    
    it('should extract tool calls from response', async () => {
      mockCreate.mockResolvedValueOnce({
        id: 'chatcmpl-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: undefined,
              tool_calls: [
                {
                  id: 'call-123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location":"New York"}'
                  }
                }
              ]
            },
            finish_reason: 'tool_calls',
            index: 0
          }
        ]
      });
      
      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Get weather' }],
        tools: [{ type: 'function', name: 'get_weather' }]
      });
      
      expect(response.success).toBe(true);
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0].type).toBe('function_call');
      expect(response.toolCalls?.[0].name).toBe('get_weather');
    });
    
    it('should correctly execute tool calls', async () => {
      const mockFxn: any = jest.fn()
      const getWeather = mockFxn.mockResolvedValue({
        temperature: 72,
        conditions: 'sunny'
      });
      
      const toolCall = {
        id: 'call-123',
        type: 'function_call',
        name: 'get_weather',
        arguments: '{"location":"New York"}'
      };
      
      const result = await provider.executeToolCall(
        toolCall,
        { get_weather: getWeather }
      );
      
      expect(getWeather).toHaveBeenCalledWith({ location: 'New York' });
      expect(JSON.parse(result)).toEqual({
        temperature: 72,
        conditions: 'sunny'
      });
    });
  });
});