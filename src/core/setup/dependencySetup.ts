import { DIContainer } from '../di/container';
import { DI_TOKENS } from '../di/tokens';
import { FileSystemService } from '../services/file-system.service';
import { DiffService } from '../services/diff.service';
import { DILocalCliTool, LocalCliToolConfig } from '../../tools/localCliTool';
import type { PathDI, FileSystemDI, SpawnDi } from '../../types/global.types';
import type { Logger } from '../types/logger.types';
import { DILocalShellCliTool } from '../../tools/localShellCliTool';
import { DefaultShellCommandWrapper } from '../../tools/shellCommandWrapper';
import { SHELL_COMMANDS } from '../../tools/localShellCliToolDefinitions';

// Define properly typed setup function signatures
export type SetupDependencyInjectionFn = (
  container: DIContainer,
  loggerTool: Logger,
  fileSystem: typeof FileSystemService,
  diffServiceInstance: typeof DiffService,
  pathDi: PathDI,
  fsDi: FileSystemDI,
  processDi: NodeJS.Process,
  spawnDi: SpawnDi,
  localCliTool: typeof DILocalCliTool,
  dILocalShellCliTool: typeof DILocalShellCliTool
) => {
  localCliToolInstance: InstanceType<typeof DILocalCliTool>,
  localShellCliToolInstance: InstanceType<typeof DILocalShellCliTool>
};

/**
 * Sets up the dependency injection container with core services and utilities
 */
export const setupDependencyInjection: SetupDependencyInjectionFn = (
  container: DIContainer,
  loggerTool: Logger,
  fileSystem: typeof FileSystemService,
  diffServiceInstance: typeof DiffService,
  pathDi: PathDI,
  fsDi: FileSystemDI,
  processDi: NodeJS.Process,
  spawnDi: SpawnDi,
  localCliTool: typeof DILocalCliTool,
  dILocalShellCliTool: typeof DILocalShellCliTool
) => {
  // 1. Register Logger
  container.register<Logger>(DI_TOKENS.LOGGER, loggerTool);

  // 2. Create and Register FileSystem Service
  const fileSystemService = new fileSystem(pathDi, fsDi);
  container.register<FileSystemService>(DI_TOKENS.FILE_SYSTEM, fileSystemService);

  // 3. Create and Register Diff Service
  const diffService = new diffServiceInstance();
  container.register<DiffService>(DI_TOKENS.DIFF_SERVICE, diffService);

  // 4. Register Path
  container.register<PathDI>(DI_TOKENS.PATH_DI, pathDi);

  // 5. Create and Register LocalCliTool Configuration
  const baseDir = processDi.cwd();
  const localCliToolConfig: LocalCliToolConfig = {
    baseDir,
    allowedCommands: [],
    allowFileOverwrite: false
  };
  container.register<LocalCliToolConfig>(DI_TOKENS.LOCAL_CLI_TOOL, localCliToolConfig);
  loggerTool.debug(`Base directory for tool operations: ${baseDir}`);

  // 6. Instantiate and register DILocalCliTool
  const localCliToolInstance = new localCliTool(
    container.get(DI_TOKENS.LOCAL_CLI_TOOL),
    container.get(DI_TOKENS.LOGGER),
    container.get(DI_TOKENS.FILE_SYSTEM),
    container.get(DI_TOKENS.DIFF_SERVICE),
    container.get(DI_TOKENS.PATH_DI)
  );
  container.register<DILocalCliTool>(DI_TOKENS.LOCAL_CLI_TOOL, localCliToolInstance);

  // 7. Instantiate and register DILocalShellCliTool
  // Instantiate dependencies needed for shell tool instantiation
  const shellWrapper = new DefaultShellCommandWrapper(spawnDi, [...SHELL_COMMANDS], loggerTool);
  const shellCliToolConfig = { allowedCommands: [...SHELL_COMMANDS] };
  const localShellCliToolInstance = new dILocalShellCliTool(shellCliToolConfig, shellWrapper, loggerTool);
  container.register<DILocalShellCliTool>(DI_TOKENS.LOCAL_SHELL_CLI_TOOL, localShellCliToolInstance);

  return { localCliToolInstance, localShellCliToolInstance };
}
