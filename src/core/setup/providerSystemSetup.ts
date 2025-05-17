import { ConfigManager } from '../config/configManager';
import { ProviderFactory } from '../../providers/providerFactory';
import { AppConfig } from '../../config/appConfig';
import type { Logger } from '../types/logger.types';
import type { PathDI, FileSystemDI } from '../../types/global.types';
import type { ProviderFactoryInterface } from '../../providers/types';
import { CredentialManager } from '../credentials';
import { OpenAIProvider } from '../../providers/openai/openaiProvider';
import { AnthropicProvider } from '../../providers/anthropic/anthropicProvider';
import { GoogleProvider } from '../../providers/google/googleProvider';
import { GrokProvider } from '../../providers/grok/grokProvider';
import { ToolExecutor } from '@/tools/toolExecutor';

export type SetupProviderSystemFn = (
  configManager: typeof ConfigManager,
  toolExecutor: InstanceType<typeof ToolExecutor>,
  loggerTool: Logger,
  pathDi: PathDI,
  fsDi: FileSystemDI,
  appConfig: AppConfig,
  factory: typeof ProviderFactory,
  credentialManagerInstance: InstanceType<typeof CredentialManager>
) => {
  configManager: InstanceType<typeof ConfigManager>,
  providerFactoryInstance: ProviderFactoryInterface
};

/**
 * Sets up the provider system with config manager and provider factory
 */
export const setupProviderSystem: SetupProviderSystemFn = (
  configManager: typeof ConfigManager,
  toolExecutor: InstanceType<typeof ToolExecutor>,
  loggerTool: Logger,
  pathDi: PathDI,
  fsDi: FileSystemDI,
  appConfig: AppConfig,
  factory: typeof ProviderFactory,
  credentialManagerInstance: InstanceType<typeof CredentialManager>
) => {
  loggerTool.debug('Initializing provider system');

  // Initialize config manager
  const configManagerInstance = new configManager(
    appConfig.appName,
    pathDi,
    fsDi,
    credentialManagerInstance,
    loggerTool
  );

  const providerFactory = new factory(configManagerInstance, loggerTool);

  // --- Register all providers here ---
  providerFactory.registerProvider('openai', OpenAIProvider);
  providerFactory.registerProvider('anthropic', AnthropicProvider);
  providerFactory.registerProvider('google', GoogleProvider);
  providerFactory.registerProvider('grok', GrokProvider);
  // --- End provider registration ---

  // Connect provider factory with tool registry
  providerFactory.setTools(toolExecutor);
  loggerTool.debug('Connected tool registry with provider factory');

  return {
    configManager: configManagerInstance,
    providerFactoryInstance: providerFactory
  };
}