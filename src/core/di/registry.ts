/**
 * @file Dependency injection registry
 * Provides functions to register all dependencies in the container
 */

import { DIContainer } from './container';
import { DI_TOKENS } from './tokens';
import { NodeFileSystem } from '../adapters/node-file-system.adapter';
import { IFileSystem } from '../interfaces/file-system.interface';
import type { Logger } from '../types/logger.types';
import { DIFilePathProcessor } from '../../context/di-file-path-processor';
import { PathDI, FileSystemDI } from '@/global.types';
import { DiffService } from '../../tools/services/diff-service';

/**
 * Register core dependencies
 * @param container - DI container instance
 */
export function registerCoreDependencies(
  container: DIContainer = DIContainer.getInstance(),
  logger: Logger,
  pathDI: PathDI,
  fileSystemDI: FileSystemDI
): void {
  container.register(DI_TOKENS.LOGGER, logger);
  container.register(DI_TOKENS.PATH_DI, pathDI);
  container.register(DI_TOKENS.FILE_SYSTEM_DI, fileSystemDI);

  container.registerSingleton(DI_TOKENS.FILE_SYSTEM, () => {
    const _pathDI = container.get(DI_TOKENS.PATH_DI) as PathDI;
    const _fileSystemDI = container.get(DI_TOKENS.FILE_SYSTEM_DI) as FileSystemDI;
    return new NodeFileSystem(_pathDI, _fileSystemDI);
  });
}

/**
 * Register context processing dependencies
 * @param container - DI container instance
 */
export function registerContextDependencies(
  container: DIContainer = DIContainer.getInstance(),
  logger: Logger,
  fs: IFileSystem,
  pathDI: PathDI,
  fileSystemDI: FileSystemDI,
  processDi: NodeJS.Process
): void {

  container.register(DI_TOKENS.LOGGER, logger);
  container.register(DI_TOKENS.FILE_SYSTEM, fs);
  container.register(DI_TOKENS.PATH_DI, pathDI);
  container.register(DI_TOKENS.FILE_SYSTEM_DI, fileSystemDI);
  container.register(DI_TOKENS.PROCESS_DI, processDi);

  container.registerSingleton(DI_TOKENS.FILE_PATH_PROCESSOR, () => {
    const fs = container.getSingleton(DI_TOKENS.FILE_SYSTEM) as IFileSystem;
    const log = container.get(DI_TOKENS.LOGGER) as Logger;
    const path = container.get(DI_TOKENS.PATH_DI) as PathDI;
    const fileSystemDi = container.get(DI_TOKENS.FILE_SYSTEM_DI) as FileSystemDI;
    const processDi = container.get(DI_TOKENS.PROCESS_DI) as NodeJS.Process;
    return new DIFilePathProcessor(log, fs, path, fileSystemDi, processDi);
  });
}

/**
 * Register tool-related dependencies
 * @param container - DI container instance
 */
export async function registerToolDependencies(
  container: DIContainer = DIContainer.getInstance(),
  Diff: typeof DiffService
): Promise<void> {
  container.registerSingleton(DI_TOKENS.DIFF_SERVICE, () => new Diff());
}

/**
 * Register all dependencies
 * @param container - DI container instance
 */
export async function registerAllDependencies(
  container: DIContainer = DIContainer.getInstance(),
  Diff: typeof DiffService,
  logger: Logger,
  fs: IFileSystem,
  pathDI: PathDI,
  fileSystemDI: FileSystemDI,
  processDi: NodeJS.Process
): Promise<void> {
  registerCoreDependencies(container, logger, pathDI, fileSystemDI);
  registerContextDependencies(container, logger, fs, pathDI, fileSystemDI, processDi);
  await registerToolDependencies(container, Diff);
}
