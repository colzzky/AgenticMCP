/**
 * @file Factory for creating RoleModelConfigManager instances
 */
import path from 'node:path';
import { RoleModelConfigManager } from './roleModelConfigManager';
import { logger } from '../../../core/utils/logger';
import fs from 'node:fs/promises';

/**
 * Creates a RoleModelConfigManager with dependencies from the DI container
 * @param configPath Optional path to a custom configuration file
 * @returns A new RoleModelConfigManager instance
 */
export function createRoleModelConfigManager(
  configPath?: string,
): RoleModelConfigManager {
  // Create and return the manager
  return new RoleModelConfigManager({
    configPath,
    fileSystemDI: fs,
    pathDI: path,
    logger: logger
  });
}

/**
 * Gets the default RoleModelConfigManager instance, using config from environment variable
 * @returns A RoleModelConfigManager instance
 */
export function getDefaultRoleModelConfigManager(): RoleModelConfigManager {
  // Check for a configuration path in the environment variables
  const configPath = process.env.AGENTICMCP_ROLE_MODEL_CONFIG;
  
  // Create and return the manager with the config path if available
  return createRoleModelConfigManager(configPath);
}