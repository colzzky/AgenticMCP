import { ConfigManager } from '../config/configManager';
import { ProviderInitializer } from '../../providers/providerInitializer';
import { ProviderFactory } from '../../providers/providerFactory';
import { ToolRegistry } from '../../tools/toolRegistry';
import { AppConfig } from '../../config/appConfig';
import type { Logger } from '../types/logger.types';
import type { PathDI, FileSystemDI } from '../../types/global.types';
import type { ProviderFactoryInterface } from '../../providers/types';

/**
 * Sets up the provider system with config manager and provider factory
 */
export function setupProviderSystem(
  configManager: typeof ConfigManager,
  providerInitializer: typeof ProviderInitializer,
  toolRegistryInstance: ToolRegistry,
  loggerTool: Logger,
  pathDi: PathDI,
  fsDi: FileSystemDI,
  appConfig: AppConfig,
  factory: typeof ProviderFactory
): {
  configManager: InstanceType<typeof ConfigManager>,
  providerInitializer: InstanceType<typeof ProviderInitializer>,
  providerFactory: ProviderFactoryInterface
} {
  loggerTool.info('Initializing provider system');
  
  // Initialize config manager
  const configManagerInstance = new configManager(appConfig.appName, pathDi, fsDi);
  
  // Create provider factory and pass the required dependencies
  const providerFactory = new factory(configManagerInstance, loggerTool);

  // Initialize provider system with dependency injection
  const providerInitializerInstance = new providerInitializer(
    providerFactory, 
    loggerTool
  );
  
  // Connect provider factory with tool registry
  providerFactory.setToolRegistry(toolRegistryInstance);
  loggerTool.info('Connected tool registry with provider factory');

  return {
    configManager: configManagerInstance,
    providerInitializer: providerInitializerInstance,
    providerFactory
  };
}