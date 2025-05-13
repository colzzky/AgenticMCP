// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AnthropicProviderSpecificConfig } from '../../../src/core/types/config.types';
import { ProviderRequest, Tool } from '../../../src/core/types/provider.types';
import { AnthropicProvider } from '../../../src/providers/anthropic/anthropicProvider';

describe('AnthropicProvider Tool Calling Batch 1', () => {
  let provider;
  let mockAnthropicClient;
  let mockMessagesCreate;
  let baseConfig;
  let chatRequest;
  let mockInfo;
  let mockError;
  let mockWeatherTool;

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
    
    // Create a weather tool for testing
    mockWeatherTool = {
      type: 'function',
      name: 'get_weather',
      description: 'Get the current weather in a given location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'The unit of temperature, either "celsius" or "fahrenheit"'
          }
        },
        required: ['location'],
      }
    };
    
    // Setup base chat request with tools
    chatRequest = {
      messages: [
        { role: 'user', content: 'What is the weather in San Francisco?' }
      ],
      maxTokens: 500,
      temperature: 0.5,
      tools: [mockWeatherTool]
    };
    
    // Configure provider
    provider.configure(baseConfig);
  });

  describe('Tool Format Conversion', () => {
    it('should convert generic tools to Anthropic format', () => {
      // Use the private method through reflection
      const convertedTools = provider['convertToolsToAnthropicFormat']([mockWeatherTool]);
      
      // Verify the conversion
      expect(convertedTools).toEqual([
        {
          name: 'get_weather',
          description: 'Get the current weather in a given location',
          input_schema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA'
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The unit of temperature, either "celsius" or "fahrenheit"'
              }
            },
            required: ['location']
          }
        }
      ]);
    });

    it('should return undefined when no tools are provided', () => {
      const result = provider['convertToolsToAnthropicFormat']([]);
      expect(result).toBeUndefined();
      
      // Removed useless undefined check per lint rule
    });
  });
  
  describe('Extracting Tool Calls from Response', () => {
    it('should extract tool calls from Anthropic response content blocks', () => {
      const contentWithToolCall = [
        { type: 'text', text: 'I need to check the weather for you.' },
        {
          type: 'tool_use',
          id: 'tool_123',
          name: 'get_weather',
          input: { location: 'San Francisco, CA', unit: 'celsius' }
        }
      ];
      
      const extractedToolCalls = provider['extractToolCallsFromResponse'](contentWithToolCall);
      
      expect(extractedToolCalls).toEqual([
        {
          id: 'tool_123',
          call_id: 'tool_123',
          type: 'function_call',
          name: 'get_weather',
          arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
        }
      ]);
    });
    
    it('should extract multiple tool calls from response', () => {
      const contentWithMultipleToolCalls = [
        { type: 'text', text: 'Processing your requests...' },
        {
          type: 'tool_use',
          id: 'tool_123',
          name: 'get_weather',
          input: { location: 'San Francisco, CA', unit: 'celsius' }
        },
        {
          type: 'tool_use',
          id: 'tool_456',
          name: 'get_time',
          input: { timezone: 'America/Los_Angeles' }
        }
      ];
      
      const extractedToolCalls = provider['extractToolCallsFromResponse'](contentWithMultipleToolCalls);
      
      expect(extractedToolCalls?.length).toBe(2);
      expect(extractedToolCalls?.[0].name).toBe('get_weather');
      expect(extractedToolCalls?.[1].name).toBe('get_time');
    });
    
    it('should return undefined when no tool calls are in the response', () => {
      const contentWithOnlyText = [
        { type: 'text', text: 'Hello! How can I help you today?' }
      ];
      
      const extractedToolCalls = provider['extractToolCallsFromResponse'](contentWithOnlyText);
      expect(extractedToolCalls).toBeUndefined();
    });
    
    it('should handle empty content arrays', () => {
      expect(provider['extractToolCallsFromResponse']([])).toBeUndefined();
      expect(provider['extractToolCallsFromResponse'](undefined)).toBeUndefined();
    });
  });
  
  describe('Extracting Text from Content Blocks', () => {
    it('should extract text from content blocks', () => {
      const contentWithText = [
        { type: 'text', text: 'Hello!' },
        { type: 'text', text: ' How can I help you today?' }
      ];
      
      const extractedText = provider['extractTextFromContentBlocks'](contentWithText);
      expect(extractedText).toBe('Hello!  How can I help you today?');
    });
    
    it('should ignore non-text blocks when extracting text', () => {
      const mixedContent = [
        { type: 'text', text: 'Here is the weather: ' },
        {
          type: 'tool_use',
          id: 'tool_123',
          name: 'get_weather',
          input: { location: 'San Francisco, CA' }
        },
        { type: 'text', text: 'Let me know if you need anything else!' }
      ];
      
      const extractedText = provider['extractTextFromContentBlocks'](mixedContent);
      expect(extractedText).toBe('Here is the weather:  Let me know if you need anything else!');
    });
    
    it('should return empty string for empty or undefined content', () => {
      expect(provider['extractTextFromContentBlocks']([])).toBe('');
      expect(provider['extractTextFromContentBlocks'](undefined)).toBe('');
    });
  });
  
});