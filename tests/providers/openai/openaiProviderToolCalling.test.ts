jest.mock('@/core/utils', () => ({
  __esModule: true,
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { ConfigManager } from '@/core/config/configManager';
import { OpenAIProviderSpecificConfig } from '../../../src/core/types/config.types';
import { ProviderRequest } from '../../../src/core/types/provider.types';

// ESM-compatible mock for logger
jest.unstable_mockModule('@/core/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock ConfigManager
const MockedConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>;
jest.mock('@/core/config/configManager');

describe('OpenAIProvider Tool Calling', () => {
  let OpenAIProvider: any;
  let loggerActual: any;
  let provider: any;
  let mockOpenAIConstructorSpy: any;
  let mockCreate: any;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let baseConfig: OpenAIProviderSpecificConfig;
  let infoMock: jest.Mock;
  let errorMock: jest.Mock;

  beforeAll(async () => {
    jest.resetModules();
    const openaiProviderModule = await import('../../../src/providers/openai/openaiProvider');
    OpenAIProvider = openaiProviderModule.OpenAIProvider;
    loggerActual = await import('@/core/utils');
    const openaiMock = await import('../../../__mocks__/openai');
    mockCreate = openaiMock.mockCreate;
    mockOpenAIConstructorSpy = openaiMock.mockOpenAIConstructorSpy;
    // Use ESM-compatible mocking for logger
    const loggerModule = await import('@/core/utils/logger');
    infoMock = loggerModule.info as jest.Mock;
    errorMock = loggerModule.error as jest.Mock;
  });

  beforeEach(() => {
    mockCreate.mockClear();
    infoMock.mockClear();
    errorMock.mockClear();
    if ((loggerActual.warn as jest.Mock).mockClear) (loggerActual.warn as jest.Mock).mockClear();
    if ((loggerActual.debug as jest.Mock).mockClear) (loggerActual.debug as jest.Mock).mockClear();
    
    mockConfigManager = new MockedConfigManager() as jest.Mocked<ConfigManager>;
    mockConfigManager.getResolvedApiKey = jest.fn(async () => 'resolved-api-key') as jest.MockedFunction<(providerConfig: any) => Promise<string | undefined>>;

    baseConfig = {
      providerType: 'openai-chat',
      instanceName: 'testInstance',
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
    };

    provider = new OpenAIProvider(mockConfigManager, mockOpenAIConstructorSpy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    await provider.configure(baseConfig);
    mockCreate.mockClear();
  });

  it('should include tools in the request when provided', async () => {
    const toolCallingRequest = {
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
    const toolCallingRequest = {
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
    const toolCallingRequest = {
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
    const toolCallingRequest = {
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
      type: 'function_call',
      name: 'get_weather',
      arguments: expect.any(String)
    });
  });

  it('should execute a tool call with provided functions', async () => {
    const mockGetWeather = jest.fn().mockImplementation(() => Promise.resolve({ temperature: 72, conditions: 'sunny' }));
    const toolCall = {
      id: 'call_123',
      call_id: 'call_123',
      type: 'function_call' as const,
      name: 'get_weather',
      arguments: JSON.stringify({ location: 'New York, NY' })
    };

    const availableTools: Record<string, Function> = { get_weather: mockGetWeather };
    const result = await provider.executeToolCall(toolCall, availableTools);

    expect(mockGetWeather).toHaveBeenCalledWith({ location: 'New York, NY' });
    expect(JSON.parse(result)).toEqual({ temperature: 72, conditions: 'sunny' });
  });

  it('should continue a conversation with tool call results', async () => {
    // Initial request with tools
    const initialRequest = {
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
          arguments: JSON.stringify({ location: 'New York, NY' })
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

    // Reset mock for the continuation call
    mockCreate.mockClear();
    mockCreate.mockResolvedValueOnce({
      id: 'chatcmpl-continuation',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'The weather in New York is 72°F and sunny.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 30, completion_tokens: 20, total_tokens: 50 },
    });

    const continuationResponse = await provider.continueWithToolResults(
      initialRequest,
      initialResponse,
      toolResults
    );

    // Verify generateTextWithToolResults was called (via our refactored implementation)
    // The generateTextWithToolResults method creates a toolResultsRequest with tool_outputs
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        { role: 'user', content: 'Get the weather for New York' },
        expect.objectContaining({
          role: 'assistant',
          tool_calls: initialResponse.toolCalls
        })
      ]),
      // The tool_outputs parameter would be used in the actual OpenAI API call,
      // but our mock implementation currently doesn't pass this through
    }));

    // Verify continuation response
    expect(continuationResponse.success).toBe(true);
    expect(continuationResponse.content).toBe('The weather in New York is 72°F and sunny.');
  });

  it('should handle errors when executing tool calls', async () => {
    const toolCall = {
      id: 'call_123',
      call_id: 'call_123',
      type: 'function_call' as const,
      name: 'get_weather',
      arguments: JSON.stringify({ location: 'New York, NY' })
    };

    // No tools provided
    await expect(provider.executeToolCall(toolCall)).rejects.toThrow('No tools available to execute');

    // Tool not found - the implementation returns an error JSON string instead of throwing
    const notFoundResult = await provider.executeToolCall(toolCall, {});
    expect(notFoundResult).toBe(JSON.stringify({ error: 'Tool not found: get_weather' }));

    // Tool execution error
    const mockErrorTool = jest.fn().mockImplementation(() => Promise.reject(new Error('API failed')));
    const errorTools: Record<string, Function> = { get_weather: mockErrorTool };
    const result = await provider.executeToolCall(toolCall, errorTools);
    expect(JSON.parse(result)).toEqual({ error: 'API failed' });
  });
});