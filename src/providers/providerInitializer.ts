import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { ProviderFactory } from './providerFactory';
import type { ConfigManager } from '../core/config/configManager';
import type { ProviderType } from '../core/types/provider.types';
import { info } from '../core/utils/logger';

/**
 * Initializes the provider factory with all available provider implementations.
 * This serves as the central point for provider registration and configuration.
 */
export class ProviderInitializer {
  private factory: ProviderFactory;
  
  /**
   * Create a new ProviderInitializer.
   * @param configManager - Configuration manager instance for provider setup
   */
  constructor(configManager: ConfigManager) {
    this.factory = new ProviderFactory(configManager);
    this.registerProviders();
  }
  
  /**
   * Registers all available provider implementations with the factory.
   */
  private registerProviders(): void {
    // Register available provider implementations
    this.factory.registerProvider('openai', OpenAIProvider);
    this.factory.registerProvider('anthropic', AnthropicProvider);
    this.factory.registerProvider('google', GoogleProvider);
    
    info(`Registered providers: ${this.factory.getRegisteredProviderTypes().join(', ')}`);
  }
  
  /**
   * Gets the initialized provider factory.
   * @returns The provider factory instance
   */
  getFactory(): ProviderFactory {
    return this.factory;
  }
  
  /**
   * Gets a provider instance by type.
   * This is a convenience method that delegates to the factory.
   * 
   * @param type - The provider type to get
   * @param instanceName - Optional instance name for multiple instances of the same provider type
   * @returns The provider instance
   */
  getProvider(type: ProviderType, instanceName = 'default') {
    return this.factory.getProvider(type, instanceName);
  }
}

export default ProviderInitializer;
