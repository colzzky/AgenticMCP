/**
 * @file Tests for Google/Gemini Provider tool calling functionality
 * @jest-environment node
 */

// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GoogleProvider } from '@/providers/google/googleProvider';
import type { ToolCallOutput } from '@/core/types/provider.types';
import {
  createStandardResponse,
  createMultipleFunctionCallsResponse,
  sampleTools,
  testConfig,
  createGoogleMocks
} from './googleProvider.sharedTestUtils';

// Create mocks for Google's class and methods
const {
  mockGenerateContent,
  mockModelsGet,
  mockGoogleGenAI,
  mockConfigManager
} = createGoogleMocks();

describe('GoogleProvider Tool Calling', () => {
  let provider: GoogleProvider;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create provider instance with mocks
    provider = new GoogleProvider(mockConfigManager as any, mockGoogleGenAI as any);
    await provider.configure(testConfig);

    // Reset mocks to clear calls from configure
    mockGenerateContent.mockReset();
    mockModelsGet.mockClear();
  });

  describe('Parallel function calling', () => {
    it('should extract multiple tool calls from a single response', async () => {
      // Mock a response with multiple function calls
      mockGenerateContent.mockReturnValueOnce(createMultipleFunctionCallsResponse());

      // Call chat with tools
      const response = await provider.chat({
        messages: [{ role: 'user' as const, content: 'What is the weather in San Francisco and how far is it from LA?' }],
        tools: sampleTools
      });

      // Verify multiple tool calls were extracted
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(2);

      // Verify the first tool call is for the weather
      expect(response.toolCalls[0].name).toBe('get_weather');
      expect(response.toolCalls[0].type).toBe('function_call');
      expect(JSON.parse(response.toolCalls[0].arguments)).toEqual({ location: 'San Francisco, CA' });

      // Verify the second tool call is for distance calculation
      expect(response.toolCalls[1].name).toBe('calculate_distance');
      expect(response.toolCalls[1].type).toBe('function_call');
      expect(JSON.parse(response.toolCalls[1].arguments)).toEqual({
        origin: 'San Francisco, CA',
        destination: 'Los Angeles, CA'
      });
    });

    it('should handle responses with an array of functionCalls', async () => {
      // Create response with functionCalls array format
      const responseWithFunctionCallsArray = {
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'I will process your request.' }]
            }
          }],
          functionCalls: [
            {
              name: 'get_weather',
              args: { location: 'San Francisco, CA' }
            },
            {
              name: 'calculate_distance',
              args: { origin: 'San Francisco, CA', destination: 'Los Angeles, CA' }
            }
          ]
        }
      };

      // Mock a response with functionCalls array
      mockGenerateContent.mockReturnValueOnce(responseWithFunctionCallsArray);

      // Call chat with tools
      const response = await provider.chat({
        messages: [{ role: 'user' as const, content: 'What is the weather in San Francisco and how far is it from LA?' }],
        tools: sampleTools
      });

      // Verify multiple tool calls were extracted
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(2);

      // Verify both tool calls were correctly extracted
      expect(response.toolCalls[0].name).toBe('get_weather');
      expect(response.toolCalls[1].name).toBe('calculate_distance');
    });
  });

  describe('Function response format', () => {
    it('should properly format function responses when continuing a conversation', async () => {
      // Sample initial response with a tool call
      const initialResponse = {
        success: true,
        content: 'I will get the weather for you',
        toolCalls: [{
          id: 'get_weather_12345',
          call_id: 'get_weather_12345',
          type: 'function_call',
          name: 'get_weather',
          arguments: JSON.stringify({ location: 'San Francisco, CA' })
        }]
      };

      // Initial request with tools
      const initialRequest = {
        messages: [{ role: 'user' as const, content: 'What is the weather in San Francisco?' }],
        tools: sampleTools
      };

      // Prepare tool results
      const toolResults = [{
        type: 'function_call_output',
        call_id: 'get_weather_12345',
        output: JSON.stringify({
          temperature: 72,
          condition: 'sunny'
        })
      }];

      // Setup mock for the generated response
      mockGenerateContent.mockReturnValueOnce(
        createStandardResponse('The weather in San Francisco is sunny.')
      );

      // Create spies on the provider's methods
      const generateTextWithToolResultsSpy = jest.spyOn(provider, 'generateTextWithToolResults');
      const generateTextSpy = jest.spyOn(provider, 'generateText');

      // Continue with tool results
      await provider.continueWithToolResults(initialRequest, initialResponse, toolResults);

      // Verify generateTextWithToolResults was called
      expect(generateTextWithToolResultsSpy).toHaveBeenCalledTimes(1);

      // Get the request object that was passed to generateTextWithToolResults
      const toolResultsRequest = generateTextWithToolResultsSpy.mock.calls[0][0];

      // Verify the request contains the correct structure
      expect(toolResultsRequest.messages).toBeDefined();
      expect(toolResultsRequest.tool_outputs).toEqual(toolResults);

      // Verify the assistant message with tool calls was included
      const assistantMessage = toolResultsRequest.messages.find(msg =>
        msg.role === 'assistant' && (msg.tool_calls || msg.content === initialResponse.content));
      expect(assistantMessage).toBeDefined();

      // Restore the original spies
      generateTextWithToolResultsSpy.mockRestore();
      generateTextSpy.mockRestore();
    });
  });

  // Additional test sections are in these files:
  // - Basic tool calling: tests/providers/google/googleProviderBasicToolCalling.test.ts
  // - Compositional function calling: tests/providers/google/googleProviderCompositionalCalling.test.ts
});
