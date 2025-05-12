/**
 * @file Dependency injection registry
 * Provides functions to register all dependencies in the container
 */

import { DIContainer } from './container';
import { DI_TOKENS } from './tokens';
import { NodeFileSystem } from '../adapters/node-file-system.adapter';
import { IFileSystem } from '../interfaces/file-system.interface';
import { logger } from '../utils';
import type { Logger } from '../types/logger.types';
import { DIFilePathProcessor } from '../../context/di-file-path-processor';

/**
 * Register core dependencies
 * @param container - DI container instance
 */
export function registerCoreDependencies(container: DIContainer = DIContainer.getInstance()): void {
  // Register the logger
  container.register(DI_TOKENS.LOGGER, logger);
  
  // Register file system implementation
  container.registerSingleton(DI_TOKENS.FILE_SYSTEM, () => new NodeFileSystem());
}

/**
 * Register context processing dependencies
 * @param container - DI container instance
 */
export function registerContextDependencies(container: DIContainer = DIContainer.getInstance()): void {
  // Register file path processor
  container.registerSingleton(DI_TOKENS.FILE_PATH_PROCESSOR, () => {
    const fs = container.getSingleton(DI_TOKENS.FILE_SYSTEM) as IFileSystem;
    const log = container.get(DI_TOKENS.LOGGER) as Logger;
    
    return new DIFilePathProcessor(log, fs);
  });
}

/**
 * Register all dependencies
 * @param container - DI container instance
 */
export function registerAllDependencies(container: DIContainer = DIContainer.getInstance()): void {
  registerCoreDependencies(container);
  registerContextDependencies(container);
}
