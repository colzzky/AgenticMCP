import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import type { ConfigManager } from '../core/config/configManager';
import type { Logger } from '../core/types/logger.types';
import type { ProviderType, LLMProvider } from '../core/types/provider.types';
import type { ProviderFactoryInterface, ProviderInitializerInterface } from './types';
import { ProviderFactory } from './providerFactory';
import { ProviderInitializer } from './providerInitializer';

/**
 * Type-safe provider class map
 * This ensures all provider classes properly implement LLMProvider
 */
type ProviderClass = new (configManager: ConfigManager, logger: Logger, ...args: any[]) => LLMProvider;

/**
 * Creates and configures the provider module with dependency injection.
 * 
 * This factory function creates the provider factory and initializer with proper
 * dependency injection, making it easy to set up the provider system.
 * 
 * @param configManager - Configuration manager for provider setup
 * @param logger - Logger implementation
 * @returns The provider factory and initializer
 */
export function createProviderModule(
  configManager: ConfigManager,
  logger: Logger
): { 
  factory: ProviderFactoryInterface, 
  initializer: ProviderInitializerInterface 
} {
  // Create provider class map with standard providers
  const providerClasses = new Map<ProviderType, ProviderClass>();
  
  // Add the built-in providers - they all implement LLMProvider
  providerClasses.set('openai', OpenAIProvider as unknown as ProviderClass);
  providerClasses.set('anthropic', AnthropicProvider as unknown as ProviderClass);
  providerClasses.set('google', GoogleProvider as unknown as ProviderClass);
  
  // Create factory with injected dependencies
  const factory = new ProviderFactory(configManager, logger);
  
  // Create initializer with injected dependencies
  const initializer = new ProviderInitializer(factory, logger, providerClasses);
  
  return { factory, initializer };
}

/**
 * Registers additional provider implementations with an existing provider factory.
 * 
 * @param factory - The provider factory to register with
 * @param providerMap - Map of provider types to provider class constructors
 * @param logger - Logger implementation
 */
export function registerAdditionalProviders(
  factory: ProviderFactoryInterface,
  providerMap: Map<ProviderType, ProviderClass>,
  logger: Logger
): void {
  for (const [type, providerClass] of providerMap.entries()) {
    factory.registerProvider(type, providerClass);
  }
  
  logger.info(`Registered additional providers: ${Array.from(providerMap.keys()).join(', ')}`);
}