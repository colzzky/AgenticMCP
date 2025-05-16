/**
 * @file Factory for creating UnifiedShellCliTool instances with dependency injection
 */
import { DIContainer } from '../../core/di/container.js';
import { DI_TOKENS } from '../../core/di/tokens.js';
import { Logger } from '../../core/types/logger.types.js';
import { ShellCommandWrapper } from '../../types/shell.types.js';
import { UnifiedShellCliTool, UnifiedShellCliToolConfig } from '../unifiedShellCliTool.js';

/**
 * Creates a new UnifiedShellCliTool instance with dependencies from the DI container
 * @param config Configuration for the UnifiedShellCliTool
 * @param container DI container to get dependencies from
 * @returns A new UnifiedShellCliTool instance
 */
export function createUnifiedShellCliTool(
  config: UnifiedShellCliToolConfig,
  container: DIContainer = DIContainer.getInstance()
): UnifiedShellCliTool {
  const logger = container.get(DI_TOKENS.LOGGER) as Logger;
  const shellWrapper = container.getSingleton(DI_TOKENS.SHELL_COMMAND_WRAPPER) as ShellCommandWrapper;
  
  return new UnifiedShellCliTool(config, shellWrapper, logger);
}