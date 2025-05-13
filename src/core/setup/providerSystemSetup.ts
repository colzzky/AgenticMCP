import { ConfigManager } from '../config/configManager';
import { ProviderInitializer } from '../../providers/providerInitializer';
import { ToolRegistry } from '../../tools/toolRegistry';
import { AppConfig } from '../../config/appConfig';
import type { Logger } from '../types/logger.types';
import type { PathDI, FileSystemDI } from '../../global.types';
import type { ProviderFactoryInstance } from '../../providers/types';

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
  appConfig: AppConfig
): {
  configManager: InstanceType<typeof ConfigManager>,
  providerInitializer: InstanceType<typeof ProviderInitializer>,
  providerFactory: ProviderFactoryInstance
} {
  loggerTool.info('Initializing provider system');
  const configManagerInstance = new configManager(appConfig.appName, pathDi, fsDi);
  const providerInitializerInstance = new providerInitializer(configManagerInstance);
  const providerFactoryInstance = providerInitializerInstance.getFactory();

  // Connect provider factory with tool registry
  providerFactoryInstance.setToolRegistry(toolRegistryInstance);
  loggerTool.info('Connected tool registry with provider factory');

  return {
    configManager: configManagerInstance,
    providerInitializer: providerInitializerInstance,
    providerFactory: providerFactoryInstance
  };
}
