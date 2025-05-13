import { OpenAIProvider } from '../openai/openaiProvider';
import type { ConfigManager } from '../../core/config/configManager';
import type { Logger } from '../../core/types/logger.types';
import type { OpenAIProviderSpecificConfig } from '../../core/types/config.types';

/**
 * GrokProvider extends OpenAIProvider to provide integration with the Grok/X AI API.
 * It is compatible with the OpenAI API format but uses a different base URL.
 */
export class GrokProvider extends OpenAIProvider {
  /**
   * Creates a new GrokProvider with dependency injection.
   * 
   * @param configManager - Configuration manager for API keys and settings
   * @param logger - Logger implementation
   */
  constructor(configManager: ConfigManager, logger: Logger) {
    super(configManager, logger);
  }

  get name(): string {
    return 'grok';
  }

  /**
   * Configures the Grok provider with default endpoint if not specified.
   * 
   * @param config - Provider configuration
   */
  async configure(config: OpenAIProviderSpecificConfig): Promise<void> {
    // Default to Grok endpoint if not provided
    config.baseURL = config.baseURL || 'https://api.x.ai/v1';
    await super.configure(config);
  }
}