/**
 * @file Tests for Google/Gemini Provider compositional function calling
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GoogleProvider } from '@/providers/google/googleProvider';
import type { Tool, ToolCallOutput } from '@/core/types/provider.types';
import type { GoogleProviderSpecificConfig } from '@/core/types/config.types';

// Create a standard response object that matches what our provider expects
const createStandardResponse = (textContent?: string, functionCall?: Record<string, any>) => {
  const parts: Array<Record<string, any>> = [];

  if (textContent) {
    parts.push({ text: textContent });
  }

  if (functionCall) {
    parts.push({
      functionCall: {
        name: functionCall.name,
        args: functionCall.args
      }
    });
  }

  return {
    response: {
      candidates: [{
        content: {
          parts
        }
      }]
    }
  };
};

// Create mocks for Google's class and methods
const mockGenerateContent = jest.fn();
const mockModelsGet = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent
});

const mockGoogleGenAI = jest.fn().mockImplementation(() => ({
  models: {
    get: mockModelsGet
  }
}));

// Mock ConfigManager
const mockConfigManager = {
  getResolvedApiKey: jest.fn().mockImplementation(async () => {
    return 'test-api-key';
  })
};

describe('GoogleProvider Compositional Function Calling', () => {
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

  it('should handle sequential function calls in a conversation', async () => {
    // First, mock a response with a location function call
    const locationResponse = {
      success: true,
      content: 'I need to find your location first',
      toolCalls: [{
        id: 'get_current_location_12345',
        call_id: 'get_current_location_12345',
        type: 'function_call',
        name: 'get_current_location',
        arguments: JSON.stringify({ ip_address: '8.8.8.8' })
      }]
    };

    // Then mock a weather function call that depends on the location result
    const weatherResponse = {
      success: true,
      content: 'Now I can get the weather for your location',
      toolCalls: [{
        id: 'get_weather_12345',
        call_id: 'get_weather_12345',
        type: 'function_call',
        name: 'get_weather',
        arguments: JSON.stringify({ location: 'San Francisco, CA' })
      }]
    };

    // Finally, mock a text response for the final result
    const finalResponse = {
      success: true,
      content: 'The weather in San Francisco is 72°F and sunny with 45% humidity.',
      toolCalls: undefined
    };

    // Set up the mock sequence
    const originalChat = provider.chat;
    const providerChatMock = jest.fn()
      .mockImplementationOnce(() => Promise.resolve(locationResponse)) // First call returns location function
      .mockImplementationOnce((request: any) => {
        // Verify that location result was included in the messages
        const locationResultMessage = request.messages.find((msg: any) =>
          msg.role === 'user' && msg.tool_call_id === 'get_current_location_12345');
        expect(locationResultMessage).toBeDefined();

        // Return weather function call
        return Promise.resolve(weatherResponse);
      })
      .mockImplementationOnce((request: any) => {
        // Verify that weather function call was included
        const weatherResultMessage = request.messages.find((msg: any) =>
          msg.role === 'user' && msg.tool_call_id === 'get_weather_12345');
        expect(weatherResultMessage).toBeDefined();

        // Restore original implementation for the third call
        provider.chat = originalChat;
        // Return final text response
        return Promise.resolve(finalResponse);
      });

    provider.chat = providerChatMock as typeof provider.chat;

    // Set up tool definitions including the location tool
    const locationTool: Tool = {
      type: 'function' as const,
      name: 'get_current_location',
      description: 'Get the current location based on IP address',
      parameters: {
        type: 'object',
        properties: {
          ip_address: {
            type: 'string',
            description: 'The IP address to geolocate'
          }
        },
        required: ['ip_address']
      }
    };

    const toolsWithLocation: Tool[] = [
      ...sampleTools,
      locationTool
    ];

    // Initial request with location and weather tools
    const initialRequest = {
      messages: [{ role: 'user' as const, content: 'What is the weather in my current location?' }],
      tools: toolsWithLocation
    };

    // 1. Get initial location function call
    const locationCallResponse = await provider.chat(initialRequest);
    expect(locationCallResponse.toolCalls).toBeDefined();
    if (locationCallResponse.toolCalls) {
      expect(locationCallResponse.toolCalls.length).toBe(1);
      expect(locationCallResponse.toolCalls[0].name).toBe('get_current_location');
    }

    // 2. Send location result and get weather function call
    const locationResult: ToolCallOutput[] = [{
      type: 'function_call_output' as const,
      call_id: 'get_current_location_12345',
      output: JSON.stringify({ location: 'San Francisco, CA' })
    }];

    const weatherCallResponse = await provider.continueWithToolResults(
      initialRequest,
      locationCallResponse,
      locationResult
    );

    expect(weatherCallResponse.toolCalls).toBeDefined();
    if (weatherCallResponse.toolCalls) {
      expect(weatherCallResponse.toolCalls.length).toBe(1);
      expect(weatherCallResponse.toolCalls[0].name).toBe('get_weather');
    }

    // 3. Send weather result and get final text response
    const weatherResult: ToolCallOutput[] = [{
      type: 'function_call_output' as const,
      call_id: 'get_weather_12345',
      output: JSON.stringify({
        temperature: 72,
        condition: 'sunny',
        humidity: 45
      })
    }];

    const finalTextResponse = await provider.continueWithToolResults(
      initialRequest,
      weatherCallResponse,
      weatherResult
    );

    // Verify we got a final text response with no more tool calls
    expect(finalTextResponse.toolCalls).toBeUndefined();
    expect(finalTextResponse.content).toContain('San Francisco');
    expect(finalTextResponse.content).toContain('sunny');
  });
});