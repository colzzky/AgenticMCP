/**
 * @file Tests for OpenAI provider tool calling functionality
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// Create mock implementations
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLogLevel: jest.fn()
};

// Define mocks for modules
jest.mock('../../../src/core/utils/logger', () => mockLogger, { virtual: true });

// Import modules after mocking
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider';
import * as ProviderTypes from '../../../src/core/types/provider.types';

describe('OpenAIProvider Tool Calling', () => {
  // Test variables
  let mockOpenAIClient;
  let mockCreate;
  let mockOpenAIConstructor;
  let mockConfigManager;
  let provider;
  
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create the mock create method
    mockCreate = (jest.fn() as any).mockResolvedValue({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { 
            role: 'assistant', 
            content: 'Test response' 
          },
          finish_reason: 'stop',
        },
      ],
    });
    
    // Create the mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    };
    
    // Create the mock OpenAI constructor
    mockOpenAIConstructor = (jest.fn() as any).mockReturnValue(mockOpenAIClient);
    
    // Create the mock config manager
    mockConfigManager = {
      getResolvedApiKey: (jest.fn() as any).mockResolvedValue('resolved-api-key')
    };
    
    // Create the provider
    provider = new OpenAIProvider(mockConfigManager, mockOpenAIConstructor);
    
    // Configure the provider for all tests
    await provider.configure({
      providerType: 'openai-chat',
      instanceName: 'testInstance',
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
    });
    
    // Clear the mock after configuration
    mockCreate.mockClear();
  });
  
  it('should include tools in the request when provided', async () => {
    const toolCallingRequest: ProviderTypes.ProviderRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Get the weather for New York' }],
      tools: [
        {
          type: 'function' as const,
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City and state, e.g., "New York, NY"'
              }
            },
            required: ['location'],
            additionalProperties: false
          }
        }
      ]
    };
    
    await provider.chat(toolCallingRequest);
    
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4',
      tools: [
        expect.objectContaining({
          type: 'function',
          function: expect.objectContaining({
            name: 'get_weather',
            description: 'Get the current weather for a location'
          })
        })
      ]
    }));
  });
  
  it('should handle tool_choice when provided as a string', async () => {
    const toolCallingRequest: ProviderTypes.ProviderRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Get the weather for New York' }],
      tools: [
        {
          type: 'function' as const,
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City and state, e.g., "New York, NY"'
              }
            },
            required: ['location'],
            additionalProperties: false
          }
        }
      ],
      toolChoice: 'auto'
    };
    
    await provider.chat(toolCallingRequest);
    
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      tool_choice: 'auto'
    }));
  });
  
  it('should handle tool_choice when provided as an object', async () => {
    const toolCallingRequest: ProviderTypes.ProviderRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Get the weather for New York' }],
      tools: [
        {
          type: 'function' as const,
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City and state, e.g., "New York, NY"'
              }
            },
            required: ['location'],
            additionalProperties: false
          }
        }
      ],
      toolChoice: { type: 'function', name: 'get_weather' }
    };
    
    await provider.chat(toolCallingRequest);
    
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      tool_choice: {
        type: 'function',
        function: { name: 'get_weather' }
      }
    }));
  });
  
  it('should extract tool calls from the model response', async () => {
    // Set up a mock response with tool calls
    mockCreate.mockResolvedValueOnce({
      id: 'chatcmpl-tool-call',
      choices: [
        {
          message: {
            role: 'assistant',
            content: undefined,
            tool_calls: [
              {
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"location":"New York, NY"}'
                }
              }
            ]
          },
          finish_reason: 'tool_calls',
          index: 0
        }
      ]
    });
    
    const toolCallingRequest: ProviderTypes.ProviderRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Get the weather for New York' }],
      tools: [
        {
          type: 'function' as const,
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City and state, e.g., "New York, NY"'
              }
            },
            required: ['location'],
            additionalProperties: false
          }
        }
      ]
    };
    
    const response = await provider.chat(toolCallingRequest);
    
    expect(response.success).toBe(true);
    expect(response.toolCalls).toBeDefined();
    expect(response.toolCalls?.length).toBe(1);
    expect(response.toolCalls?.[0]).toMatchObject({
      id: 'call_123',
      type: 'function_call',
      name: 'get_weather',
      arguments: '{"location":"New York, NY"}'
    });
  });
  
  it('should execute a tool call with provided functions', async () => {
    const mockGetWeather = jest.fn().mockImplementation(() => 
      Promise.resolve({ temperature: 72, conditions: 'sunny' })
    );
    
    const toolCall = {
      id: 'call_123',
      call_id: 'call_123',
      type: 'function_call' as const,
      name: 'get_weather',
      arguments: '{"location":"New York, NY"}'
    };
    
    const availableTools = { get_weather: mockGetWeather };
    const result = await provider.executeToolCall(toolCall, availableTools);
    
    expect(mockGetWeather).toHaveBeenCalledWith({ location: 'New York, NY' });
    expect(JSON.parse(result)).toEqual({ temperature: 72, conditions: 'sunny' });
  });
  
  it('should continue a conversation with tool call results', async () => {
    // Initial request with tools
    const initialRequest: ProviderTypes.ProviderRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Get the weather for New York' }],
      tools: [
        {
          type: 'function' as const,
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City and state, e.g., "New York, NY"'
              }
            },
            required: ['location'],
            additionalProperties: false
          }
        }
      ]
    };
    
    // Mock initial response with tool calls
    const initialResponse = {
      success: true,
      content: undefined,
      toolCalls: [
        {
          id: 'call_123',
          call_id: 'call_123',
          type: 'function_call' as const,
          name: 'get_weather',
          arguments: '{"location":"New York, NY"}'
        }
      ]
    };
    
    // Mock tool call results
    const toolResults = [
      {
        type: 'function_call_output' as const,
        call_id: 'call_123',
        output: JSON.stringify({ temperature: 72, conditions: 'sunny' })
      }
    ];
    
    // Set up mock response for the continuation call
    mockCreate.mockResolvedValueOnce({
      id: 'chatcmpl-continuation',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'The weather in New York is 72°F and sunny.',
          },
          finish_reason: 'stop',
          index: 0
        }
      ]
    });

    const continuationResponse = await provider.continueWithToolResults(
      initialRequest,
      initialResponse,
      toolResults
    );

    // Verify the request includes the right structure by checking if mockCreate was called
    expect(mockCreate).toHaveBeenCalled();

    // Verify that createCallArgs contains model and messages
    const createCallArgs = mockCreate.mock.calls[0][0];
    expect(createCallArgs).toHaveProperty('model');
    expect(createCallArgs).toHaveProperty('messages');

    // Check first message
    expect(createCallArgs.messages[0]).toEqual({ role: 'user', content: 'Get the weather for New York' });
    
    // Verify the continuation response
    expect(continuationResponse.success).toBe(true);
    expect(continuationResponse.content).toBe('The weather in New York is 72°F and sunny.');
  });
  
  it('should handle errors when executing tool calls', async () => {
    const toolCall = {
      id: 'call_123',
      call_id: 'call_123',
      type: 'function_call' as const,
      name: 'get_weather',
      arguments: '{"location":"New York, NY"}'
    };
    
    // No tools provided
    await expect(provider.executeToolCall(toolCall)).rejects.toThrow('No tools available to execute');
    
    // Tool not found
    const notFoundResult = await provider.executeToolCall(toolCall, {});
    expect(notFoundResult).toBe(JSON.stringify({ error: 'Tool not found: get_weather' }));
    
    // Tool execution error
    const mockErrorTool = jest.fn().mockImplementation(() => Promise.reject(new Error('API failed')));
    const errorTools = { get_weather: mockErrorTool };
    const result = await provider.executeToolCall(toolCall, errorTools);
    expect(JSON.parse(result)).toEqual({ error: 'API failed' });
  });
});