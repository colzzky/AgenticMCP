import type { LLMProvider, ProviderType } from '../core/types/provider.types';
import type { ProviderSpecificConfig } from '../core/types/config.types';
import type { ConfigManager } from '../core/config/configManager';
import type { ToolRegistry } from '../tools/toolRegistry';
import type { Logger } from '../core/types/logger.types';
import type { ProviderFactoryInterface } from './types';

/**
 * Factory for creating and managing LLM providers.
 * Uses abstract factory pattern to create provider instances.
 * Implements dependency injection pattern for better testability.
 */
export class ProviderFactory implements ProviderFactoryInterface {
  private providerMap: Map<string, new (...args: any[]) => LLMProvider> = new Map();
  private instanceMap: Map<string, LLMProvider> = new Map();
  private configManager: ConfigManager;
  private toolRegistry?: ToolRegistry;
  private logger: Logger;

  /**
   * Creates a new ProviderFactory.
   * @param configManager - The configuration manager to use for provider setup
   * @param logger - The logger implementation to use
   */
  constructor(configManager: ConfigManager, logger: Logger) {
    this.configManager = configManager;
    this.logger = logger;
  }

  /**
   * Registers a provider implementation with the factory.
   * @param type - The provider type identifier
   * @param providerClass - The provider class constructor
   */
  registerProvider(type: ProviderType, providerClass: new (...args: any[]) => LLMProvider): void {
    this.providerMap.set(type, providerClass);
    this.logger.debug(`Registered provider: ${type}`);
  }

  /**
   * Creates or returns an instance of a provider by type and optional instance name.
   * @param type - The provider type
   * @param instanceName - Optional instance name for multiple instances of the same provider type
   * @returns The provider instance
   * @throws Error if the provider type is not registered
   */
  getProvider(type: ProviderType, instanceName = 'default'): LLMProvider {
    const cacheKey = `${type}:${instanceName}`;
    
    // Return cached instance if available
    if (this.instanceMap.has(cacheKey)) {
      return this.instanceMap.get(cacheKey)!;
    }
    
    // Get provider class constructor
    const ProviderClass = this.providerMap.get(type);
    if (!ProviderClass) {
      throw new Error(`Provider type not registered: ${type}`);
    }
    
    // Create a new instance with dependencies injected
    try {
      // Inject necessary dependencies
      // Note: We're passing the logger as a dependency to the provider
      const instance = new ProviderClass(this.configManager, this.logger);
      
      // Inject the tool registry if available
      if (this.toolRegistry && typeof instance.setToolRegistry === 'function') {
        instance.setToolRegistry(this.toolRegistry);
      }
      
      // Cache the instance
      this.instanceMap.set(cacheKey, instance);
      this.logger.debug(`Created provider instance: ${type} (${instanceName})`);
      
      return instance;
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : String(error_);
      this.logger.error(`Error creating provider ${type} (${instanceName}): ${message}`);
      throw error_;
    }
  }

  /**
   * Configures a provider instance with the given configuration.
   * @param type - The provider type
   * @param config - The configuration object
   * @param instanceName - Optional instance name
   * @returns The configured provider instance
   */
  async configureProvider(
    type: ProviderType, 
    config: ProviderSpecificConfig, 
    instanceName = 'default'
  ): Promise<LLMProvider> {
    const provider = this.getProvider(type, instanceName);
    
    try {
      await provider.configure({
        ...config,
        instanceName,
        providerType: type
      });
      this.logger.info(`Configured provider: ${type} (${instanceName})`);
      return provider;
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : String(error_);
      this.logger.error(`Error configuring provider ${type} (${instanceName}): ${message}`);
      throw error_;
    }
  }

  /**
   * Checks if a provider type is registered.
   * @param type - The provider type to check
   * @returns True if the provider type is registered
   */
  hasProviderType(type: ProviderType): boolean {
    return this.providerMap.has(type);
  }

  /**
   * Gets an array of all registered provider types.
   * @returns Array of provider types
   */
  getRegisteredProviderTypes(): ProviderType[] {
    return [...this.providerMap.keys()] as ProviderType[];
  }

  /**
   * Clears all cached provider instances.
   * Useful for testing or when reconfiguring the system.
   */
  clearInstances(): void {
    this.instanceMap.clear();
    this.logger.info('Cleared all provider instances');
  }

  /**
   * Sets the tool registry to be used by providers.
   * @param toolRegistry - The tool registry to use
   */
  setToolRegistry(toolRegistry: ToolRegistry): void {
    this.toolRegistry = toolRegistry;
    
    // Update existing provider instances
    for (const [key, instance] of this.instanceMap.entries()) {
      if (typeof instance.setToolRegistry === 'function') {
        instance.setToolRegistry(toolRegistry);
      }
    }
    
    this.logger.debug('Set tool registry for provider factory');
  }

  /**
   * Gets the tool registry if set.
   * @returns The tool registry or undefined if not set
   */
  getToolRegistry(): ToolRegistry | undefined {
    return this.toolRegistry;
  }
}