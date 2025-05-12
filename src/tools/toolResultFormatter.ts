/**
 * @file Tool Result Formatter
 * Formats tool results for different LLM providers
 */

import type { ProviderType, ToolCallOutput } from '../core/types/provider.types';
import type { Logger } from '../core/types/logger.types';
import { ToolExecutionResult } from './toolExecutor';

/**
 * Interface for provider-specific formatters
 */
interface ProviderFormatter {
  /**
   * Formats a tool execution result for a specific provider
   * @param result - The tool execution result
   * @param toolCallId - The ID of the tool call
   * @returns Formatted tool call output
   */
  formatResult(result: ToolExecutionResult, toolCallId: string): ToolCallOutput;
}

/**
 * Formatter for OpenAI provider
 */
class OpenAIFormatter implements ProviderFormatter {
  formatResult(result: ToolExecutionResult, toolCallId: string): ToolCallOutput {
    return {
      type: 'function_call_output',
      call_id: toolCallId,
      output: result.success 
        ? result.output || ''
        : JSON.stringify({ error: result.error }),
    };
  }
}

/**
 * Formatter for Anthropic provider
 */
class AnthropicFormatter implements ProviderFormatter {
  formatResult(result: ToolExecutionResult, toolCallId: string): ToolCallOutput {
    return {
      type: 'function_call_output',
      call_id: toolCallId,
      output: result.success 
        ? result.output || ''
        : JSON.stringify({ error: result.error }),
    };
  }
}

/**
 * Formatter for Google/Gemini provider
 */
class GoogleFormatter implements ProviderFormatter {
  formatResult(result: ToolExecutionResult, toolCallId: string): ToolCallOutput {
    return {
      type: 'function_call_output',
      call_id: toolCallId,
      output: result.success 
        ? result.output || ''
        : JSON.stringify({ error: result.error }),
    };
  }
}

/**
 * ToolResultFormatter class for formatting tool results
 */
export class ToolResultFormatter {
  private formatters: Record<ProviderType, ProviderFormatter>;
  private logger: Logger;

  /**
   * Creates a new ToolResultFormatter instance
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
    
    // Initialize formatters for each provider type
    this.formatters = {
      openai: new OpenAIFormatter(),
      anthropic: new AnthropicFormatter(),
      google: new GoogleFormatter(),
    };
    
    this.logger.debug('ToolResultFormatter initialized');
  }

  /**
   * Formats a tool execution result for a specific provider
   * @param result - The tool execution result
   * @param toolCallId - The ID of the tool call
   * @param providerType - The type of LLM provider
   * @returns Formatted tool call output
   */
  public formatResult(
    result: ToolExecutionResult,
    toolCallId: string,
    providerType: ProviderType
  ): ToolCallOutput {
    this.logger.debug(`Formatting tool result for provider: ${providerType}`);
    
    const formatter = this.formatters[providerType];
    if (!formatter) {
      this.logger.warn(`No formatter found for provider type: ${providerType}, using default`);
      return this.formatResultDefault(result, toolCallId);
    }
    
    return formatter.formatResult(result, toolCallId);
  }

  /**
   * Formats multiple tool execution results for a specific provider
   * @param results - The tool execution results
   * @param toolCallIds - The IDs of the tool calls
   * @param providerType - The type of LLM provider
   * @returns Array of formatted tool call outputs
   */
  public formatResults(
    results: ToolExecutionResult[],
    toolCallIds: string[],
    providerType: ProviderType
  ): ToolCallOutput[] {
    if (results.length !== toolCallIds.length) {
      this.logger.error('Results and toolCallIds arrays must have the same length');
      throw new Error('Results and toolCallIds arrays must have the same length');
    }
    
    return results.map((result, index) => 
      this.formatResult(result, toolCallIds[index], providerType)
    );
  }

  /**
   * Default formatter for unknown provider types
   * @param result - The tool execution result
   * @param toolCallId - The ID of the tool call
   * @returns Formatted tool call output
   */
  private formatResultDefault(result: ToolExecutionResult, toolCallId: string): ToolCallOutput {
    return {
      type: 'function_call_output',
      call_id: toolCallId,
      output: result.success 
        ? result.output || ''
        : JSON.stringify({ error: result.error }),
    };
  }

  /**
   * Registers a custom formatter for a provider type
   * @param providerType - The provider type
   * @param formatter - The formatter implementation
   */
  public registerFormatter(providerType: ProviderType, formatter: ProviderFormatter): void {
    this.formatters[providerType] = formatter;
    this.logger.debug(`Registered custom formatter for provider: ${providerType}`);
  }
}
