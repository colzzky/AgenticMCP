/**
 * @file Defines the TypeScript interfaces for the application configuration.
 */

/**
 * Represents non-sensitive configuration specific to an LLM provider.
 * API keys and other sensitive credentials will be handled by secure storage.
 */
export interface ProviderSpecificConfig {
  // Example: preferredModel?: string;
  [key: string]: any; // Allows for provider-specific settings
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

  // Future general CLI settings can be added here.
  // Example: logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
