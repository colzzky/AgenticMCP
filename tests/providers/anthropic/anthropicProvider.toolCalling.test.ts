/**
 * Unit tests for AnthropicProvider tool calling functionality
 * Tests the tool calling capabilities of the Anthropic provider implementation
 * based on the format in the Anthropic API documentation
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnthropicProvider } from '../../../src/providers/anthropic/anthropicProvider.js';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import type { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type {
  ProviderRequest,
  ProviderResponse,
  Tool,
  ToolCall,
  ToolCallOutput,
  ToolResultsRequest
} from '../../../src/core/types/provider.types.js';
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

describe('AnthropicProvider - Tool Calling', () => {
  let mockLogger: MockProxy<Logger>;
  let mockConfigManager: MockProxy<ConfigManager>;
  let provider: AnthropicProvider;
  let mockAnthropicClient: any;
  let MockAnthropicClass: any;

  const mockConfig: AnthropicProviderSpecificConfig = {
    providerType: 'anthropic',
    model: 'claude-3-7-sonnet-latest',
    temperature: 0.7
  };

  beforeEach(() => {
    mockLogger = mock<Logger>();
    mockConfigManager = mock<ConfigManager>();
    mockAnthropicClient = {
      messages: {
        create: jest.fn()
      }
    };
    MockAnthropicClass = jest.fn().mockImplementation(() => mockAnthropicClient);
    mockReset(mockLogger);
    mockReset(mockConfigManager);
    // You may need to mock AnthropicProvider's internal Anthropic class usage here if relevant
    provider = new AnthropicProvider(mockConfig, mockConfigManager, mockLogger);
    // If AnthropicProvider expects Anthropic SDK, you may want to inject or override as needed
  });

  // Sample tools for testing - follow Anthropic's expected format from their docshropic's expected format from their docs
  const getWeatherTool: Tool = {
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
      required: ['location']
    }
  };

  const getTimeTool: Tool = {
    type: 'function',
    name: 'get_time',
    description: 'Get the current time in a given time zone',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'The IANA time zone name, e.g. America/Los_Angeles'
        }
      },
      required: ['timezone']
    }
  };

  const sampleTools = [getWeatherTool, getTimeTool];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue('mock-api-key');
    provider = new AnthropicProvider(mockConfigManager, mockLogger, MockAnthropicClass);
    await provider.configure(mockConfig);
  });

  describe('Tool Definition', () => {
    it('should properly format function tools according to Anthropic spec', async () => {
      // Setup mock response
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_01Aq9w938a90dw8q',
        model: 'claude-3-7-sonnet-latest',
        content: [
          {
            type: 'text',
            text: 'Response without tool use'
          }
        ],
        stop_reason: 'stop_sequence',
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: [getWeatherTool] // Just the weather tool
      };

      await provider.chat(request);

      // Verify tools were formatted correctly according to Anthropic SDK documentation
      const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(requestOptions.tools).toBeDefined();
      expect(requestOptions.tools).toHaveLength(1);

      const tool = requestOptions.tools[0];
      expect(tool.name).toBe('get_weather');
      expect(tool.description).toBe('Get the current weather in a given location');

      // Check input_schema matches the format in Anthropic's documentation
      expect(tool.input_schema).toEqual({
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
      });
    });

    it('should handle tool_choice parameter', async () => {
      const toolChoiceTests = [
        {
          choice: 'auto',
          expected: undefined // Anthropic uses undefined for 'auto'
        },
        {
          choice: 'none',
          expected: 'none'
        },
        {
          choice: 'required',
          expected: 'required'
        },
        {
          choice: { type: 'function', function: { name: 'get_weather' } },
          expected: { name: 'get_weather' } // Anthropic's format for specific tool choice
        }
      ];

      for (const test of toolChoiceTests) {
        mockAnthropicClient.messages.create.mockReset();
        mockAnthropicClient.messages.create.mockResolvedValue({
          id: 'msg_01Aq9w938a90dw8q',
          model: 'claude-3-7-sonnet-latest',
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'stop_sequence'
        });

        const request: ProviderRequest = {
          messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
          tools: sampleTools,
          toolChoice: test.choice
        };

        await provider.chat(request);

        const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];

        if (test.expected === undefined) {
          expect(requestOptions.tool_choice).toBeUndefined();
        } else {
          expect(requestOptions.tool_choice).toEqual(test.expected);
        }
      }
    });
  });

  describe('Handling Tool Use Responses', () => {
    it('should properly extract tool calls from Anthropic response', async () => {
      // Setup mock response with tool use - exactly matching Anthropic's documentation format
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_01Aq9w938a90dw8q',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '<thinking>I need to call the get_weather function, and the user wants SF, which is likely San Francisco, CA.</thinking>'
          },
          {
            type: 'tool_use',
            id: 'toolu_01A09q90qw90lq917835lq9',
            name: 'get_weather',
            input: {
              location: 'San Francisco, CA',
              unit: 'celsius'
            }
          }
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: [getWeatherTool]
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.content).toContain('I need to call the get_weather function');
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(1);

      const toolCall = response.toolCalls![0];
      expect(toolCall.id).toBe('toolu_01A09q90qw90lq917835lq9');
      expect(toolCall.call_id).toBe('toolu_01A09q90qw90lq917835lq9');
      expect(toolCall.name).toBe('get_weather');
      expect(toolCall.type).toBe('function_call');
      // Arguments should be formatted as a JSON string
      expect(toolCall.arguments).toBe('{"location":"San Francisco, CA","unit":"celsius"}');
    });

    it('should extract multiple tool calls from response', async () => {
      // Setup mock response with multiple tool calls
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_01Aq9w938a90dw8q',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I need to check both the weather and time.'
          },
          {
            type: 'tool_use',
            id: 'toolu_01A09q90qw90lq917835lq9',
            name: 'get_weather',
            input: {
              location: 'San Francisco, CA',
              unit: 'celsius'
            }
          },
          {
            type: 'tool_use',
            id: 'toolu_02B09q90qw90lq917835lq9',
            name: 'get_time',
            input: {
              timezone: 'America/Los_Angeles'
            }
          }
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 70
        }
      });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco and what time is it there?' }],
        tools: sampleTools
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(2);
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![1].name).toBe('get_time');
    });
  });

  describe('Submitting Tool Results', () => {
    it('should properly format tool results according to Anthropic spec', async () => {
      // First call returns a tool_use response as per Anthropic docs
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_01Aq9w938a90dw8q',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '<thinking>I need to use get_weather, and the user wants SF, which is likely San Francisco, CA.</thinking>'
          },
          {
            type: 'tool_use',
            id: 'toolu_01A09q90qw90lq917835lq9',
            name: 'get_weather',
            input: {
              location: 'San Francisco, CA',
              unit: 'celsius'
            }
          }
        ]
      });

      // Second call (with tool results) returns a final response
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_02Bq9w938a90dw8q',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'stop_sequence',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'The current weather in San Francisco is 15 degrees Celsius (59 degrees Fahrenheit). It\'s a cool day in the city by the bay!'
          }
        ]
      });

      // Initial request
      const initialRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: [getWeatherTool]
      };

      // Get the tool use response
      const initialResponse = await provider.chat(initialRequest);
      expect(initialResponse.success).toBe(true);
      expect(initialResponse.toolCalls).toHaveLength(1);

      // Create tool output matching Anthropic's docs
      const toolOutput: ToolCallOutput[] = [
        {
          call_id: 'toolu_01A09q90qw90lq917835lq9',
          type: 'function_call_output',
          output: '15 degrees'
        }
      ];

      // Submit tool result using generateTextWithToolResults
      const toolResultsRequest: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather like in San Francisco?' },
          {
            role: 'assistant',
            content: '<thinking>I need to use get_weather, and the user wants SF, which is likely San Francisco, CA.</thinking>',
            tool_calls: initialResponse.toolCalls
          }
        ],
        tool_outputs: toolOutput
      };

      const finalResponse = await provider.generateTextWithToolResults(toolResultsRequest);

      // Verify the tool result was properly formatted as per Anthropic docs
      const secondRequest = mockAnthropicClient.messages.create.mock.calls[1][0];

      // Should have 3 messages: user question, assistant tool use, user tool result
      expect(secondRequest.messages).toHaveLength(3);

      // Verify the tool result message format exactly matches Anthropic docs
      const toolResultMessage = secondRequest.messages[2];
      expect(toolResultMessage.role).toBe('user');
      expect(toolResultMessage.content).toHaveLength(1);

      const toolResultContent = toolResultMessage.content[0];
      expect(toolResultContent.type).toBe('tool_result');
      expect(toolResultContent.tool_use_id).toBe('toolu_01A09q90qw90lq917835lq9');
      expect(toolResultContent.content).toBe('15 degrees');

      // Verify the final response is correct
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toContain('15 degrees Celsius');
    });
  });

  describe('Sequential Tool Calls', () => {
    it('should support sequential tool call conversation flow as shown in Anthropic docs', async () => {
      // First call returns a tool_use response for location
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_01',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '<thinking>To answer this, I first need to determine the user\'s location using the get_location tool. Then I can pass that location to the get_weather tool to find the current weather there.</thinking>'
          },
          {
            type: 'tool_use',
            id: 'toolu_loc',
            name: 'get_location',
            input: {}
          }
        ]
      });

      // Second call (with location result) asks for weather
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_02',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Now I need to check the weather for your location.'
          },
          {
            type: 'tool_use',
            id: 'toolu_weather',
            name: 'get_weather',
            input: {
              location: 'San Francisco, CA',
              unit: 'fahrenheit'
            }
          }
        ]
      });

      // Third call (with weather result) returns final answer
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_03',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'stop_sequence',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Based on your current location in San Francisco, CA, the weather right now is 59°F (15°C) and mostly cloudy. It\'s a fairly cool and overcast day in the city. You may want to bring a light jacket if you\'re heading outside.'
          }
        ]
      });

      // Create full tool set - matching docs example
      const locationTool: Tool = {
        type: 'function',
        name: 'get_location',
        description: 'Get the current user location based on their IP address. This tool has no parameters or arguments.',
        parameters: {
          type: 'object',
          properties: {}
        }
      };

      const allTools = [locationTool, getWeatherTool];

      // Initial request
      const initialRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like where I am?' }],
        tools: allTools
      };

      // First response - location tool
      const locationResponse = await provider.chat(initialRequest);
      expect(locationResponse.toolCalls).toHaveLength(1);
      expect(locationResponse.toolCalls![0].name).toBe('get_location');

      // Submit location tool result
      const locationResult: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather like where I am?' },
          {
            role: 'assistant',
            content: '<thinking>To answer this, I first need to determine the user\'s location using the get_location tool. Then I can pass that location to the get_weather tool to find the current weather there.</thinking>',
            tool_calls: locationResponse.toolCalls
          }
        ],
        tool_outputs: [{
          call_id: 'toolu_loc',
          type: 'function_call_output',
          output: 'San Francisco, CA'
        }]
      };

      // Get weather tool call response
      const weatherResponse = await provider.generateTextWithToolResults(locationResult);
      expect(weatherResponse.toolCalls).toHaveLength(1);
      expect(weatherResponse.toolCalls![0].name).toBe('get_weather');

      // Submit weather tool result - following docs example
      const weatherResult: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather like where I am?' },
          {
            role: 'assistant',
            content: '<thinking>To answer this, I first need to determine the user\'s location using the get_location tool. Then I can pass that location to the get_weather tool to find the current weather there.</thinking>',
            tool_calls: locationResponse.toolCalls
          },
          {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: 'toolu_loc',
              content: 'San Francisco, CA'
            }]
          },
          {
            role: 'assistant',
            content: 'Now I need to check the weather for your location.',
            tool_calls: weatherResponse.toolCalls
          }
        ],
        tool_outputs: [{
          call_id: 'toolu_weather',
          type: 'function_call_output',
          output: '59°F (15°C), mostly cloudy'
        }]
      };

      // Get final response
      const finalResponse = await provider.generateTextWithToolResults(weatherResult);

      // Verify final response matches the expected structure from docs
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toContain('San Francisco');
      expect(finalResponse.content).toContain('59°F (15°C)');
      expect(finalResponse.content).toContain('mostly cloudy');
      expect(finalResponse.content).toContain('light jacket');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('Invalid API key')
      );

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: [getWeatherTool]
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error!.message).toBe('Invalid API key');
    });

    it('should handle tool execution errors', async () => {
      // Mock the tool function that will throw an error
      const mockToolFunction = jest.fn().mockRejectedValue(new Error('Weather API is down'));

      // Test the executeToolCall method
      const toolCall: ToolCall = {
        id: 'toolu_01A09q90qw90lq917835lq9',
        call_id: 'toolu_01A09q90qw90lq917835lq9',
        type: 'function_call',
        name: 'get_weather',
        arguments: '{"location":"San Francisco, CA"}'
      };

      const result = await provider.executeToolCall(toolCall, {
        get_weather: mockToolFunction
      });

      expect(result).toContain('error');
      expect(result).toContain('Weather API is down');
      expect(mockToolFunction).toHaveBeenCalledWith({ location: 'San Francisco, CA' });
    });
  });

  describe('Legacy continueWithToolResults method', () => {
    it('should call generateTextWithToolResults with properly formatted request', async () => {
      // Mock the generateTextWithToolResults method
      const generateTextWithToolResultsSpy = jest.spyOn(provider, 'generateTextWithToolResults')
        .mockResolvedValue({
          success: true,
          content: 'Response after tool execution'
        });

      const initialRequest: ProviderRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather like in San Francisco?' }
        ]
      };

      const initialResponse: ProviderResponse = {
        success: true,
        content: 'Let me check the weather.',
        toolCalls: [
          {
            id: 'toolu_01A09q90qw90lq917835lq9',
            call_id: 'toolu_01A09q90qw90lq917835lq9',
            type: 'function_call',
            name: 'get_weather',
            arguments: '{"location":"San Francisco, CA"}'
          }
        ]
      };

      const toolResults: ToolCallOutput[] = [
        {
          call_id: 'toolu_01A09q90qw90lq917835lq9',
          type: 'function_call_output',
          output: '15 degrees Celsius'
        }
      ];

      await provider.continueWithToolResults(initialRequest, initialResponse, toolResults);

      // Verify generateTextWithToolResults was called correctly
      expect(generateTextWithToolResultsSpy).toHaveBeenCalledTimes(1);
      const toolResultsRequest = generateTextWithToolResultsSpy.mock.calls[0][0];

      // The new messages should include the assistant's response with tool calls
      expect(toolResultsRequest.messages).toHaveLength(2);
      expect(toolResultsRequest.messages[0]).toBe(initialRequest.messages[0]);
      expect(toolResultsRequest.messages[1].role).toBe('assistant');
      expect(toolResultsRequest.messages[1].tool_calls).toBe(initialResponse.toolCalls);

      // The tool_outputs should be passed through
      expect(toolResultsRequest.tool_outputs).toBe(toolResults);
    });
  });
});