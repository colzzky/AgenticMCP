import type { ConfigManager } from '../core/config/configManager';
import type { ProviderType, LLMProvider } from '../core/types/provider.types';
import type { Logger } from '../core/types/logger.types';
import type { ProviderFactoryInterface, ProviderInitializerInterface } from './types';

/**
 * Initializes the provider factory with all available provider implementations.
 * This serves as the central point for provider registration and configuration.
 * 
 * Uses dependency injection pattern for better testability.
 */
export class ProviderInitializer implements ProviderInitializerInterface {
  private factory: ProviderFactoryInterface;
  private logger: Logger;
  
  /**
   * Create a new ProviderInitializer.
   * @param factory - The provider factory instance
   * @param logger - The logger implementation to use
   * @param providerClasses - Map of provider types to provider class constructors
   */
  constructor(
    factory: ProviderFactoryInterface,
    logger: Logger,
    providerClasses?: Map<ProviderType, new (...args: any[]) => LLMProvider>
  ) {
    this.factory = factory;
    this.logger = logger;
    
    // Register provider classes if provided
    if (providerClasses && providerClasses.size > 0) {
      this.registerProviders(providerClasses);
    }
  }
  
  /**
   * Registers provider implementations with the factory.
   * @param providerClasses - Map of provider types to provider class constructors
   */
  private registerProviders(providerClasses: Map<ProviderType, new (...args: any[]) => LLMProvider>): void {
    // Register each provider from the map
    for (const [type, providerClass] of providerClasses.entries()) {
      this.factory.registerProvider(type, providerClass);
    }
    
    this.logger.debug(`Registered providers: ${this.factory.getRegisteredProviderTypes().join(', ')}`);
  }
  
  /**
   * Gets the initialized provider factory.
   * @returns The provider factory instance
   */
  getFactory(): ProviderFactoryInterface {
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
  getProvider(type: ProviderType, instanceName = 'default'): LLMProvider {
    return this.factory.getProvider(type, instanceName);
  }
}