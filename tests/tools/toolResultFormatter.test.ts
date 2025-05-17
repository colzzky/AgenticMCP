/**
 * @file Unit tests for ToolResultFormatter
 * Tests the formatting of tool results for different providers
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ToolResultFormatter } from '../../src/tools/toolResultFormatter.js';
import { ToolExecutionResult } from '../../src/tools/toolExecutor.js';
import type { ProviderType, ToolCallOutput } from '../../src/core/types/provider.types.js';
import type { Logger } from '../../src/core/types/logger.types.js';

describe('ToolResultFormatter', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  let formatter: ToolResultFormatter;

  beforeEach(() => {
    jest.clearAllMocks();
    formatter = new ToolResultFormatter(mockLogger);
  });

  describe('constructor', () => {
    it('should initialize formatters and log debug message', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith('ToolResultFormatter initialized');
    });
  });

  describe('formatResult method', () => {
    it('should format successful result for OpenAI provider', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: true,
        output: 'Tool execution succeeded'
      };
      const toolCallId = 'call_123';
      const providerType: ProviderType = 'openai';

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: 'Tool execution succeeded'
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Formatting tool result for provider: ${providerType}`)
      );
    });

    it('should format error result for OpenAI provider', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: false,
        error: {
          message: 'Tool execution failed',
          code: 'tool_error'
        }
      };
      const toolCallId = 'call_123';
      const providerType: ProviderType = 'openai';

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: JSON.stringify({ error: result.error })
      });
    });

    it('should format successful result for Anthropic provider', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: true,
        output: 'Tool execution succeeded'
      };
      const toolCallId = 'call_123';
      const providerType: ProviderType = 'anthropic';

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: 'Tool execution succeeded'
      });
    });

    it('should format error result for Anthropic provider', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: false,
        error: {
          message: 'Tool execution failed',
          code: 'tool_error'
        }
      };
      const toolCallId = 'call_123';
      const providerType: ProviderType = 'anthropic';

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: JSON.stringify({ error: result.error })
      });
    });

    it('should format successful result for Google provider', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: true,
        output: 'Tool execution succeeded'
      };
      const toolCallId = 'call_123';
      const providerType: ProviderType = 'google';

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: 'Tool execution succeeded'
      });
    });

    it('should format error result for Google provider', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: false,
        error: {
          message: 'Tool execution failed',
          code: 'tool_error'
        }
      };
      const toolCallId = 'call_123';
      const providerType: ProviderType = 'google';

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: JSON.stringify({ error: result.error })
      });
    });

    it('should use default formatter for unknown provider type', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: true,
        output: 'Tool execution succeeded'
      };
      const toolCallId = 'call_123';
      const providerType = 'unknown' as ProviderType;

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: 'Tool execution succeeded'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`No formatter found for provider type: ${providerType}`)
      );
    });

    it('should handle empty output for successful result', () => {
      // Setup
      const result: ToolExecutionResult = {
        success: true
        // No output provided
      };
      const toolCallId = 'call_123';
      const providerType: ProviderType = 'openai';

      // Execute
      const formatted = formatter.formatResult(result, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: ''
      });
    });

    it('should handle complex error details in result', () => {
      // Setup
      const complexError = {
        success: false,
        error: {
          message: 'Complex error occurred',
          code: 'complex_error',
          details: {
            timestamp: Date.now(),
            errorId: 'err_12345',
            context: {
              requestId: 'req_789',
              location: 'server-side',
              nestedData: {
                level1: {
                  level2: 'deeply nested value'
                }
              }
            }
          }
        }
      };
      const toolCallId = 'call_complex';
      const providerType: ProviderType = 'openai';

      // Execute
      const formatted = formatter.formatResult(complexError, toolCallId, providerType);

      // Verify
      expect(formatted).toEqual({
        type: 'function_call_output',
        call_id: toolCallId,
        output: JSON.stringify({ error: complexError.error })
      });

      // Verify we can parse the output back to an object
      const parsedOutput = JSON.parse(formatted.output);
      expect(parsedOutput.error.message).toBe('Complex error occurred');
      expect(parsedOutput.error.details.context.nestedData.level1.level2).toBe('deeply nested value');
    });
  });

  describe('formatResults method', () => {
    it('should format multiple results', () => {
      // Setup
      const results: ToolExecutionResult[] = [
        { success: true, output: 'Result 1' },
        { success: false, error: { message: 'Error 2' } }
      ];
      const toolCallIds = ['call_1', 'call_2'];
      const providerType: ProviderType = 'openai';

      // Mock formatResult
      const formatResultSpy = jest.spyOn(formatter, 'formatResult');
      formatResultSpy.mockReturnValueOnce({
        type: 'function_call_output',
        call_id: 'call_1',
        output: 'Result 1'
      });
      formatResultSpy.mockReturnValueOnce({
        type: 'function_call_output',
        call_id: 'call_2',
        output: JSON.stringify({ error: { message: 'Error 2' } })
      });

      // Execute
      const formatted = formatter.formatResults(results, toolCallIds, providerType);

      // Verify
      expect(formatted).toHaveLength(2);
      expect(formatResultSpy).toHaveBeenCalledTimes(2);
      expect(formatResultSpy).toHaveBeenCalledWith(results[0], toolCallIds[0], providerType);
      expect(formatResultSpy).toHaveBeenCalledWith(results[1], toolCallIds[1], providerType);
      expect(formatted[0]).toEqual({
        type: 'function_call_output',
        call_id: 'call_1',
        output: 'Result 1'
      });
      expect(formatted[1]).toEqual({
        type: 'function_call_output',
        call_id: 'call_2',
        output: JSON.stringify({ error: { message: 'Error 2' } })
      });
    });

    it('should throw error if results and toolCallIds arrays have different lengths', () => {
      // Setup
      const results: ToolExecutionResult[] = [
        { success: true, output: 'Result 1' },
        { success: false, error: { message: 'Error 2' } }
      ];
      const toolCallIds = ['call_1']; // Only one ID for two results
      const providerType: ProviderType = 'openai';

      // Execute & Verify
      expect(() => {
        formatter.formatResults(results, toolCallIds, providerType);
      }).toThrow('Results and toolCallIds arrays must have the same length');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Results and toolCallIds arrays must have the same length'
      );
    });
  });

  describe('registerFormatter method', () => {
    it('should register a custom formatter', () => {
      // Setup
      const customFormatter = {
        formatResult: (jest.fn() as any).mockReturnValue({
          type: 'function_call_output',
          call_id: 'test_call',
          output: 'Custom formatted output'
        })
      };
      const providerType: ProviderType = 'openai';

      // Execute
      formatter.registerFormatter(providerType, customFormatter);

      // Verify registration
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Registered custom formatter for provider: ${providerType}`)
      );

      // Verify the custom formatter is used
      const result: ToolExecutionResult = { 
        success: true, 
        output: 'Test output' 
      };
      const toolCallId = 'test_call';
      
      formatter.formatResult(result, toolCallId, providerType);
      
      expect(customFormatter.formatResult).toHaveBeenCalledWith(result, toolCallId);
    });

    it('should override existing formatter for a provider type', () => {
      // Setup
      const originalResult = formatter.formatResult(
        { success: true, output: 'Original output' },
        'call_id',
        'openai'
      );

      // Create and register a custom formatter with different behavior
      const customFormatter = {
        formatResult: (jest.fn() as any).mockReturnValue({
          type: 'function_call_output',
          call_id: 'call_id',
          output: 'Custom override output'
        })
      };

      // Execute - register the override formatter
      formatter.registerFormatter('openai', customFormatter);

      // Use the formatter again
      const newResult = formatter.formatResult(
        { success: true, output: 'Original output' },
        'call_id',
        'openai'
      );

      // Verify the formatter was overridden
      expect(newResult).not.toEqual(originalResult);
      expect(newResult.output).toBe('Custom override output');
      expect(customFormatter.formatResult).toHaveBeenCalled();
    });
  });
});