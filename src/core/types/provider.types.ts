// src/core/types/provider.types.ts

import { ProviderSpecificConfig } from './config.types';

/**
 * Defines the valid LLM provider types supported by the CLI.
 */
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'grok'; // Add more as supported

/**
 * Represents a tool parameter schema
 */
export interface ToolParameterProperty {
  type: string | string[];
  description?: string;
  enum?: string[];
  [key: string]: unknown;
}

/**
 * Represents a tool parameter schema
 */
export interface ToolParameterSchema {
  type: string;
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

/**
 * Represents a function/tool that can be called by a model
 */
export interface Tool {
  type: 'function';
  name: string;
  description?: string;
  parameters: ToolParameterSchema;
  strict?: boolean;
}

/**
 * Represents a tool call made by a model
 */
export interface ToolCall {
  id: string;
  call_id?: string;
  type: 'function_call';
  name: string;
  arguments: string;
}

/**
 * Represents a tool call response to be sent back to the model
 */
export interface ToolCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

/**
 * Represents a generic request to an LLM provider.
 * This will be specialized by specific request types (e.g., chat, completion).
 */
export interface ProviderRequest {
  prompt?: string; // For completion-style requests
  messages?: ChatMessage[] | Array<{ role: 'user' | 'assistant' | 'system'; content: string }>; // For chat-style requests
  model?: string; // Override provider's default model
  temperature?: number; // Sampling temperature (0-1)
  maxTokens?: number; // Max tokens to generate
  stopSequences?: string[]; // Sequences to stop generation at
  stream?: boolean; // Whether to stream the response
  tools?: Tool[]; // Tools (functions) the model can call
  tool_choice?: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } }; // Control when tools are called
  parallelToolCalls?: boolean; // Whether multiple tools can be called in parallel
  system?: string; // System message
  [key: string]: any; // Allow other provider-specific parameters
}

/**
 * Represents a generic response from an LLM provider.
 */
export interface ProviderResponse {
  success: boolean;
  content?: string; // Generated text content
  choices?: Array<{ text?: string; message?: { role: string; content: string } }>; // For multiple choices or detailed chat messages
  toolCalls?: ToolCall[]; // Tool calls requested by the model
  id?: string; // Optional ID of the response, e.g., from OpenAI
  model?: string; // Optional model used for the response
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call' | string; // Optional reason the model stopped generating tokens
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: {
    message: string;
    code?: string | number;
    details?: unknown;
  };
  rawResponse?: unknown; // The raw response object from the provider

  /**
   * Additional trace information for debugging and monitoring
   */
  traceInfo?: Record<string, any>;
  
  /**
   * Flag indicating whether maximum iterations were reached in a recursive tool loop
   */
  maxIterationsReached?: boolean;
}

/**
 * Defines the structure for a chat message, which includes the role and content.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[]; // Tool calls made by the assistant
  tool_call_id?: string; // For tool_call_output messages
  name?: string; // For tool_call_output messages (function name)
}

/**
 * Interface for the overall provider configuration, extending specific configurations.
 */
export interface ProviderConfig extends ProviderSpecificConfig {
  enabled?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Represents a tool results request
 */
export interface ToolResultsRequest extends ProviderRequest {
  tool_outputs?: ToolCallOutput[];
}

/**
 * Defines the core functionality that any LLM provider must implement.
 */
export interface LLMProvider {
  // Getter for the provider's name
  get name(): string;
  get defaultModel(): string;

  /**
   * Configures the provider with the given settings.
   * @param config - The configuration object for the provider.
   */
  configure(config: ProviderConfig): Promise<void> | void;

  /**
   * Sets the tool registry for the provider.
   * @param toolRegistry - The tool registry to use.
   */
  setToolRegistry?(toolRegistry: object): void;

  /**
   * Gets the available tools from the registry.
   * @returns The available tools.
   */
  getAvailableTools?(): Tool[];

  /**
   * Generates a text completion based on a prompt.
   * @param request - The request object containing the prompt and other parameters.
   * @returns A promise that resolves to the provider's response.
   */
  generateCompletion(request: ProviderRequest): Promise<ProviderResponse>;

  /**
   * Engages in a chat conversation.
   * @param request - The request object containing the chat messages and other parameters.
   * @returns A promise that resolves to the provider's response.
   */
  chat(request: ProviderRequest): Promise<ProviderResponse>;

  /**
   * Generates text with optional tools.
   * @param request - The request object containing messages and other parameters.
   * @returns A promise that resolves to the provider's response.
   */
  generateText(request: ProviderRequest): Promise<ProviderResponse>;

  /**
   * Continues a conversation with tool results.
   * @param request - The request object containing messages, tool calls, and tool outputs.
   * @returns A promise that resolves to the provider's response.
   */
  generateTextWithToolResults(request: ToolResultsRequest): Promise<ProviderResponse>;

}

/**
 * Options for the recursive tool loop execution
 */
export interface RecursiveToolLoopOptions {
  /** Maximum number of iterations to prevent infinite loops */
  maxIterations?: number;
  
  /** Callback function to report progress for each iteration */
  onProgress?: (iteration: number, response: ProviderResponse) => void;
  
  /** Whether to include verbose logging */
  verbose?: boolean;
}

// Future methods could include:
// generateEmbedding(text: string): Promise<EmbeddingResponse>;
// listModels(): Promise<ModelListResponse>;
