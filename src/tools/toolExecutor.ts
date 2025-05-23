/**
 * @file Tool Executor for handling LLM tool calls
 * Responsible for executing tool calls from LLMs and formatting results
 */

import type { ToolCall, ToolCallOutput } from '../core/types/provider.types';
import type { Logger } from '../core/types/logger.types';
import type { CommandMap, CommandHandler } from '../core/types/cli.types';
import { ToolRegistry } from './toolRegistry';

/**
 * Configuration options for the ToolExecutor
 */
export interface ToolExecutorConfig {
  /** Maximum time in milliseconds to wait for a tool to execute before timing out */
  toolTimeoutMs?: number;
  /** Maximum number of retries for failed tool executions */
  maxRetries?: number;
  /** Whether to execute multiple tool calls in parallel (when supported) */
  parallelExecution?: boolean;
}

/**
 * Default configuration for the ToolExecutor
 */
const DEFAULT_CONFIG: ToolExecutorConfig = {
  toolTimeoutMs: 30_000, // 30 seconds
  maxRetries: 2,
  parallelExecution: true,
};

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
  /** Whether the execution was successful */
  success: boolean;
  /** The output of the tool execution (if successful) */
  output?: string;
  /** Error information (if unsuccessful) */
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * ToolExecutor class for executing tool calls from LLMs
 */
export class ToolExecutor {
  private config: ToolExecutorConfig;
  private logger: Logger;
  private toolImplementations: CommandMap;
  private toolRegistry: ToolRegistry;

  /**
   * Creates a new ToolExecutor instance
   * @param toolRegistry - ToolRegistry instance
   * @param toolImplementations - Map of tool names to their implementation functions
   * @param logger - Logger instance
   * @param config - Configuration options
   */
  constructor(
    toolRegistry: ToolRegistry,
    toolImplementations: CommandMap,
    logger: Logger,
    config: Partial<ToolExecutorConfig> = {}
  ) {
    this.toolRegistry = toolRegistry;
    this.toolImplementations = toolImplementations;
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger.debug('ToolExecutor initialized with config:', JSON.stringify(this.config));
  }

  /**
   * Executes a single tool call
   * @param toolCall - The tool call to execute
   * @returns Promise resolving to the execution result
   */
  public async executeToolCall(toolCall: ToolCall): Promise<ToolExecutionResult> {
    const { id, name, arguments: argsStr } = toolCall;
    
    this.logger.debug(`Executing tool call: ${name} (ID: ${id})`);
    this.logger.debug(`Arguments: ${JSON.stringify(toolCall)}`);
    
    // Check if the tool exists in our implementations
    if (!this.toolImplementations[name]) {
      this.logger.error(`Tool not found: ${name}`);
      return {
        success: false,
        error: {
          message: `Tool not found: ${name}`,
          code: 'tool_not_found',
        },
      };
    }
    
    try {
      // Parse the arguments string to an object
      const args = JSON.parse(argsStr);
      
      // Get the tool implementation
      const toolFunction = this.toolImplementations[name];
      
      // Execute the tool with timeout
      const output = await this.executeWithTimeout(
        () => toolFunction(args),
        this.config.toolTimeoutMs!
      );
      
      // Convert the result to a string if it's not already
      const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
      
      this.logger.debug(`Tool call ${name} (ID: ${id}) executed successfully`);
      this.logger.debug(`Output: ${outputStr}`)
      
      return {
        success: true,
        output: outputStr,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error executing tool call ${name} (ID: ${id}): ${errorMessage}`);
      
      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'tool_execution_error',
          details: error,
        },
      };
    }
  }

  /**
   * Executes multiple tool calls
   * @param toolCalls - Array of tool calls to execute
   * @returns Promise resolving to an array of execution results
   */
  public async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolCallOutput[]> {
    if (!toolCalls || toolCalls.length === 0) {
      return [];
    }
    
    this.logger.debug(`Executing ${toolCalls.length} tool calls`);
    
    // Execute tool calls in parallel or sequentially based on configuration
    const executionResults = this.config.parallelExecution
      ? await Promise.all(toolCalls.map(call => this.executeToolCall(call)))
      : await this.executeSequentially(toolCalls);
    
    // Convert execution results to tool call outputs
    return toolCalls.map((call, index) => {
      const result = executionResults[index];
      
      return {
        type: 'function_call_output',
        call_id: call.id || call.call_id || `${call.name}_${Date.now()}`,
        output: result.success
          ? result.output || ''
          : JSON.stringify({ error: result.error }),
      };
    });
  }

  /**
   * Executes tool calls sequentially
   * @param toolCalls - Array of tool calls to execute
   * @returns Promise resolving to an array of execution results
   */
  private async executeSequentially(toolCalls: ToolCall[]): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    
    for (const call of toolCalls) {
      const result = await this.executeToolCall(call);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Executes a function with a timeout
   * @param fn - The function to execute
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise resolving to the function result
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Gets all registered tool implementations
   * @returns Record mapping tool names to their implementation functions
   */
  public getToolImplementations(): CommandMap {
    return { ...this.toolImplementations };
  }

  /**
   * Executes a tool directly by name with arguments
   * @param name - Name of the tool to execute
   * @param args - Arguments to pass to the tool
   * @returns Promise resolving to the tool execution result
   *
   * @example
   * ```typescript
   * const result = await toolExecutor.executeTool('read_file', { path: './example.txt' });
   * ```
   */
  public async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    this.logger.debug(`Executing tool: ${name}`);

    // Check if the tool exists in our implementations
    if (!this.toolImplementations[name]) {
      this.logger.error(`Tool not found: ${name}`);
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      // Get the tool implementation
      const toolFunction = this.toolImplementations[name];

      // Execute the tool with timeout
      const output = await this.executeWithTimeout(
        () => toolFunction(args),
        this.config.toolTimeoutMs!
      );

      this.logger.debug(`Tool ${name} executed successfully`);

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error executing tool ${name}: ${errorMessage}`);
      throw error;
    }
  }

  public getAllTools() {
    return this.toolRegistry.getAllTools();
  }

}
