/**
 * @file Conversation Manager
 * Manages the conversation flow between user, LLM, and tools
 */

import type { 
  LLMProvider, 
  Message, 
  ToolCall, 
  ToolCallOutput,
  ProviderType
} from '../core/types/provider.types';
import type { Logger } from '../core/types/logger.types';
import { ToolExecutor } from '../tools/toolExecutor';
import { ToolResultFormatter } from '../tools/toolResultFormatter';

/**
 * Configuration for the ConversationManager
 */
export interface ConversationManagerConfig {
  /** Maximum number of conversation turns */
  maxTurns?: number;
  /** Whether to automatically execute tool calls */
  autoExecuteTools?: boolean;
  /** Maximum time in milliseconds to wait for LLM response */
  llmTimeoutMs?: number;
}

/**
 * Default configuration for the ConversationManager
 */
const DEFAULT_CONFIG: ConversationManagerConfig = {
  maxTurns: 10,
  autoExecuteTools: true,
  llmTimeoutMs: 60_000, // 60 seconds
};

/**
 * Result of a conversation turn
 */
export interface ConversationTurnResult {
  /** The response from the LLM */
  response: string;
  /** Tool calls detected in the response (if any) */
  toolCalls?: ToolCall[];
  /** Tool call outputs (if tools were executed) */
  toolCallOutputs?: ToolCallOutput[];
  /** Whether the conversation should continue */
  shouldContinue: boolean;
}

/**
 * ConversationManager class for managing conversations with LLMs and tools
 */
export class ConversationManager {
  private config: ConversationManagerConfig;
  private logger: Logger;
  private toolExecutor: ToolExecutor;
  private toolResultFormatter: ToolResultFormatter;
  private conversationHistory: Message[] = [];
  private currentTurn = 0;

  /**
   * Creates a new ConversationManager instance
   * @param toolExecutor - Tool executor instance
   * @param toolResultFormatter - Tool result formatter instance
   * @param logger - Logger instance
   * @param config - Configuration options
   */
  constructor(
    toolExecutor: ToolExecutor,
    toolResultFormatter: ToolResultFormatter,
    logger: Logger,
    config: Partial<ConversationManagerConfig> = {}
  ) {
    this.toolExecutor = toolExecutor;
    this.toolResultFormatter = toolResultFormatter;
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.logger.debug('ConversationManager initialized with config:', JSON.stringify(this.config));
  }

  /**
   * Starts a new conversation with an LLM
   * @param provider - LLM provider instance
   * @param initialMessages - Initial messages to start the conversation
   * @returns Promise resolving to the conversation result
   */
  public async startConversation(
    provider: LLMProvider,
    initialMessages: Message[]
  ): Promise<ConversationTurnResult> {
    this.logger.info('Starting new conversation');
    
    // Reset conversation state
    this.conversationHistory = [...initialMessages];
    this.currentTurn = 0;
    
    // Start the conversation loop
    return this.continueConversation(provider);
  }

  /**
   * Continues an existing conversation
   * @param provider - LLM provider instance
   * @param newMessages - New messages to add to the conversation (optional)
   * @returns Promise resolving to the conversation result
   */
  public async continueConversation(
    provider: LLMProvider,
    newMessages: Message[] = []
  ): Promise<ConversationTurnResult> {
    // Add new messages to history if provided
    if (newMessages.length > 0) {
      this.conversationHistory.push(...newMessages);
    }
    
    // Check if we've reached the maximum number of turns
    if (this.currentTurn >= this.config.maxTurns!) {
      this.logger.warn(`Reached maximum number of turns (${this.config.maxTurns})`);
      return {
        response: "I've reached my maximum number of conversation turns. Please start a new conversation.",
        shouldContinue: false,
      };
    }
    
    this.currentTurn++;
    this.logger.debug(`Starting conversation turn ${this.currentTurn}`);
    
    try {
      // Get response from LLM
      const llmResponse = await this.getLLMResponse(provider, this.conversationHistory);
      
      // Add LLM response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: llmResponse.content,
      });
      
      // Check for tool calls in the response
      const toolCalls = llmResponse.toolCalls;
      
      // If no tool calls or auto-execute is disabled, return the response
      if (!toolCalls || toolCalls.length === 0 || !this.config.autoExecuteTools) {
        return {
          response: llmResponse.content,
          toolCalls,
          shouldContinue: false,
        };
      }
      
      // Execute tool calls
      this.logger.debug(`Executing ${toolCalls.length} tool calls`);
      const toolCallOutputs = await this.toolExecutor.executeToolCalls(toolCalls);
      
      // Add tool call outputs to conversation history
      this.addToolCallOutputsToHistory(toolCallOutputs);
      
      // Continue the conversation with tool results
      const continuationResult = await this.continueWithToolResults(
        provider,
        toolCalls,
        toolCallOutputs
      );
      
      return {
        response: continuationResult.content,
        toolCalls,
        toolCallOutputs,
        shouldContinue: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in conversation turn ${this.currentTurn}: ${errorMessage}`);
      
      return {
        response: `I encountered an error: ${errorMessage}`,
        shouldContinue: false,
      };
    }
  }

  /**
   * Gets a response from the LLM
   * @param provider - LLM provider instance
   * @param messages - Messages to send to the LLM
   * @returns Promise resolving to the LLM response
   */
  private async getLLMResponse(
    provider: LLMProvider,
    messages: Message[]
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    this.logger.debug('Getting LLM response');
    
    try {
      // Get response from LLM with timeout
      const response = await this.executeWithTimeout(
        () => provider.generateText({ messages }),
        this.config.llmTimeoutMs!
      );
      
      // Extract content and tool calls from response
      const content = response.content || '';
      const toolCalls = response.toolCalls;
      
      this.logger.debug(`Received LLM response${toolCalls ? ` with ${toolCalls.length} tool calls` : ''}`);
      
      return { content, toolCalls };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting LLM response: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Continues the conversation with tool results
   * @param provider - LLM provider instance
   * @param toolCalls - Tool calls that were executed
   * @param toolCallOutputs - Outputs from tool executions
   * @returns Promise resolving to the LLM response
   */
  private async continueWithToolResults(
    provider: LLMProvider,
    toolCalls: ToolCall[],
    toolCallOutputs: ToolCallOutput[]
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> {
    this.logger.debug('Continuing conversation with tool results');
    
    try {
      // Get response from LLM with tool results
      const response = await provider.generateTextWithToolResults({
        messages: this.conversationHistory,
        toolCalls,
        toolCallOutputs,
      });
      
      // Add LLM response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content || '',
      });
      
      // Extract content and tool calls from response
      const content = response.content || '';
      const newToolCalls = response.toolCalls;
      
      this.logger.debug(`Received LLM response with tool results${newToolCalls ? ` and ${newToolCalls.length} new tool calls` : ''}`);
      
      return { content, toolCalls: newToolCalls };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error continuing with tool results: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Adds tool call outputs to the conversation history
   * @param toolCallOutputs - Tool call outputs to add
   */
  private addToolCallOutputsToHistory(toolCallOutputs: ToolCallOutput[]): void {
    for (const output of toolCallOutputs) {
      this.conversationHistory.push({
        role: 'tool',
        content: output.output,
        tool_call_id: output.call_id,
      });
    }
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
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
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
   * Gets the current conversation history
   * @returns Array of messages in the conversation history
   */
  public getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Resets the conversation state
   */
  public resetConversation(): void {
    this.conversationHistory = [];
    this.currentTurn = 0;
    this.logger.debug('Conversation reset');
  }
}
