// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AnthropicProviderSpecificConfig } from '../../../src/core/types/config.types';
import { ProviderRequest, Tool } from '../../../src/core/types/provider.types';
import { AnthropicProvider } from '../../../src/providers/anthropic/anthropicProvider';

describe('AnthropicProvider Tool Calling Batch 2 (Part A)', () => {
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

  describe('Executing Tool Calls', () => {
    it('should execute a tool call with provided functions', async () => {
      const mockGetWeather = jest.fn().mockImplementation(() => Promise.resolve({ temperature: 72, conditions: 'sunny' }));
      const toolCall = {
        id: 'tool_123',
        call_id: 'tool_123',
        type: 'function_call',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
      };
      const availableTools = { get_weather: mockGetWeather };
      const result = await provider.executeToolCall(toolCall, availableTools);
      expect(mockGetWeather).toHaveBeenCalledWith({ location: 'San Francisco, CA', unit: 'celsius' });
      expect(JSON.parse(result)).toEqual({ temperature: 72, conditions: 'sunny' });
    });
    it('should throw an error if no tools are available', async () => {
      const toolCall = {
        id: 'tool_123',
        call_id: 'tool_123',
        type: 'function_call',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
      };
      await expect(provider.executeToolCall(toolCall)).rejects.toThrow('No tools available to execute');
    });
    it('should throw an error if the requested tool is not found', async () => {
      const toolCall = {
        id: 'tool_123',
        call_id: 'tool_123',
        type: 'function_call',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
      };
      const availableTools = { some_other_tool: () => {} };
      await expect(provider.executeToolCall(toolCall, availableTools)).rejects.toThrow('Tool not found: get_weather');
    });
    it('should handle errors from tool execution', async () => {
      const mockFailingTool = jest.fn().mockImplementation(() => Promise.reject(new Error('Failed to fetch weather data')));
      const toolCall = {
        id: 'tool_123',
        call_id: 'tool_123',
        type: 'function_call',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
      };
      const availableTools = { get_weather: mockFailingTool };
      const result = await provider.executeToolCall(toolCall, availableTools);
      expect(JSON.parse(result)).toEqual({ error: 'Failed to fetch weather data' });
    });
    it('should handle invalid JSON arguments', async () => {
      const mockTool = jest.fn();
      const toolCall = {
        id: 'tool_123',
        call_id: 'tool_123',
        type: 'function_call',
        name: 'get_weather',
        arguments: '{invalid-json'
      };
      const availableTools = { get_weather: mockTool };
      const result = await provider.executeToolCall(toolCall, availableTools);
      expect(JSON.parse(result)).toHaveProperty('error');
      expect(mockTool).not.toHaveBeenCalled();
    });
  });
});
