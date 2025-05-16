import { FileSystemTool } from '../../tools/fileSystemTool';
import { DILocalShellCliTool } from '../../tools/localShellCliTool';
import { getLocalShellCliToolDefinitions } from '../../tools/localShellCliToolDefinitions';
import { ToolRegistry } from '../../tools/toolRegistry';
import { ToolExecutor } from '../../tools/toolExecutor';
import { ToolResultFormatter } from '../../tools/toolResultFormatter';
import type { Logger } from '../types/logger.types';
import type { Tool } from '../../core/types/provider.types';


export type SetupToolSystemFn = (
  localCliToolInstance: FileSystemTool,
  localShellCliToolInstance: DILocalShellCliTool,
  toolRegistry: typeof ToolRegistry,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  loggerTool: Logger
) => {
  toolRegistry: InstanceType<typeof ToolRegistry>,
  toolExecutor: InstanceType<typeof ToolExecutor>,
  toolResultFormatter: InstanceType<typeof ToolResultFormatter>
}

/**
 * Sets up the tool system with registry, executor, and formatter
 */
export const setupToolSystem: SetupToolSystemFn = (
  localCliToolInstance: FileSystemTool,
  localShellCliToolInstance: DILocalShellCliTool,
  toolRegistry: typeof ToolRegistry,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  loggerTool: Logger
) => {
  // Create tool registry and register local CLI tools
  const toolRegistryInstance = new toolRegistry(loggerTool);
  const registeredToolCount = toolRegistryInstance.registerLocalCliTools(localCliToolInstance);
  loggerTool.debug(`Registered ${registeredToolCount} local CLI tools`);

  // Register local shell CLI tool definitions
  const shellToolDefs = localShellCliToolInstance.getToolDefinitions();
  // Cast to Tool[] since we know the structure is compatible
  const shellRegisteredCount = toolRegistryInstance.registerTools(shellToolDefs as Tool[]);
  loggerTool.debug(`Registered ${shellRegisteredCount} shell CLI tools`);

  // Get command maps and create tool implementations map
  const commandMap = localCliToolInstance.getCommandMap();
  const shellCommandMap = localShellCliToolInstance.getCommandMap();
  const toolImplementations: Record<string, Function> = { ...commandMap, ...shellCommandMap };

  // Create ToolExecutor and ToolResultFormatter
  const toolExecutorInstance = new toolExecutor(
    toolRegistryInstance,
    toolImplementations,
    loggerTool
  );
  const toolResultFormatterInstance = new toolResultFormatter(loggerTool);

  return {
    toolRegistry: toolRegistryInstance,
    toolExecutor: toolExecutorInstance,
    toolResultFormatter: toolResultFormatterInstance
  };
}
