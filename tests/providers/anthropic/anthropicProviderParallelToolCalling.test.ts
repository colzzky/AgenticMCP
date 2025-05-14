/**
 * Unit tests for AnthropicProvider parallel tool calling functionality
 * Tests the parallel tool calling capabilities of the Anthropic provider implementation
 * focusing on how Anthropic can output multiple tool_use blocks at once
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnthropicProvider } from '../../../src/providers/anthropic/anthropicProvider.js';
import type { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { 
  ProviderRequest,
  ProviderResponse,
  Tool,
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

describe('AnthropicProvider - Parallel Tool Calling', () => {
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
    model: 'claude-3-7-sonnet-latest', // Using the most capable model for parallel tool calling
    temperature: 0.7
  };

  // Sample tools for testing - following Anthropic docs format exactly
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

  const searchNewsTool: Tool = {
    type: 'function',
    name: 'search_knowledge_base',
    description: 'Query a knowledge base to retrieve relevant info on a topic.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The user question or search query.'
        },
        options: {
          type: 'object',
          properties: {
            num_results: {
              type: 'number',
              description: 'Number of top results to return.'
            },
            domain_filter: {
              type: ['string', 'null'],
              description: 'Optional domain to narrow the search (e.g. \'finance\', \'medical\'). Pass null if not needed.'
            },
            sort_by: {
              type: ['string', 'null'],
              enum: ['relevance', 'date', 'popularity', 'alphabetical'],
              description: 'How to sort results. Pass null if not needed.'
            }
          },
          required: ['num_results', 'domain_filter', 'sort_by']
        }
      },
      required: ['query', 'options']
    }
  };

  const sampleTools = [getWeatherTool, getTimeTool, searchNewsTool];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue('mock-api-key');
    provider = new AnthropicProvider(mockConfigManager, mockLogger, MockAnthropicClass);
    await provider.configure(mockConfig);
  });

  describe('Parallel Tool Calls', () => {
    it('should extract multiple tool calls when returned in parallel', async () => {
      // Setup mock response with multiple parallel tool calls
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_parallel',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I\'ll gather both the weather and time information for New York.'
          },
          {
            type: 'tool_use',
            id: 'toolu_weather',
            name: 'get_weather',
            input: {
              location: 'New York, NY',
              unit: 'celsius'
            }
          },
          {
            type: 'tool_use',
            id: 'toolu_time',
            name: 'get_time',
            input: {
              timezone: 'America/New_York'
            }
          }
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 70
        }
      });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather and time in New York?' }],
        tools: sampleTools
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(2);
      
      // Verify first tool call
      expect(response.toolCalls![0].id).toBe('toolu_weather');
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![0].arguments).toBe('{"location":"New York, NY","unit":"celsius"}');
      
      // Verify second tool call
      expect(response.toolCalls![1].id).toBe('toolu_time');
      expect(response.toolCalls![1].name).toBe('get_time');
      expect(response.toolCalls![1].arguments).toBe('{"timezone":"America/New_York"}');
    });

    it('should handle providing multiple tool results back to the model', async () => {
      // First call returns multiple tool calls
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_parallel',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'text',
            text: 'I\'ll check both the weather and time in New York.'
          },
          {
            type: 'tool_use',
            id: 'toolu_weather',
            name: 'get_weather',
            input: {
              location: 'New York, NY'
            }
          },
          {
            type: 'tool_use',
            id: 'toolu_time',
            name: 'get_time',
            input: {
              timezone: 'America/New_York'
            }
          }
        ]
      });

      // Second call with tool results returns final response
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_final',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'stop_sequence',
        content: [
          {
            type: 'text',
            text: 'In New York, it\'s currently 68°F and sunny. The local time is 2:30 PM Eastern Time.'
          }
        ]
      });

      // Initial request
      const initialRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather and time in New York?' }],
        tools: sampleTools
      };

      // Get the tool use response
      const initialResponse = await provider.chat(initialRequest);
      expect(initialResponse.success).toBe(true);
      expect(initialResponse.toolCalls).toHaveLength(2);

      // Create tool outputs for both tool calls
      const toolResultsRequest: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather and time in New York?' },
          {
            role: 'assistant',
            content: 'I\'ll check both the weather and time in New York.',
            tool_calls: initialResponse.toolCalls
          }
        ],
        tool_outputs: [
          {
            call_id: 'toolu_weather',
            type: 'function_call_output',
            output: '68°F and sunny'
          },
          {
            call_id: 'toolu_time',
            type: 'function_call_output',
            output: '2:30 PM Eastern Time'
          }
        ]
      };

      // Submit tool results
      const finalResponse = await provider.generateTextWithToolResults(toolResultsRequest);

      // Verify the request format for the second call
      const secondRequestOptions = mockAnthropicClient.messages.create.mock.calls[1][0];
      
      // Should have user message, assistant message with tool calls, and two tool result messages
      expect(secondRequestOptions.messages).toHaveLength(4);
      
      // First message is user's initial question
      expect(secondRequestOptions.messages[0].role).toBe('user');
      expect(secondRequestOptions.messages[0].content).toBe('What\'s the weather and time in New York?');
      
      // Second message is assistant with tool calls
      expect(secondRequestOptions.messages[1].role).toBe('assistant');
      
      // Third message is user with first tool result
      expect(secondRequestOptions.messages[2].role).toBe('user');
      expect(secondRequestOptions.messages[2].content[0].type).toBe('tool_result');
      expect(secondRequestOptions.messages[2].content[0].tool_use_id).toBe('toolu_weather');
      expect(secondRequestOptions.messages[2].content[0].content).toBe('68°F and sunny');
      
      // Fourth message is user with second tool result
      expect(secondRequestOptions.messages[3].role).toBe('user');
      expect(secondRequestOptions.messages[3].content[0].type).toBe('tool_result');
      expect(secondRequestOptions.messages[3].content[0].tool_use_id).toBe('toolu_time');
      expect(secondRequestOptions.messages[3].content[0].content).toBe('2:30 PM Eastern Time');
      
      // Verify final response
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toContain('68°F and sunny');
      expect(finalResponse.content).toContain('2:30 PM Eastern Time');
    });
  });

  describe('Complex Parallel Tool Scenarios', () => {
    it('should handle three or more parallel tool calls', async () => {
      // Setup mock response with three parallel tool calls
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_three_parallel',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'text',
            text: 'I\'ll gather weather, time, and news information for New York.'
          },
          {
            type: 'tool_use',
            id: 'toolu_weather',
            name: 'get_weather',
            input: {
              location: 'New York, NY'
            }
          },
          {
            type: 'tool_use',
            id: 'toolu_time',
            name: 'get_time',
            input: {
              timezone: 'America/New_York'
            }
          },
          {
            type: 'tool_use',
            id: 'toolu_news',
            name: 'search_news',
            input: {
              query: 'New York events today',
              max_results: 3
            }
          }
        ]
      });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather, time, and latest news in New York?' }],
        tools: sampleTools
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(3);
      
      // Verify tool calls in order
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![1].name).toBe('get_time');
      expect(response.toolCalls![2].name).toBe('search_news');
      
      // Verify news tool call has correct arguments
      const newsArgs = JSON.parse(response.toolCalls![2].arguments);
      expect(newsArgs.query).toBe('New York events today');
      expect(newsArgs.max_results).toBe(3);
    });

    it('should handle partial tool results submission', async () => {
      // First call returns multiple tool calls
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_parallel',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'text',
            text: 'I\'ll check the weather and time in New York.'
          },
          {
            type: 'tool_use',
            id: 'toolu_weather',
            name: 'get_weather',
            input: {
              location: 'New York, NY'
            }
          },
          {
            type: 'tool_use',
            id: 'toolu_time',
            name: 'get_time',
            input: {
              timezone: 'America/New_York'
            }
          }
        ]
      });

      // Second call with partial tool results returns additional tool_use
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_partial',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'text',
            text: 'Now I need to search for news in New York.'
          },
          {
            type: 'tool_use',
            id: 'toolu_news',
            name: 'search_news',
            input: {
              query: 'New York news today',
              max_results: 1
            }
          }
        ]
      });

      // Final call with news results returns complete response
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_final',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'stop_sequence',
        content: [
          {
            type: 'text',
            text: 'In New York, it\'s currently 68°F and sunny. The local time is 2:30 PM Eastern Time. The latest news headline is "Mayor Announces New City Initiative".'
          }
        ]
      });

      // Initial request
      const initialRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather, time, and latest news in New York?' }],
        tools: sampleTools
      };

      // Get the tool use response with weather and time tools
      const initialResponse = await provider.chat(initialRequest);
      expect(initialResponse.toolCalls).toHaveLength(2);

      // Create tool outputs for both initial tool calls
      const toolResultsRequest: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather, time, and latest news in New York?' },
          {
            role: 'assistant',
            content: 'I\'ll check the weather and time in New York.',
            tool_calls: initialResponse.toolCalls
          }
        ],
        tool_outputs: [
          {
            call_id: 'toolu_weather',
            type: 'function_call_output',
            output: '68°F and sunny'
          },
          {
            call_id: 'toolu_time',
            type: 'function_call_output',
            output: '2:30 PM Eastern Time'
          }
        ]
      };

      // Submit weather and time results, get news tool call
      const newsToolResponse = await provider.generateTextWithToolResults(toolResultsRequest);
      expect(newsToolResponse.toolCalls).toHaveLength(1);
      expect(newsToolResponse.toolCalls![0].name).toBe('search_news');

      // Create updated messages with all previous messages plus the news tool request
      const fullMessages = [
        ...toolResultsRequest.messages,
        {
          role: 'user',
          content: '68°F and sunny',
          tool_call_id: 'toolu_weather'
        },
        {
          role: 'user',
          content: '2:30 PM Eastern Time',
          tool_call_id: 'toolu_time'
        },
        {
          role: 'assistant',
          content: 'Now I need to search for news in New York.',
          tool_calls: newsToolResponse.toolCalls
        }
      ];

      // Final request with news tool result
      const finalResultsRequest: ToolResultsRequest = {
        messages: fullMessages,
        tool_outputs: [
          {
            call_id: 'toolu_news',
            type: 'function_call_output',
            output: 'Mayor Announces New City Initiative'
          }
        ]
      };

      // Submit news result and get final response
      const finalResponse = await provider.generateTextWithToolResults(finalResultsRequest);

      // Verify the final response includes all tool results
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toContain('68°F and sunny');
      expect(finalResponse.content).toContain('2:30 PM Eastern Time');
      expect(finalResponse.content).toContain('Mayor Announces New City Initiative');
    });
  });

  describe('Tool Choice with Parallel Tools', () => {
    it('should respect the required tool_choice for parallel execution', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_required',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'text',
            text: 'I\'ll get the information you asked for.'
          },
          {
            type: 'tool_use',
            id: 'toolu_weather',
            name: 'get_weather',
            input: {
              location: 'New York, NY'
            }
          },
          {
            type: 'tool_use',
            id: 'toolu_time',
            name: 'get_time',
            input: {
              timezone: 'America/New_York'
            }
          }
        ]
      });

      // Request with required tool_choice
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Tell me about New York.' }],
        tools: sampleTools,
        toolChoice: 'required'
      };

      await provider.chat(request);

      // Verify that tool_choice was set to required in the request
      const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(requestOptions.tool_choice).toBe('required');
    });

    it('should handle specific tool choice while allowing parallel execution', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_specific',
        model: 'claude-3-7-sonnet-latest',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'text',
            text: 'Let me get the weather for you.'
          },
          {
            type: 'tool_use',
            id: 'toolu_weather',
            name: 'get_weather',
            input: {
              location: 'New York, NY'
            }
          }
        ]
      });

      // Request with specific tool_choice
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Tell me about New York.' }],
        tools: sampleTools,
        toolChoice: { type: 'function', function: { name: 'get_weather' } }
      };

      await provider.chat(request);

      // Verify that tool_choice was set to a specific tool
      const requestOptions = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(requestOptions.tool_choice).toEqual({ name: 'get_weather' });
    });
  });
});