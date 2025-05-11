// src/core/types/provider.types.ts

import { ProviderSpecificConfig } from './config.types';

/**
 * Represents a generic request to an LLM provider.
 * This will be specialized by specific request types (e.g., chat, completion).
 */
export interface ProviderRequest {
  prompt?: string; // For completion-style requests
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>; // For chat-style requests
  model?: string; // Override provider's default model
  temperature?: number; // Sampling temperature (0-1)
  maxTokens?: number; // Max tokens to generate
  stopSequences?: string[]; // Sequences to stop generation at
  stream?: boolean; // Whether to stream the response
  [key: string]: unknown; // Allow other provider-specific parameters
}

/**
 * Represents a generic response from an LLM provider.
 */
export interface ProviderResponse {
  success: boolean;
  content?: string; // Generated text content
  choices?: Array<{ text?: string; message?: { role: string; content: string } }>; // For multiple choices or detailed chat messages
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
}

/**
 * Defines the core functionality that any LLM provider must implement.
 */
export interface LLMProvider {
  // Getter for the provider's name
  get name(): string;

  /**
   * Configures the provider with the given settings.
   * @param config - The configuration object for the provider.
   */
  configure(config: ProviderSpecificConfig): Promise<void> | void;

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

  // Future methods could include:
  // generateEmbedding(text: string): Promise<EmbeddingResponse>;
  // listModels(): Promise<ModelListResponse>;
}
