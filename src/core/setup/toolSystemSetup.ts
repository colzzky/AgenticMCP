import { DILocalCliTool } from '../../tools/localCliTool';
import { ToolRegistry } from '../../tools/toolRegistry';
import { ToolExecutor } from '../../tools/toolExecutor';
import { ToolResultFormatter } from '../../tools/toolResultFormatter';
import type { Logger } from '../types/logger.types';

/**
 * Sets up the tool system with registry, executor, and formatter
 */
export function setupToolSystem(
  localCliToolInstance: DILocalCliTool,
  toolRegistry: typeof ToolRegistry,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  loggerTool: Logger
): {
  toolRegistry: InstanceType<typeof ToolRegistry>,
  toolExecutor: InstanceType<typeof ToolExecutor>,
  toolResultFormatter: InstanceType<typeof ToolResultFormatter>
} {
  // Create tool registry and register local CLI tools
  const toolRegistryInstance = new toolRegistry(loggerTool);
  const registeredToolCount = toolRegistryInstance.registerLocalCliTools(localCliToolInstance);
  loggerTool.info(`Registered ${registeredToolCount} local CLI tools`);

  // Get command map and create tool implementations map
  const commandMap = localCliToolInstance.getCommandMap();
  const toolImplementations: Record<string, Function> = {};
  for (const commandName in commandMap) {
    toolImplementations[commandName] = commandMap[commandName as keyof typeof commandMap];
  }

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
