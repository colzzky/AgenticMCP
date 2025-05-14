/**
 * @file Tests for Google/Gemini Provider tool extraction utilities
 */
import { describe, it, expect } from '@jest/globals';
import { extractToolCallsFromGenAIResponse } from '../../../src/providers/google/googleToolExtraction.js';
import type { GoogleGenAIResponse } from '../../../src/providers/google/googleTypes.js';
import type { ToolCall } from '../../../src/core/types/provider.types.js';

describe('Google Tool Extraction Utilities', () => {
  describe('extractToolCallsFromGenAIResponse', () => {
    it('should extract function calls from parts array in the response', () => {
      // Setup - Create a mock Google response with function calls in parts
      const mockResponse: GoogleGenAIResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Here is some text'
                },
                {
                  functionCall: {
                    name: 'get_weather',
                    args: {
                      location: 'San Francisco',
                      unit: 'celsius'
                    }
                  }
                },
                {
                  functionCall: {
                    name: 'search_hotels',
                    args: {
                      location: 'San Francisco',
                      checkin_date: '2023-09-15',
                      checkout_date: '2023-09-20'
                    }
                  }
                }
              ]
            }
          }
        ]
      };

      // Execute
      const toolCalls = extractToolCallsFromGenAIResponse(mockResponse);

      // Verify
      expect(toolCalls).toBeDefined();
      expect(toolCalls).toHaveLength(2);
      
      // Verify first tool call
      expect(toolCalls?.[0].name).toBe('get_weather');
      expect(toolCalls?.[0].type).toBe('function_call');
      expect(JSON.parse(toolCalls?.[0].arguments || '{}')).toEqual({
        location: 'San Francisco',
        unit: 'celsius'
      });

      // Verify second tool call
      expect(toolCalls?.[1].name).toBe('search_hotels');
      expect(JSON.parse(toolCalls?.[1].arguments || '{}')).toHaveProperty('checkin_date', '2023-09-15');
    });

    it('should extract function calls from functionCalls property in the response', () => {
      // Setup - Create a mock Google response with function calls in functionCalls property
      const mockResponse: GoogleGenAIResponse = {
        candidates: [{ content: { parts: [{ text: 'Response text' }] } }],
        functionCalls: [
          {
            name: 'calculate_price',
            args: {
              quantity: 5,
              price_per_unit: 10.99,
              tax_rate: 0.07
            }
          }
        ]
      };

      // Execute
      const toolCalls = extractToolCallsFromGenAIResponse(mockResponse);

      // Verify
      expect(toolCalls).toBeDefined();
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls?.[0].name).toBe('calculate_price');
      expect(JSON.parse(toolCalls?.[0].arguments || '{}')).toEqual({
        quantity: 5,
        price_per_unit: 10.99,
        tax_rate: 0.07
      });
    });

    it('should handle responses with both parts and functionCalls', () => {
      // Setup - Create a mock Google response with function calls in both places
      const mockResponse: GoogleGenAIResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'get_weather',
                    args: { location: 'New York' }
                  }
                }
              ]
            }
          }
        ],
        functionCalls: [
          {
            name: 'search_news',
            args: { topic: 'technology' }
          }
        ]
      };

      // Execute
      const toolCalls = extractToolCallsFromGenAIResponse(mockResponse);

      // Verify
      expect(toolCalls).toBeDefined();
      expect(toolCalls).toHaveLength(2);
      
      // Check for both function calls from different sources
      const functionNames = toolCalls?.map(tc => tc.name) || [];
      expect(functionNames).toContain('get_weather');
      expect(functionNames).toContain('search_news');
    });

    it('should return undefined for responses without function calls', () => {
      // Setup - Create a mock Google response without function calls
      const mockResponse: GoogleGenAIResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'This is a text-only response with no function calls'
                }
              ]
            }
          }
        ]
      };

      // Execute
      const toolCalls = extractToolCallsFromGenAIResponse(mockResponse);

      // Verify
      expect(toolCalls).toBeUndefined();
    });

    it('should return undefined for empty or invalid responses', () => {
      // Empty response
      expect(extractToolCallsFromGenAIResponse({})).toBeUndefined();
      
      // No candidates
      expect(extractToolCallsFromGenAIResponse({ candidates: [] })).toBeUndefined();
      
      // No content
      expect(extractToolCallsFromGenAIResponse({ candidates: [{}] })).toBeUndefined();
      
      // No parts
      expect(extractToolCallsFromGenAIResponse({ candidates: [{ content: {} }] })).toBeUndefined();
      
      // Empty parts
      expect(extractToolCallsFromGenAIResponse({ candidates: [{ content: { parts: [] } }] })).toBeUndefined();

      // Null response
      expect(extractToolCallsFromGenAIResponse(null as any)).toBeUndefined();
    });

    it('should handle tool calls with complex arguments', () => {
      // Setup - Create a mock Google response with complex nested args
      const mockResponse: GoogleGenAIResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'complex_function',
                    args: {
                      simpleArg: 'value',
                      numberArg: 42,
                      booleanArg: true,
                      nestedObject: {
                        level1: {
                          level2: {
                            deepValue: 'found me',
                            deepArray: [1, 2, 3]
                          }
                        }
                      },
                      arrayArg: [
                        { id: 1, name: 'first' },
                        { id: 2, name: 'second' }
                      ]
                    }
                  }
                }
              ]
            }
          }
        ]
      };

      // Execute
      const toolCalls = extractToolCallsFromGenAIResponse(mockResponse);

      // Verify
      expect(toolCalls).toBeDefined();
      expect(toolCalls).toHaveLength(1);
      
      // Parse and verify complex arguments
      const args = JSON.parse(toolCalls?.[0].arguments || '{}');
      expect(args.simpleArg).toBe('value');
      expect(args.numberArg).toBe(42);
      expect(args.booleanArg).toBe(true);
      expect(args.nestedObject.level1.level2.deepValue).toBe('found me');
      expect(args.nestedObject.level1.level2.deepArray).toEqual([1, 2, 3]);
      expect(args.arrayArg[1].name).toBe('second');
    });
  });
});