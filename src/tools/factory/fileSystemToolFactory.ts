/**
 * @file Factory for creating FileSystemTool instances with dependency injection
 */
import { DIContainer } from '../../core/di/container';
import { DI_TOKENS } from '../../core/di/tokens';
import { IFileSystem } from '../../core/interfaces/file-system.interface';
import { IDiffService } from '../../core/interfaces/diff-service.interface';
import { Logger } from '../../core/types/logger.types';
import { FileSystemTool, FileSystemToolConfig } from '../services/fileSystem';
import type { PathDI } from '../../types/global.types';

/**
 * Creates a new FileSystemTool instance with dependencies from the DI container
 * @param config Configuration for the LocalCliTool
 * @param container DI container to get dependencies from
 * @returns A new FileSystemTool instance
 */
export function createFileSystemTool(
  config: FileSystemToolConfig,
  container: DIContainer = DIContainer.getInstance()
): FileSystemTool {
  const logger = container.get(DI_TOKENS.LOGGER) as Logger;
  const fileSystem = container.getSingleton(DI_TOKENS.FILE_SYSTEM) as IFileSystem;
  const diffService = container.getSingleton(DI_TOKENS.DIFF_SERVICE) as IDiffService;
  const pathDI = container.getSingleton(DI_TOKENS.PATH_DI) as PathDI;
  
  return new FileSystemTool(config, logger, fileSystem, diffService, pathDI);
}