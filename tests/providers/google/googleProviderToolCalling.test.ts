/**
 * @file Tests for Google/Gemini Provider tool calling functionality
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GoogleProvider } from '@/providers/google/googleProvider';
import type { Tool, ToolCall, ToolCallOutput } from '@/core/types/provider.types';
import type { GoogleProviderSpecificConfig } from '@/core/types/config.types';

// Create mocks for Google's class and methods
const mockGenerateContent = jest.fn<() => Promise<any>>();
const mockModelsGet = jest.fn<() => { generateContent: typeof mockGenerateContent }>().mockReturnValue({
  generateContent: mockGenerateContent
});

const mockGoogleGenAI = jest.fn<() => { models: { get: typeof mockModelsGet } }>().mockImplementation(() => ({
  models: {
    get: mockModelsGet
  }
}));

// Mock ConfigManager
const mockConfigManager = {
  getResolvedApiKey: jest.fn().mockResolvedValue('test-api-key')
};

// Mock Logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('GoogleProvider Tool Calling', () => {
  let provider: GoogleProvider;
  
  // Sample tools for testing
  const sampleTools: Tool[] = [
    {
      type: 'function',
      name: 'get_weather',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { 
            type: 'string', 
            description: 'The city and state, e.g., San Francisco, CA' 
          }
        },
        required: ['location']
      }
    },
    {
      type: 'function',
      name: 'calculate_distance',
      description: 'Calculate distance between two locations',
      parameters: {
        type: 'object',
        properties: {
          origin: { 
            type: 'string', 
            description: 'Starting location' 
          },
          destination: { 
            type: 'string',
            description: 'Ending location' 
          }
        },
        required: ['origin', 'destination']
      }
    }
  ];

  // Config for provider
  const config: GoogleProviderSpecificConfig = {
    providerType: 'google',
    instanceName: 'test-instance',
    apiKey: 'test-api-key',
    model: 'gemini-1.5-flash'
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create provider instance with mocks
    provider = new GoogleProvider(mockConfigManager as any, mockGoogleGenAI as any);
    await provider.configure(config);
    
    // Reset mocks to clear calls from configure
    mockGenerateContent.mockReset();
    mockModelsGet.mockClear();
  });

  describe('Tool format conversion', () => {
    it('should convert tools to Google function declaration format', async () => {
      // Mock a successful response
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: 'This is a test response',
          candidates: [{ content: { parts: [{ text: 'This is a test response' }] } }]
        }
      });

      // Call chat with tools
      await provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        tools: sampleTools
      });

      // Check that the tools were correctly converted
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0] as any;

      // Verify tools were passed correctly
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools).toHaveLength(1);
      expect(callArgs.tools[0].functionDeclarations).toHaveLength(2);

      // Verify first tool was converted correctly
      const firstTool = callArgs.tools[0].functionDeclarations[0];
      expect(firstTool.name).toBe('get_weather');
      expect(firstTool.parameters.type).toBe('object');
      expect(firstTool.parameters.properties.location).toBeDefined();
      expect(firstTool.parameters.required).toContain('location');
    });

    it('should handle tool choice parameter', async () => {
      // Mock a successful response
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: 'This is a test response',
          candidates: [{ content: { parts: [{ text: 'This is a test response' }] } }]
        }
      });

      // Call chat with tools and toolChoice
      await provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        tools: sampleTools,
        toolChoice: 'required'
      });

      // Check that toolConfig was correctly set
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0] as any;

      // Verify toolConfig was included
      expect(callArgs.toolConfig).toBeDefined();
      expect(callArgs.toolConfig.functionCallingConfig.mode).toBe('ANY');
    });

    it('should handle specific tool choice', async () => {
      // Mock a successful response
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: 'This is a test response',
          candidates: [{ content: { parts: [{ text: 'This is a test response' }] } }]
        }
      });

      // Call chat with tools and specific tool choice
      await provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        tools: sampleTools,
        toolChoice: { type: 'function', name: 'get_weather' }
      });

      // Check that toolConfig was correctly set
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0] as any;

      // Verify toolConfig was included with specific tool
      expect(callArgs.toolConfig).toBeDefined();
      expect(callArgs.toolConfig.functionCallingConfig.mode).toBe('ANY');
      expect(callArgs.toolConfig.functionCallingConfig.allowedFunctionNames).toContain('get_weather');
    });
  });

  describe('Tool call extraction', () => {
    it('should extract tool calls from response', async () => {
      // Mock a response with a function call
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: [{
            content: {
              parts: [
                { text: 'I will get the weather for you' },
                { 
                  functionCall: {
                    name: 'get_weather',
                    args: { location: 'San Francisco, CA' }
                  }
                }
              ]
            }
          }]
        }
      });

      // Call chat with tools
      const response = await provider.chat({
        messages: [{ role: 'user' as const, content: 'What is the weather in San Francisco?' }],
        tools: sampleTools
      });

      // Verify tool calls were extracted
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![0].type).toBe('function_call');
      expect(JSON.parse(response.toolCalls![0].arguments)).toEqual({ location: 'San Francisco, CA' });
    });

    it('should handle responses with no tool calls', async () => {
      // Mock a response without tool calls
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: 'This is a regular response without tool calls',
          candidates: [{
            content: {
              parts: [
                { text: 'This is a regular response without tool calls' }
              ]
            }
          }]
        }
      });

      // Call chat with tools
      const response = await provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        tools: sampleTools
      });

      // Verify no tool calls were extracted
      expect(response.toolCalls).toBeUndefined();
    });
  });

  describe('Tool call execution', () => {
    it('should execute a tool call with provided function', async () => {
      // Sample tool call
      const toolCall: ToolCall = {
        id: 'call_1234',
        call_id: 'call_1234',
        type: 'function_call',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'San Francisco, CA' })
      };

      // Mock tool function
      const mockWeatherFunction = jest.fn().mockResolvedValue({
        temperature: 72,
        condition: 'sunny',
        humidity: 45
      });

      // Execute tool call
      const result = await provider.executeToolCall(toolCall, {
        get_weather: mockWeatherFunction
      });

      // Verify function was called with correct args
      expect(mockWeatherFunction).toHaveBeenCalledWith({ location: 'San Francisco, CA' });
      
      // Verify result was converted to string
      const parsedResult = JSON.parse(result);
      expect(parsedResult).toEqual({
        temperature: 72,
        condition: 'sunny',
        humidity: 45
      });
    });

    it('should handle errors during tool execution', async () => {
      // Sample tool call
      const toolCall: ToolCall = {
        id: 'call_1234',
        call_id: 'call_1234',
        type: 'function_call',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'San Francisco, CA' })
      };

      // Mock tool function that throws error
      const mockErrorFunction = jest.fn().mockRejectedValue(new Error('API error'));

      // Execute tool call
      const result = await provider.executeToolCall(toolCall, {
        get_weather: mockErrorFunction
      });

      // Verify function was called
      expect(mockErrorFunction).toHaveBeenCalledWith({ location: 'San Francisco, CA' });
      
      // Verify error was handled and returned in JSON
      const parsedResult = JSON.parse(result);
      expect(parsedResult.error).toBe('API error');
    });
  });

  describe('Continue with tool results', () => {
    it('should continue conversation with tool results', async () => {
      // Mock responses for the two calls
      mockGenerateContent
        // First call returns a tool call
        .mockResolvedValueOnce({
          response: {
            text: 'I will check the weather for you',
            candidates: [{
              content: {
                parts: [
                  { text: 'I will check the weather for you' },
                  { 
                    functionCall: {
                      name: 'get_weather',
                      args: { location: 'San Francisco, CA' }
                    }
                  }
                ]
              }
            }]
          }
        })
        // Second call returns a normal text response
        .mockResolvedValueOnce({
          response: {
            text: 'The weather in San Francisco is 72°F and sunny with 45% humidity.',
            candidates: [{
              content: {
                parts: [
                  { text: 'The weather in San Francisco is 72°F and sunny with 45% humidity.' }
                ]
              }
            }]
          }
        });

      // Initial request with tools
      const initialRequest = {
        messages: [{ role: 'user' as const, content: 'What is the weather in San Francisco?' }],
        tools: sampleTools
      };

      // Get initial response with tool call
      const initialResponse = await provider.chat(initialRequest);
      expect(initialResponse.toolCalls).toHaveLength(1);

      // Prepare tool results
      const toolResults: ToolCallOutput[] = [{
        type: 'function_call_output',
        call_id: initialResponse.toolCalls![0].call_id,
        output: JSON.stringify({
          temperature: 72,
          condition: 'sunny',
          humidity: 45
        })
      }];

      // Continue the conversation with tool results
      const finalResponse = await provider.continueWithToolResults(
        initialRequest,
        initialResponse,
        toolResults
      );

      // Verify tool results were incorporated
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toContain('San Francisco');
      expect(finalResponse.content).toContain('72');
      expect(finalResponse.content).toContain('sunny');
      
      // Verify a second call was made
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);

      // Verify messages were constructed correctly
      const secondCallArgs = mockGenerateContent.mock.calls[1][0] as any;
      expect(secondCallArgs.contents).toHaveLength(3); // Original + assistant + tool result
    });
  });
});