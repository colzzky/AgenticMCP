/**
 * @file Factory for creating RoleModelConfigManager instances
 */
import path from 'node:path';
import { DIContainer } from '../../../core/di/container';
import { RoleModelConfigManager } from './roleModelConfigManager.js';
import { DI_TOKENS } from '../../../core/di/tokens';
import type { PathDI, FileSystemDI } from '../../../types/global.types.js';
import { Logger } from '../../../core/types/logger.types.js';

/**
 * Creates a RoleModelConfigManager with dependencies from the DI container
 * @param configPath Optional path to a custom configuration file
 * @param container DI container to resolve dependencies from
 * @returns A new RoleModelConfigManager instance
 */
export function createRoleModelConfigManager(
  configPath?: string,
  container: DIContainer = DIContainer.getInstance()
): RoleModelConfigManager {
  // Resolve dependencies from the container
  const pathDI = container.get<PathDI>(DI_TOKENS.PATH_DI);
  const fileSystemDI = container.get<FileSystemDI>(DI_TOKENS.FILE_SYSTEM_DI);
  const logger = container.get<Logger>(DI_TOKENS.LOGGER);
  
  // Create and return the manager
  return new RoleModelConfigManager({
    configPath,
    fileSystemDI,
    pathDI,
    logger
  });
}

/**
 * Gets the default RoleModelConfigManager instance, using config from environment variable
 * @param container DI container to resolve dependencies from
 * @returns A RoleModelConfigManager instance
 */
export function getDefaultRoleModelConfigManager(
  container: DIContainer = DIContainer.getInstance()
): RoleModelConfigManager {
  // Check for a configuration path in the environment variables
  const configPath = process.env.AGENTICMCP_ROLE_MODEL_CONFIG;
  
  // Create and return the manager with the config path if available
  return createRoleModelConfigManager(configPath, container);
}