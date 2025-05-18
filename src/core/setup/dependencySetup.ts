import { FileSystemService } from '../services/file-system.service';
import { DiffService } from '../services/diff.service';
import { FileSystemTool, FileSystemToolConfig } from '../../tools/services/fileSystem';
import type { PathDI, FileSystemDI, SpawnDi } from '../../types/global.types';
import type { Logger } from '../types/logger.types';
import { LocalShellCliTool } from '../../tools/localShellCliTool';
import { UnifiedShellCliTool } from '../../tools/unifiedShellCliTool';
import { DefaultShellCommandWrapper } from '../../tools/shellCommandWrapper';
import { SHELL_COMMANDS } from '../../tools/localShellCliToolDefinitions';

// Define properly typed setup function signatures
export type SetupDependencyInjectionFn = (
  loggerTool: Logger,
  fileSystem: typeof FileSystemService,
  diffServiceInstance: typeof DiffService,
  pathDi: PathDI,
  fsDi: FileSystemDI,
  processDi: NodeJS.Process,
  spawnDi: SpawnDi,
  fileSystemTool: typeof FileSystemTool,
  dILocalShellCliTool: typeof LocalShellCliTool
) => {
  fileSystemToolInstance: InstanceType<typeof FileSystemTool>,
  localShellCliToolInstance: InstanceType<typeof LocalShellCliTool>,
  unifiedShellCliToolInstance: InstanceType<typeof UnifiedShellCliTool>
};

/**
 * Sets up the dependency injection container with core services and utilities
 */
export const setupDependencyInjection: SetupDependencyInjectionFn = (
  loggerTool: Logger,
  fileSystem: typeof FileSystemService,
  diffServiceInstance: typeof DiffService,
  pathDi: PathDI,
  fsDi: FileSystemDI,
  processDi: NodeJS.Process,
  spawnDi: SpawnDi,
  fileSystemTool: typeof FileSystemTool,
  dILocalShellCliTool: typeof LocalShellCliTool
) => {
  // 1. Register Logger
  loggerTool.debug('Setting up dependency injection container...');

  // 2. Create and Register FileSystem Service
  const fileSystemService = new fileSystem(pathDi, fsDi);

  // 3. Create and Register Diff Service
  const diffService = new diffServiceInstance();

  // 4. Register Path

  // 5. Create and Register LocalCliTool Configuration
  const baseDir = processDi.cwd();
  const fileSystemToolConfig: FileSystemToolConfig = {
    baseDir,
    allowedCommands: [],
    allowFileOverwrite: false
  };
  loggerTool.debug(`Base directory for tool operations: ${baseDir}`);

  // 6. Instantiate and register FileSystemTool
  const fileSystemToolInstance = new fileSystemTool(
    fileSystemToolConfig,
    loggerTool,
    fileSystemService,
    diffService,
    pathDi
  );

  // 7. Instantiate and register shell command wrapper
  const shellWrapper = new DefaultShellCommandWrapper(spawnDi, [...SHELL_COMMANDS], loggerTool);
  
  // 8. Instantiate and register LocalShellCliTool for backward compatibility
  const shellCliToolConfig = { allowedCommands: [...SHELL_COMMANDS] };
  const localShellCliToolInstance = new dILocalShellCliTool(shellCliToolConfig, shellWrapper, loggerTool);
  
  // 9. Instantiate and register UnifiedShellCliTool
  const unifiedShellCliToolConfig = { allowedCommands: [...SHELL_COMMANDS] };
  const unifiedShellCliToolInstance = new UnifiedShellCliTool(unifiedShellCliToolConfig, shellWrapper, loggerTool);

  return { fileSystemToolInstance, localShellCliToolInstance, unifiedShellCliToolInstance };
}
