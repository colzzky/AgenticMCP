import { OpenAIProvider } from '../openai/openaiProvider';
import { ConfigManager } from '../../core/config/configManager';
import { OpenAIProviderSpecificConfig } from '../../core/types/config.types';

export class GrokProvider extends OpenAIProvider {
  constructor(configManager: ConfigManager) {
    super(configManager);
  }

  get name(): string {
    return 'grok';
  }

  async configure(config: OpenAIProviderSpecificConfig): Promise<void> {
    // Default to Grok endpoint if not provided
    config.baseURL = config.baseURL || 'https://api.x.ai/v1';
    await super.configure(config);
  }
}
