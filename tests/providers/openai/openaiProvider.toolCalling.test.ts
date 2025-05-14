/**
 * Unit tests for OpenAIProvider tool calling functionality
 * Tests the tool calling capabilities of the OpenAI provider implementation
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider.js';
import { mock, MockProxy } from 'jest-mock-extended';
import { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { 
  ProviderRequest, 
  ProviderResponse, 
  Tool,
  ToolCall,
  ToolCallOutput,
  ToolResultsRequest
} from '../../../src/core/types/provider.types.js';
import type { OpenAIProviderSpecificConfig } from '../../../src/core/types/config.types.js';

// Mock OpenAI SDK
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('OpenAIProvider - Tool Calling', () => {
  let mockLogger: MockProxy<Logger>;
  let mockConfigManager: MockProxy<ConfigManager>;
  let provider: OpenAIProvider;

  // Mock OpenAI client
  const mockOpenAIClient = {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  };
  
  const MockOpenAIClass = jest.fn().mockImplementation(() => mockOpenAIClient);

  const mockConfig: OpenAIProviderSpecificConfig = {
    providerType: 'openai',
    model: 'gpt-4',
    temperature: 0.7
  };


  beforeEach(() => {
    mockLogger = mock<Logger>();
    mockConfigManager = mock<ConfigManager>();
    mockConfigManager.getResolvedApiKey.mockResolvedValue('mock-api-key');
    provider = new OpenAIProvider(mockConfig, mockConfigManager, mockLogger);
  });

  // Sample tools for testing
  const sampleTools: Tool[] = [
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
    },
    {
      type: 'function',
      name: 'search_database',
      description: 'Search for information in the database',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      }
    }
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue('mock-api-key');
    provider = new OpenAIProvider(mockConfigManager, mockLogger, MockOpenAIClass);
    await provider.configure(mockConfig);
  });

  describe('Chat with Tools', () => {
    it('should include tools in the request when provided', async () => {
      // Setup mock response
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        id: 'mock-completion-id',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I need to check the weather.'
            },
            finish_reason: 'stop'
          }
        ]
      });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: sampleTools
      };

      await provider.chat(request);

      // Verify tools were included in the request
      const requestOptions = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      expect(requestOptions.tools).toBeDefined();
      expect(requestOptions.tools).toHaveLength(2);
      expect(requestOptions.tools[0].type).toBe('function');
      expect(requestOptions.tools[0].function.name).toBe('get_weather');
    });

    it('should handle tool_choice parameter as string', async () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: sampleTools,
        tool_choice: 'auto'
      };

      await provider.chat(request);

      const requestOptions = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      expect(requestOptions.tool_choice).toBe('auto');
    });

    it('should handle tool_choice parameter as object', async () => {
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: sampleTools,
        tool_choice: { type: 'function', function: { name: 'get_weather' } }
      };

      await provider.chat(request);

      const requestOptions = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      expect(requestOptions.tool_choice).toEqual({
        type: 'function',
        function: { name: 'get_weather' }
      });
    });

    it('should properly parse tool calls in the response', async () => {
      // Setup mock response with tool calls
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        id: 'mock-completion-id',
        model: 'gpt-4',
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

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: sampleTools
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![0].arguments).toBe('{"location":"San Francisco, CA"}');
      expect(response.finishReason).toBe('tool_calls');
    });
  });

  describe('generateTextWithToolResults', () => {
    it('should properly format tool results in the request', async () => {
      // Set up previous message history with tool calls
      const messages = [
        { role: 'user', content: 'What\'s the weather like in San Francisco?' },
        { 
          role: 'assistant', 
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function_call',
              name: 'get_weather',
              arguments: '{"location":"San Francisco, CA"}'
            }
          ]
        }
      ];

      // Set up tool outputs
      const toolOutputs: ToolCallOutput[] = [
        {
          call_id: 'call_123',
          type: 'function_call_output',
          output: 'The weather in San Francisco is sunny and 72°F'
        }
      ];

      // Set up mock response
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        id: 'mock-completion-id',
        model: 'gpt-4',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'The weather in San Francisco is currently sunny with a temperature of 72°F.'
            },
            finish_reason: 'stop'
          }
        ]
      });

      const request: ToolResultsRequest = {
        messages,
        tool_outputs: toolOutputs
      };

      const response = await provider.generateTextWithToolResults(request);

      // Verify the request format
      const completionRequest = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      
      // Should include the original messages
      expect(completionRequest.messages[0].role).toBe('user');
      expect(completionRequest.messages[0].content).toBe('What\'s the weather like in San Francisco?');
      
      // Should include the assistant message with tool calls
      expect(completionRequest.messages[1].role).toBe('assistant');
      expect(completionRequest.messages[1].tool_calls).toBeDefined();
      
      // Should include the tool response message
      expect(completionRequest.messages[2].role).toBe('tool');
      expect(completionRequest.messages[2].tool_call_id).toBe('call_123');
      expect(completionRequest.messages[2].content).toBe('The weather in San Francisco is sunny and 72°F');
      
      // Verify the response
      expect(response.success).toBe(true);
      expect(response.content).toBe('The weather in San Francisco is currently sunny with a temperature of 72°F.');
    });

    it('should throw error if no messages provided', async () => {
      const request: ToolResultsRequest = {
        messages: [],
        tool_outputs: [
          {
            call_id: 'call_123',
            type: 'function_call_output',
            output: 'Tool result'
          }
        ]
      };

      const response = await provider.generateTextWithToolResults(request);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('must contain messages');
    });

    it('should throw error if no tool outputs provided', async () => {
      const request: ToolResultsRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        tool_outputs: []
      };

      const response = await provider.generateTextWithToolResults(request);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('must contain tool_outputs');
    });

    it('should throw error if no assistant message with tool calls found', async () => {
      const request: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' } // No tool calls
        ],
        tool_outputs: [
          {
            call_id: 'call_123',
            type: 'function_call_output',
            output: 'Tool result'
          }
        ]
      };

      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('No assistant message with tool calls found in the conversation history.')
      );

      const response = await provider.generateTextWithToolResults(request);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
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
        content: null,
        toolCalls: [
          {
            id: 'call_123',
            type: 'function_call',
            name: 'get_weather',
            arguments: '{"location":"San Francisco, CA"}'
          }
        ]
      };

      const toolResults: ToolCallOutput[] = [
        {
          call_id: 'call_123',
          type: 'function_call_output',
          output: 'The weather in San Francisco is sunny and 72°F'
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

    it('should throw error if initial request has no messages', async () => {
      const initialRequest: ProviderRequest = {};
      const initialResponse: ProviderResponse = {
        success: true,
        toolCalls: [{ id: 'call_123', type: 'function_call', name: 'test', arguments: '{}' }]
      };
      const toolResults: ToolCallOutput[] = [
        { call_id: 'call_123', type: 'function_call_output', output: 'result' }
      ];

      await expect(provider.continueWithToolResults(initialRequest, initialResponse, toolResults))
        .rejects.toThrow('Initial request must contain messages');
    });

    it('should throw error if initial response has no tool calls', async () => {
      const initialRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };
      const initialResponse: ProviderResponse = {
        success: true,
        content: 'Hi there'
        // No tool calls
      };
      const toolResults: ToolCallOutput[] = [
        { call_id: 'call_123', type: 'function_call_output', output: 'result' }
      ];

      await expect(provider.continueWithToolResults(initialRequest, initialResponse, toolResults))
        .rejects.toThrow('Initial response does not contain any tool calls');
    });
  });

  describe('Streaming with tools', () => {
    it('should handle streaming with tool calls', async () => {
      // Mock implementation for streaming
      const streamMock = [
        { choices: [{ delta: { content: 'I need to ' } }] },
        { choices: [{ delta: { content: 'check the weather' } }] },
        { 
          choices: [{ 
            delta: { 
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: { 
                  name: 'get_weather', 
                  arguments: '{' 
                }
              }]
            } 
          }] 
        },
        { 
          choices: [{ 
            delta: { 
              tool_calls: [{
                id: 'call_123',
                function: { 
                  arguments: '"location":"San Francisco, CA"' 
                }
              }]
            } 
          }] 
        },
        { 
          choices: [{ 
            delta: { 
              tool_calls: [{
                id: 'call_123',
                function: { 
                  arguments: '}' 
                }
              }]
            } 
          }] 
        }
      ];

      // Make mockOpenAIClient.chat.completions.create return an async generator
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        [Symbol.asyncIterator]: () => {
          let index = 0;
          return {
            next: async () => {
              return index < streamMock.length ? { done: false, value: streamMock[index++] } : { done: true };
            }
          };
        }
      });

      const onStreamMock = jest.fn();
      
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
        tools: sampleTools,
        stream: true,
        onStream: onStreamMock
      };

      const response = await provider.chat(request);

      // Verify the streaming request was properly formed
      const requestOptions = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      expect(requestOptions.stream).toBe(true);
      
      // Verify onStream was called with accumulated content and tool calls
      expect(onStreamMock).toHaveBeenCalledTimes(streamMock.length + 1); // +1 for final call
      
      // Verify final response has the complete content and tool call
      expect(response.content).toBe('I need to check the weather');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![0].arguments).toBe('{"location":"San Francisco, CA"}');
    });
  });
});