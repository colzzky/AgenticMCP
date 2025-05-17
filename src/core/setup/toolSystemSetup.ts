import { FileSystemTool } from '../../tools/services/fileSystem';
import { LocalShellCliTool } from '../../tools/localShellCliTool';
import { ToolExecutor } from '../../tools/toolExecutor';
import { ToolResultFormatter } from '../../tools/toolResultFormatter';
import type { Logger } from '../types/logger.types';
import { type CommandMap } from '../types/cli.types';
import { ToolRegistry } from '../../tools/toolRegistry';

export type SetupToolSystemFn = (
  fileSystemToolInstance: FileSystemTool,
  localShellCliToolInstance: LocalShellCliTool,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  loggerTool: Logger
) => {
  toolExecutor: InstanceType<typeof ToolExecutor>,
  toolResultFormatter: InstanceType<typeof ToolResultFormatter>
}

/**
 * Sets up the tool system with registry, executor, and formatter
 */
export const setupToolSystem: SetupToolSystemFn = (
  fileSystemToolInstance: FileSystemTool,
  localShellCliToolInstance: LocalShellCliTool,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  loggerTool: Logger
) => {

  // Register tool definitions
  const fsCommandTools = fileSystemToolInstance.getTools();
  const shellCommandTools = localShellCliToolInstance.getTools();

  const toolRegistryInstance = new ToolRegistry(loggerTool)
  toolRegistryInstance.registerTools(fsCommandTools);
  toolRegistryInstance.registerTools(shellCommandTools);

  // Get command maps and create tool implementations map
  const fsCommandMap = fileSystemToolInstance.getCommandMap();
  const shellCommandMap = localShellCliToolInstance.getCommandMap();

  // Create tool implementations map including our unified shell tool
  const toolImplementations: CommandMap = {
    ...fsCommandMap,
    ...shellCommandMap
  };

  // Create ToolExecutor and ToolResultFormatter
  const toolExecutorInstance = new toolExecutor(
    toolRegistryInstance,
    toolImplementations,
    loggerTool
  );
  const toolResultFormatterInstance = new toolResultFormatter(loggerTool);

  return {
    toolExecutor: toolExecutorInstance,
    toolResultFormatter: toolResultFormatterInstance
  };
}
