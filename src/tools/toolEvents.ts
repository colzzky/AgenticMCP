/**
 * @file Tool Events System
 * Provides an event system for tool calls
 */

import type { ToolCall, ToolCallOutput } from '../core/types/provider.types';
import type { Logger } from '../core/types/logger.types';
import { ToolExecutionResult } from './toolExecutor';

/**
 * Types of tool events
 */
export enum ToolEventType {
  TOOL_CALL_RECEIVED = 'tool_call_received',
  TOOL_EXECUTION_STARTED = 'tool_execution_started',
  TOOL_EXECUTION_COMPLETED = 'tool_execution_completed',
  TOOL_EXECUTION_FAILED = 'tool_execution_failed',
  TOOL_RESULT_SENT = 'tool_result_sent',
}

/**
 * Base interface for tool events
 */
export interface ToolEvent {
  /** Type of the event */
  type: ToolEventType;
  /** Timestamp of the event */
  timestamp: number;
  /** Conversation ID (if available) */
  conversationId?: string;
}

/**
 * Event emitted when a tool call is received from an LLM
 */
export interface ToolCallReceivedEvent extends ToolEvent {
  type: ToolEventType.TOOL_CALL_RECEIVED;
  /** The tool call received */
  toolCall: ToolCall;
  /** The provider that generated the tool call */
  provider: string;
}

/**
 * Event emitted when tool execution starts
 */
export interface ToolExecutionStartedEvent extends ToolEvent {
  type: ToolEventType.TOOL_EXECUTION_STARTED;
  /** The tool call being executed */
  toolCall: ToolCall;
}

/**
 * Event emitted when tool execution completes successfully
 */
export interface ToolExecutionCompletedEvent extends ToolEvent {
  type: ToolEventType.TOOL_EXECUTION_COMPLETED;
  /** The tool call that was executed */
  toolCall: ToolCall;
  /** The result of the execution */
  result: ToolExecutionResult;
  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Event emitted when tool execution fails
 */
export interface ToolExecutionFailedEvent extends ToolEvent {
  type: ToolEventType.TOOL_EXECUTION_FAILED;
  /** The tool call that failed */
  toolCall: ToolCall;
  /** The error that occurred */
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Event emitted when tool results are sent back to an LLM
 */
export interface ToolResultSentEvent extends ToolEvent {
  type: ToolEventType.TOOL_RESULT_SENT;
  /** The tool call output sent */
  toolCallOutput: ToolCallOutput;
  /** The provider the result was sent to */
  provider: string;
}

/**
 * Union type of all tool events
 */
export type ToolEventUnion =
  | ToolCallReceivedEvent
  | ToolExecutionStartedEvent
  | ToolExecutionCompletedEvent
  | ToolExecutionFailedEvent
  | ToolResultSentEvent;

/**
 * Callback function for tool events
 */
export type ToolEventCallback = (event: ToolEventUnion) => void;

/**
 * Tool event emitter for publishing and subscribing to tool events
 */
export class ToolEventEmitter {
  private logger: Logger;
  private listeners: Map<ToolEventType, Set<ToolEventCallback>> = new Map();
  private globalListeners: Set<ToolEventCallback> = new Set();

  /**
   * Creates a new ToolEventEmitter instance
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
    this.logger.debug('ToolEventEmitter initialized');
  }

  /**
   * Subscribes to a specific event type
   * @param eventType - Type of event to subscribe to
   * @param callback - Callback function to call when the event occurs
   * @returns Function to unsubscribe from the event
   */
  public on(eventType: ToolEventType, callback: ToolEventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    this.logger.debug(`Subscribed to event: ${eventType}`);
    
    return () => {
      this.off(eventType, callback);
    };
  }

  /**
   * Subscribes to all event types
   * @param callback - Callback function to call when any event occurs
   * @returns Function to unsubscribe from all events
   */
  public onAny(callback: ToolEventCallback): () => void {
    this.globalListeners.add(callback);
    this.logger.debug('Subscribed to all events');
    
    return () => {
      this.offAny(callback);
    };
  }

  /**
   * Unsubscribes from a specific event type
   * @param eventType - Type of event to unsubscribe from
   * @param callback - Callback function to remove
   */
  public off(eventType: ToolEventType, callback: ToolEventCallback): void {
    if (!this.listeners.has(eventType)) {
      return;
    }
    
    this.listeners.get(eventType)!.delete(callback);
    this.logger.debug(`Unsubscribed from event: ${eventType}`);
  }

  /**
   * Unsubscribes from all event types
   * @param callback - Callback function to remove
   */
  public offAny(callback: ToolEventCallback): void {
    this.globalListeners.delete(callback);
    this.logger.debug('Unsubscribed from all events');
  }

  /**
   * Emits an event to all subscribers
   * @param event - The event to emit
   */
  public emit(event: ToolEventUnion): void {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    
    this.logger.debug(`Emitting event: ${event.type}`);
    
    // Notify type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (error) {
          this.logger.error(`Error in event listener for ${event.type}:`, error);
        }
      }
    }
    
    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error(`Error in global event listener:`, error);
      }
    }
  }

  /**
   * Creates a tool call received event
   * @param toolCall - The tool call received
   * @param provider - The provider that generated the tool call
   * @param conversationId - Conversation ID (if available)
   * @returns The created event
   */
  public createToolCallReceivedEvent(
    toolCall: ToolCall,
    provider: string,
    conversationId?: string
  ): ToolCallReceivedEvent {
    return {
      type: ToolEventType.TOOL_CALL_RECEIVED,
      timestamp: Date.now(),
      toolCall,
      provider,
      conversationId,
    };
  }

  /**
   * Creates a tool execution started event
   * @param toolCall - The tool call being executed
   * @param conversationId - Conversation ID (if available)
   * @returns The created event
   */
  public createToolExecutionStartedEvent(
    toolCall: ToolCall,
    conversationId?: string
  ): ToolExecutionStartedEvent {
    return {
      type: ToolEventType.TOOL_EXECUTION_STARTED,
      timestamp: Date.now(),
      toolCall,
      conversationId,
    };
  }

  /**
   * Creates a tool execution completed event
   * @param toolCall - The tool call that was executed
   * @param result - The result of the execution
   * @param durationMs - Execution duration in milliseconds
   * @param conversationId - Conversation ID (if available)
   * @returns The created event
   */
  public createToolExecutionCompletedEvent(
    toolCall: ToolCall,
    result: ToolExecutionResult,
    durationMs: number,
    conversationId?: string
  ): ToolExecutionCompletedEvent {
    return {
      type: ToolEventType.TOOL_EXECUTION_COMPLETED,
      timestamp: Date.now(),
      toolCall,
      result,
      durationMs,
      conversationId,
    };
  }

  /**
   * Creates a tool execution failed event
   * @param toolCall - The tool call that failed
   * @param error - The error that occurred
   * @param durationMs - Execution duration in milliseconds
   * @param conversationId - Conversation ID (if available)
   * @returns The created event
   */
  public createToolExecutionFailedEvent(
    toolCall: ToolCall,
    error: { message: string; code?: string; details?: unknown },
    durationMs: number,
    conversationId?: string
  ): ToolExecutionFailedEvent {
    return {
      type: ToolEventType.TOOL_EXECUTION_FAILED,
      timestamp: Date.now(),
      toolCall,
      error,
      durationMs,
      conversationId,
    };
  }

  /**
   * Creates a tool result sent event
   * @param toolCallOutput - The tool call output sent
   * @param provider - The provider the result was sent to
   * @param conversationId - Conversation ID (if available)
   * @returns The created event
   */
  public createToolResultSentEvent(
    toolCallOutput: ToolCallOutput,
    provider: string,
    conversationId?: string
  ): ToolResultSentEvent {
    return {
      type: ToolEventType.TOOL_RESULT_SENT,
      timestamp: Date.now(),
      toolCallOutput,
      provider,
      conversationId,
    };
  }
}
