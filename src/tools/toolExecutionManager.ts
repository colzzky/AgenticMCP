/**
 * @file Tool Execution Manager
 * Manages the execution of tool calls from LLMs
 */

import type { 
  LLMProvider, 
  ToolCall, 
  ToolCallOutput, 
  ProviderType,
  ProviderRequest,
  ProviderResponse,
  Message
} from '../core/types/provider.types';
import type { Logger } from '../core/types/logger.types';
import { ToolRegistry } from './toolRegistry';

/**
 * Configuration for the ToolExecutionManager
 */
export interface ToolExecutionManagerConfig {
  /** Maximum time in milliseconds to wait for a tool to execute before timing out */
  toolTimeoutMs?: number;
  /** Maximum number of retries for failed tool executions */
  maxRetries?: number;
  /** Whether to execute multiple tool calls in parallel (when supported) */
  parallelExecution?: boolean;
}

/**
 * Default configuration for the ToolExecutionManager
 */
const DEFAULT_CONFIG: ToolExecutionManagerConfig = {
  toolTimeoutMs: 30000, // 30 seconds
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
 * ToolExecutionManager class for managing the execution of tool calls
 */
export class ToolExecutionManager {
  private config: ToolExecutionManagerConfig;
  private logger: Logger;
  private toolRegistry: ToolRegistry;
  private toolImplementations: Record<string, Function>;

  /**
   * Creates a new ToolExecutionManager instance
   * @param toolRegistry - Registry containing tool definitions
   * @param toolImplementations - Map of tool names to their implementation functions
   * @param logger - Logger instance
   * @param config - Configuration options
   */
  constructor(
    toolRegistry: ToolRegistry,
    toolImplementations: Record<string, Function>,
    logger: Logger,
    config: Partial<ToolExecutionManagerConfig> = {}
  ) {
    this.toolRegistry = toolRegistry;
    this.toolImplementations = toolImplementations;
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.logger.debug('ToolExecutionManager initialized with config:', JSON.stringify(this.config));
  }

  /**
   * Executes a single tool call
   * @param toolCall - The tool call to execute
   * @returns Promise resolving to the execution result
   */
  public async executeToolCall(toolCall: ToolCall): Promise<ToolExecutionResult> {
    const { id, name, arguments: argsStr } = toolCall;
    
    this.logger.debug(`Executing tool call: ${name} (ID: ${id})`);
    
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
   * Registers a tool implementation
   * @param name - Name of the tool
   * @param implementation - Function implementing the tool
   * @returns True if registration was successful, false if a tool with the same name already exists
   */
  public registerToolImplementation(name: string, implementation: Function): boolean {
    if (this.toolImplementations[name]) {
      this.logger.warn(`Tool implementation with name '${name}' already exists`);
      return false;
    }
    
    this.toolImplementations[name] = implementation;
    this.logger.debug(`Registered tool implementation: ${name}`);
    return true;
  }

  /**
   * Gets all registered tool implementations
   * @returns Record mapping tool names to their implementation functions
   */
  public getToolImplementations(): Record<string, Function> {
    return { ...this.toolImplementations };
  }

  /**
   * Processes a provider response with tool calls
   * @param provider - LLM provider instance
   * @param response - Provider response with tool calls
   * @param messages - Conversation messages
   * @returns Promise resolving to the final response after tool execution
   */
  public async processToolCalls(
    provider: LLMProvider,
    response: ProviderResponse,
    messages: Message[]
  ): Promise<ProviderResponse> {
    // If no tool calls in the response, return it as is
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response;
    }
    
    this.logger.debug(`Processing ${response.toolCalls.length} tool calls`);
    
    // Execute the tool calls
    const toolCallOutputs = await this.executeToolCalls(response.toolCalls);
    
    // Create updated messages array with tool results
    const updatedMessages = [...messages];
    
    // Add the assistant's response with tool calls
    updatedMessages.push({
      role: 'assistant',
      content: response.content || '',
      tool_calls: response.toolCalls,
    });
    
    // Add tool results
    for (const output of toolCallOutputs) {
      updatedMessages.push({
        role: 'tool',
        content: output.output,
        tool_call_id: output.call_id,
      });
    }
    
    // Get a new response from the provider with the tool results
    try {
      // Create a new request with the updated messages
      const newRequest: ProviderRequest = {
        messages: updatedMessages,
      };
      
      // Get a new response from the provider
      const newResponse = await provider.chat(newRequest);
      
      // If the new response has tool calls, process them recursively
      if (newResponse.toolCalls && newResponse.toolCalls.length > 0) {
        return this.processToolCalls(provider, newResponse, updatedMessages);
      }
      
      return newResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting response with tool results: ${errorMessage}`);
      
      // Return a response with the error
      return {
        success: false,
        content: `Error processing tool results: ${errorMessage}`,
        error: {
          message: errorMessage,
          code: 'tool_result_processing_error',
          details: error,
        },
      };
    }
  }
}
