import { FileSystemTool } from '../../tools/services/fileSystem';
import { DILocalShellCliTool } from '../../tools/localShellCliTool';
import { UnifiedShellCliTool } from '../../tools/unifiedShellCliTool';
import { getLocalShellCliToolDefinitions } from '../../tools/localShellCliToolDefinitions';
import { ToolRegistry } from '../../tools/toolRegistry';
import { ToolExecutor } from '../../tools/toolExecutor';
import { ToolResultFormatter } from '../../tools/toolResultFormatter';
import type { Logger } from '../types/logger.types';
import type { Tool } from '../../core/types/provider.types';
import { getFileSystemToolDefinitions } from '../../tools/services/fileSystem/fileSystemToolDefinitions';


export type SetupToolSystemFn = (
  localCliToolInstance: FileSystemTool,
  localShellCliToolInstance: DILocalShellCliTool,
  unifiedShellCliToolInstance: UnifiedShellCliTool,
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
  unifiedShellCliToolInstance: UnifiedShellCliTool,
  toolRegistry: typeof ToolRegistry,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  loggerTool: Logger
) => {
  // Create tool registry and register local CLI tools
  const toolRegistryInstance = new toolRegistry(loggerTool);
  
  // Register file system tools
  // Use the proper file system tool definitions that match the Tool type
  const fileSystemTools = getFileSystemToolDefinitions();
  const registeredToolCount = toolRegistryInstance.registerTools(fileSystemTools);
  loggerTool.debug(`Registered ${registeredToolCount} local CLI tools`);

  // Register unified shell CLI tool definition
  const unifiedShellToolDef = unifiedShellCliToolInstance.getToolDefinition();
  // Register the single unified shell tool
  const shellRegisteredCount = toolRegistryInstance.registerTools([unifiedShellToolDef as Tool]);
  loggerTool.debug(`Registered unified shell CLI tool`);

  // Get command maps and create tool implementations map
  const commandMap = localCliToolInstance.getCommandMap();
  
  // Create tool implementations map including our unified shell tool
  const toolImplementations: Record<string, Function> = {
    ...commandMap,
    // Add the unified shell command handler
    shell: async (args: { command: string, args?: string[] }) => {
      return unifiedShellCliToolInstance.execute(args);
    }
  };

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
