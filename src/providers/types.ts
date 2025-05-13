import type { ProviderType, LLMProvider } from '../core/types/provider.types';
import type { ProviderSpecificConfig } from '../core/types/config.types';
import type { ToolRegistry } from '../tools/toolRegistry';
import type { Logger } from '../core/types/logger.types';
import type { ProviderFactory } from './providerFactory';

export type ProviderFactoryType = typeof ProviderFactory;
export type ProviderFactoryInstance = InstanceType<typeof ProviderFactory>;

/**
 * Interface for provider factory implementations
 */
export interface ProviderFactoryInterface {
  /**
   * Registers a provider implementation with the factory.
   * @param type - The provider type identifier
   * @param providerClass - The provider class constructor
   */
  registerProvider(type: ProviderType, providerClass: new (...args: any[]) => LLMProvider): void;
  
  /**
   * Creates or returns an instance of a provider by type and optional instance name.
   * @param type - The provider type
   * @param instanceName - Optional instance name for multiple instances
   * @returns The provider instance
   */
  getProvider(type: ProviderType, instanceName?: string): LLMProvider;
  
  /**
   * Configures a provider instance with the given configuration.
   * @param type - The provider type
   * @param config - The configuration object
   * @param instanceName - Optional instance name
   * @returns The configured provider instance
   */
  configureProvider(type: ProviderType, config: ProviderSpecificConfig, instanceName?: string): Promise<LLMProvider>;
  
  /**
   * Checks if a provider type is registered.
   * @param type - The provider type to check
   * @returns True if the provider type is registered
   */
  hasProviderType(type: ProviderType): boolean;
  
  /**
   * Gets an array of all registered provider types.
   * @returns Array of provider types
   */
  getRegisteredProviderTypes(): ProviderType[];
  
  /**
   * Clears all cached provider instances.
   */
  clearInstances(): void;
  
  /**
   * Sets the tool registry to be used by providers.
   * @param toolRegistry - The tool registry to use
   */
  setToolRegistry(toolRegistry: ToolRegistry): void;
  
  /**
   * Gets the tool registry if set.
   * @returns The tool registry or undefined if not set
   */
  getToolRegistry(): ToolRegistry | undefined;
}

/**
 * Interface for provider initializer implementations
 */
export interface ProviderInitializerInterface {
  /**
   * Gets the initialized provider factory.
   * @returns The provider factory instance
   */
  getFactory(): ProviderFactoryInterface;
  
  /**
   * Gets a provider instance by type.
   * This is a convenience method that delegates to the factory.
   * 
   * @param type - The provider type to get
   * @param instanceName - Optional instance name for multiple instances
   * @returns The provider instance
   */
  getProvider(type: ProviderType, instanceName?: string): LLMProvider;
}