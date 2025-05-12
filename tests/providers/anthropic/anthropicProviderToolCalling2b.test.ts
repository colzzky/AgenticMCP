import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AnthropicProviderSpecificConfig } from '../../../src/core/types/config.types';
import { ProviderRequest, Tool } from '../../../src/core/types/provider.types';
import { AnthropicProvider } from '../../../src/providers/anthropic/anthropicProvider';
import { Anthropic } from '@anthropic-ai/sdk';

describe('AnthropicProvider Tool Calling Batch 2 (Part B)', () => {
  let provider;
  let mockAnthropicClient;
  let mockMessagesCreate;
  let baseConfig;
  let chatRequest;
  let mockInfo;
  let mockError;
  let mockWeatherTool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMessagesCreate = jest.fn().mockImplementation((params) => {
      return Promise.resolve({
        id: 'msg_12345',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello! How can I help you today?' }
        ],
        model: (params as { model: string }).model || 'claude-3-5-sonnet-latest',
        usage: {
          input_tokens: 10,
          output_tokens: 15,
        }
      });
    });
    mockAnthropicClient = {
      messages: {
        create: mockMessagesCreate
      }
    };
    const MockAnthropicClass = jest.fn().mockImplementation(() => mockAnthropicClient);
    mockInfo = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockError = jest.spyOn(console, 'error').mockImplementation(() => {});
    provider = new AnthropicProvider(MockAnthropicClass as unknown as typeof Anthropic);
    baseConfig = {
      instanceName: 'test-anthropic',
      apiKey: 'test-anthropic-key',
      model: 'claude-3-5-sonnet-latest',
      maxTokens: 1000,
      temperature: 0.7,
    };
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
    chatRequest = {
      messages: [
        { role: 'user', content: 'What is the weather in San Francisco?' }
      ],
      maxTokens: 500,
      temperature: 0.5,
      tools: [mockWeatherTool]
    };
    provider.configure(baseConfig);
  });

  describe('Continuing with Tool Results', () => {
    it('should continue a conversation with tool call results', async () => {
      // Initial request with tools
      const initialRequest = {
        model: 'claude-3-5-sonnet-latest',
        messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
        tools: [mockWeatherTool]
      };
      // Mock initial response with tool calls
      const initialResponse = {
        success: true,
        content: 'I need to check the weather for you.',
        toolCalls: [
          {
            id: 'tool_123',
            call_id: 'tool_123',
            type: 'function_call',
            name: 'get_weather',
            arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
          }
        ]
      };
      // Mock tool call results
      const toolResults = [
        {
          type: 'function_call_output',
          call_id: 'tool_123',
          output: JSON.stringify({ temperature: 15, conditions: 'partly cloudy' })
        }
      ];
      // Reset mock for the continuation call
      mockMessagesCreate.mockClear();
      mockMessagesCreate.mockResolvedValueOnce({
        id: 'msg_continuation',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'The current weather in San Francisco is 15°C (59°F) and partly cloudy.' }
        ],
        model: 'claude-3-5-sonnet-latest',
        usage: {
          input_tokens: 20,
          output_tokens: 25,
        }
      });
      const continuationResponse = await provider.continueWithToolResults(
        initialRequest,
        initialResponse,
        toolResults
      );
      // Verify the chat method was called with the expected messages
      expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          // Original message
          expect.objectContaining({
            role: 'user',
            content: 'What is the weather in San Francisco?'
          }),
          // Assistant message with tool call
          expect.objectContaining({
            role: 'assistant'
          }),
          // Tool result message
          expect.objectContaining({
            role: 'user'
          })
        ])
      }));
      // Verify continuation response
      expect(continuationResponse.success).toBe(true);
      expect(continuationResponse.content).toBe('The current weather in San Francisco is 15°C (59°F) and partly cloudy.');
    });
    it('should throw error if initial request has no messages', async () => {
      const initialRequest = {};
      const initialResponse = {
        success: true,
        toolCalls: [{ id: 'tool_123', call_id: 'tool_123', type: 'function_call', name: 'get_weather', arguments: '{}' }]
      };
      const toolResults = [{ type: 'function_call_output', call_id: 'tool_123', output: '{}' }];
      await expect(provider.continueWithToolResults(initialRequest, initialResponse, toolResults))
        .rejects.toThrow('Initial request must contain messages');
    });
    it('should throw error if initial response has no tool calls', async () => {
      const initialRequest = { messages: [{ role: 'user', content: 'Hello' }] };
      const initialResponse = { success: true };
      const toolResults = [{ type: 'function_call_output', call_id: 'tool_123', output: '{}' }];
      await expect(provider.continueWithToolResults(initialRequest, initialResponse, toolResults))
        .rejects.toThrow('Initial response does not contain any tool calls');
    });
  });

  describe('Chat Method with Tools', () => {
    it('should include tools in the request when provided', async () => {
      const toolRequest = {
        messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
        tools: [mockWeatherTool]
      };
      await provider.chat(toolRequest);
      expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: 'get_weather',
            description: 'Get the current weather in a given location'
          })
        ])
      }));
    });
    it('should handle responses with tool calls', async () => {
      const toolRequest = {
        messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
        tools: [mockWeatherTool]
      };
      mockMessagesCreate.mockResolvedValueOnce({
        id: 'msg_12345',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'I need to check the weather for you.' },
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'get_weather',
            input: { location: 'San Francisco, CA', unit: 'celsius' }
          }
        ],
        model: 'claude-3-5-sonnet-latest',
        usage: {
          input_tokens: 15,
          output_tokens: 20,
        }
      });
      const response = await provider.chat(toolRequest);
      expect(response.success).toBe(true);
      expect(response.content).toBe('I need to check the weather for you.');
      expect(response.toolCalls).toEqual([
        {
          id: 'tool_123',
          call_id: 'tool_123',
          type: 'function_call',
          name: 'get_weather',
          arguments: JSON.stringify({ location: 'San Francisco, CA', unit: 'celsius' })
        }
      ]);
    });
    it('should handle tool_choice parameter when set to required', async () => {
      const toolRequest = {
        messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
        tools: [mockWeatherTool],
        toolChoice: 'required'
      };
      await provider.chat(toolRequest);
      expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
        tool_choice: expect.anything()
      }));
    });
    it('should handle tool_choice parameter when set to none', async () => {
      const toolRequest = {
        messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
        tools: [mockWeatherTool],
        toolChoice: 'none'
      };
      await provider.chat(toolRequest);
      expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
        tool_choice: expect.anything()
      }));
    });
    it('should handle tool_choice parameter when set to a specific tool', async () => {
      const toolRequest = {
        messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
        tools: [mockWeatherTool],
        toolChoice: { type: 'function', name: 'get_weather' }
      };
      await provider.chat(toolRequest);
      expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
        tool_choice: expect.objectContaining({
          name: 'get_weather'
        })
      }));
    });
  });
});
