// Remove dependency on decorators since they're not available in this codebase
import { DI_TOKENS } from '../../../core/di/tokens';
import { Logger } from '../../../core/types/logger.types';
import {
  LLMProvider,
  ProviderRequest,
  ProviderResponse,
  RecursiveToolLoopOptions
} from '../../../core/types/provider.types';
import { ToolExecutor } from '../../../tools/toolExecutor';
import { orchestrateToolLoop } from '@/providers/providerUtils';

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
    this.logger.debug('Using provider-specific tool loop orchestration');
    return orchestrateToolLoop(provider, request, this.toolExecutor, this.logger, options);
  }
}