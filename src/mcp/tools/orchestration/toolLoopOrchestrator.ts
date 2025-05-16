// Remove dependency on decorators since they're not available in this codebase
import { DI_TOKENS } from '../../../core/di/tokens';
import { Logger } from '../../../core/types/logger.types';
import { 
  LLMProvider, 
  ProviderRequest, 
  ProviderResponse, 
  RecursiveToolLoopOptions,
  ToolCallOutput,
  ToolResultsRequest
} from '../../../core/types/provider.types';
import { ToolExecutor } from '../../../tools/toolExecutor';

/**
 * Extended options for orchestrating the tool loop
 */
export interface ToolLoopOrchestratorOptions extends RecursiveToolLoopOptions {
  /**
   * Function to be called when a tool is about to be executed
   */
  onToolExecution?: (toolName: string, args: any) => void;
  
  /**
   * Function to be called when a tool execution is completed
   */
  onToolResult?: (toolName: string, result: any) => void;
  
  /**
   * Whether to throw an error if maximum iterations are reached
   * @default true
   */
  throwOnMaxIterations?: boolean;
  
  /**
   * Whether to add specific state trace information to provider responses
   * @default false
   */
  includeTraceInfo?: boolean;
}

/**
 * Service responsible for orchestrating the LLM -> Tool -> LLM execution loop
 */
export class ToolLoopOrchestrator {
  private logger: Logger;
  private toolExecutor: ToolExecutor;

  constructor(logger: Logger, toolExecutor: ToolExecutor) {
    this.logger = logger;
    this.toolExecutor = toolExecutor;
  }

  /**
   * Orchestrates the complete flow of:
   * 1. Sending a request to the LLM
   * 2. Getting a response potentially containing tool calls
   * 3. Executing those tool calls
   * 4. Feeding results back to the LLM
   * 5. Repeating until no more tool calls are made
   * 
   * @param provider - The LLM provider to use
   * @param request - The initial request to send to the provider
   * @param options - Options for the orchestration process
   * @returns A promise that resolves to the final provider response with no more tool calls
   */
  public async orchestrate(
    provider: LLMProvider,
    request: ProviderRequest,
    options: ToolLoopOrchestratorOptions = {}
  ): Promise<ProviderResponse> {
    // Check if the provider has its own implementation
    if (provider.orchestrateToolLoop) {
      this.logger.debug('Using provider-specific tool loop orchestration');
      return provider.orchestrateToolLoop(request, this.toolExecutor, options);
    }
    
    // Default implementation for providers that don't implement orchestrateToolLoop
    this.logger.debug('Using default tool loop orchestration');
    
    // Set default options
    const maxIterations = options.maxIterations || 10;
    const verbose = options.verbose || false;
    const onProgress = options.onProgress || (() => {});
    const throwOnMaxIterations = options.throwOnMaxIterations !== false;
    const includeTraceInfo = options.includeTraceInfo || false;
    
    // Initialize tracking variables
    let currentRequest = { ...request };
    let currentMessages = [...(request.messages || [])];
    let iterations = 0;
    // Define the traceInfo interface for type safety
    interface TraceInfo {
      iterations: number;
      toolExecutions: Array<{
        iteration: number;
        tool: string;
        arguments: any;
        result?: any;
        error?: string;
      }>;
      maxIterationsReached?: boolean;
    }
    
    // Initialize trace info with proper typing
    let traceInfo: TraceInfo | undefined = includeTraceInfo 
      ? { iterations: 0, toolExecutions: [] } 
      : undefined;
    
    // Main recursive loop
    while (iterations < maxIterations) {
      iterations++;
      
      if (verbose) {
        this.logger.debug(`Tool loop iteration ${iterations}/${maxIterations}`);
      }
      
      // 1. Send request to LLM
      const response = iterations === 1 
        ? await provider.chat(currentRequest) 
        : await provider.generateTextWithToolResults(currentRequest as ToolResultsRequest);
      
      // Report progress if callback is provided
      onProgress(iterations, response);
      
      // Update trace info if enabled
      if (traceInfo) {
        traceInfo.iterations = iterations;
      }
      
      // 2. Check for tool calls
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // No more tool calls, we have our final response
        if (verbose) {
          this.logger.debug(`Tool loop completed after ${iterations} iterations`);
        }
        
        // Add trace info if enabled
        if (includeTraceInfo && traceInfo) {
          response.traceInfo = traceInfo;
        }
        
        return response;
      }
      
      if (verbose) {
        this.logger.debug(`Got ${response.toolCalls.length} tool calls, executing...`);
      }
      
      // 3. Execute tool calls and collect results
      const toolResults: ToolCallOutput[] = [];
      for (const toolCall of response.toolCalls) {
        try {
          // Notify before tool execution if callback provided
          if (options.onToolExecution) {
            const args = JSON.parse(toolCall.arguments);
            options.onToolExecution(toolCall.name, args);
          }
          
          // Execute the tool
          const output = await this.toolExecutor.executeTool(
            toolCall.name, 
            JSON.parse(toolCall.arguments)
          );
          
          // Record the result
          toolResults.push({
            type: 'function_call_output',
            call_id: toolCall.id,
            output: typeof output === 'string' ? output : JSON.stringify(output)
          });
          
          // Update trace info if enabled
          if (traceInfo) {
            traceInfo.toolExecutions.push({
              iteration: iterations,
              tool: toolCall.name,
              arguments: JSON.parse(toolCall.arguments),
              result: output,
              error: undefined
            });
          }
          
          // Notify after tool execution if callback provided
          if (options.onToolResult) {
            options.onToolResult(toolCall.name, output);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error executing tool ${toolCall.name}: ${errorMessage}`);
          
          // Still add result but with error
          toolResults.push({
            type: 'function_call_output',
            call_id: toolCall.id,
            output: `Error: ${errorMessage}`
          });
          
          // Update trace info if enabled
          if (traceInfo) {
            traceInfo.toolExecutions.push({
              iteration: iterations,
              tool: toolCall.name,
              arguments: JSON.parse(toolCall.arguments),
              result: undefined,
              error: errorMessage
            });
          }
          
          // Notify after tool execution if callback provided
          if (options.onToolResult) {
            options.onToolResult(toolCall.name, { error: errorMessage });
          }
        }
      }
      
      // 4. Prepare request for next iteration with tool results
      currentMessages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.toolCalls
      });
      
      // 5. Update current request for next iteration
      currentRequest = {
        messages: currentMessages,
        tool_outputs: toolResults,
        model: request.model,
        temperature: request.temperature
      };
    }
    
    // If we reached here, we've hit the maximum iterations
    this.logger.warn(`Reached maximum iterations (${maxIterations}) in tool calling loop`);
    
    if (throwOnMaxIterations) {
      throw new Error(`Reached maximum iterations (${maxIterations}) in tool calling loop`);
    }
    
    // Return last response with warning
    const lastResponse = await provider.generateTextWithToolResults(currentRequest as ToolResultsRequest);
    if (includeTraceInfo && traceInfo) {
      lastResponse.traceInfo = {
        ...traceInfo,
        maxIterationsReached: true
      };
    }
    
    // Mark that max iterations were reached
    lastResponse.maxIterationsReached = true;
    
    return lastResponse;
  }
}