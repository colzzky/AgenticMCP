/**
 * @file Defines the TypeScript interfaces for the application configuration.
 */

/**
 * Represents non-sensitive configuration specific to an LLM provider.
 * API keys and other sensitive credentials will be handled by secure storage.
 */
export interface ProviderSpecificConfig {
  providerType: string;      // e.g., 'openai', 'anthropic'. Crucial for identifying the provider class.
  instanceName?: string;     // Optional: for multiple accounts of the same type, used for credential lookup.
                           // If not provided, credential lookup might use a default or the main providerAlias key.
  // Example: preferredModel?: string;
  [key: string]: any;     // Allows for other provider-specific settings like defaultModel, temperature, etc.
}

/**
 * Represents OpenAI-specific configuration, extending the base ProviderSpecificConfig.
 */
export interface OpenAIProviderSpecificConfig extends ProviderSpecificConfig {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  model?: string; // Default model for this OpenAI instance
}

/**
 * Represents Anthropic-specific configuration, extending the base ProviderSpecificConfig.
 */
export interface AnthropicProviderSpecificConfig extends ProviderSpecificConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  // Add any other Anthropic/Claude-specific settings here
}

/**
 * Represents Google/Gemini-specific configuration, extending the base ProviderSpecificConfig.
 */
export interface GoogleProviderSpecificConfig extends ProviderSpecificConfig {
  apiKey?: string;
  model?: string; // Default model for this Google/Gemini instance, e.g., 'gemini-2.0-flash-001'
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  vertexAI?: boolean; // Whether to use Vertex AI instead of the Gemini Developer API
  vertexProject?: string; // Google Cloud project ID for Vertex AI
  vertexLocation?: string; // Google Cloud location for Vertex AI
  // Add any other Google/Gemini-specific settings here
}

/**
 * MCP Server configuration settings
 */
export interface McpServerConfig {
  /** Whether the MCP server is enabled */
  enabled?: boolean;
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Server description */
  description?: string;
  /** Tool adapter settings */
  tools?: {
    /** Prefix to add to tool names */
    namePrefix?: string;
  };
}

/**
 * Represents the overall application configuration structure.
 */
export interface AppConfig {
  /**
   * The identifier for the default LLM provider to be used if no specific provider is chosen.
   * (e.g., 'openai', 'anthropic')
   */
  defaultProvider?: string;

  /**
   * A map of configurations for different LLM providers.
   * The key is the provider's identifier (e.g., 'openai').
   */
  providers?: {
    [providerName: string]: ProviderSpecificConfig;
  };

  /**
   * MCP server configuration
   */
  mcp?: McpServerConfig;

  // Future general CLI settings can be added here.
  // Example: logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
