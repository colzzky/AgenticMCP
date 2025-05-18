import { Command } from 'commander';
import { registerConfigCommands } from '../../commands/configCommands';
import { registerCredentialCommands } from '../../commands/credentialCommands';
import { McpCommands } from '../../commands/mcpCommands';
import { LLMCommand } from '../../commands/llmCommand';
import { ToolCommands } from '../../commands/toolCommands';
import { RoleModelConfigCommand } from '../../commands/roleModelConfigCommand';
import { ConfigManager } from '../config/configManager';
import { ToolExecutor } from '../../tools/toolExecutor';
import { FilePathProcessorFactory } from '../commands/type';
import { McpServer } from "../../mcp/mcpServer";
import { McpServer as BaseMcpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CredentialManager } from '../credentials/credentialManager';
import { registerLlmCommand } from './llmCommandSetup';
import { registerToolCommands } from './toolCommandsSetup';
import type { RoleBasedToolsRegistrar } from '../../mcp/tools/types';
import type { PathDI } from '../../types/global.types';
import type { Logger } from '../types/logger.types';
import type { ProviderFactoryInterface } from '../../providers/types';
import { registerRoleBasedTools } from '../../mcp/tools/roleBasedTools';

export type SetupCliCommandsFn = (
  program: Command,
  pathDi: PathDI,
  mcpCommands: typeof McpCommands,
  llmCommand: typeof LLMCommand,
  toolCommands: typeof ToolCommands,
  roleModelConfigCommand: typeof RoleModelConfigCommand,
  configManagerInstance: ConfigManager,
  loggerTool: Logger,
  toolExecutorInstance: ToolExecutor,
  processDi: NodeJS.Process,
  filePathProcessorFactory: FilePathProcessorFactory,
  providerFactoryInstance: ProviderFactoryInterface,
  mcpServer: typeof McpServer,
  baseMcpServer: typeof BaseMcpServer,
  stdioServerTransport: typeof StdioServerTransport,
  credentialManager: InstanceType<typeof CredentialManager>,
) => void;

/**
 * Sets up all CLI commands for the application
 */
export const setupCliCommands: SetupCliCommandsFn = (
  program: Command,
  pathDi: PathDI,
  mcpCommands: typeof McpCommands,
  llmCommand: typeof LLMCommand,
  toolCommands: typeof ToolCommands,
  roleModelConfigCommand: typeof RoleModelConfigCommand,
  configManagerInstance: ConfigManager,
  loggerTool: Logger,
  toolExecutorInstance: ToolExecutor,
  processDi: NodeJS.Process,
  filePathProcessorFactory: FilePathProcessorFactory,
  providerFactoryInstance: ProviderFactoryInterface,
  mcpServer: typeof McpServer,
  baseMcpServer: typeof BaseMcpServer,
  stdioServerTransport: typeof StdioServerTransport,
  credentialManager: InstanceType<typeof CredentialManager>,
) => {
  // Register config and credential commands
  registerConfigCommands(program, configManagerInstance, processDi, loggerTool);
  registerCredentialCommands(
    program,
    credentialManager,
    loggerTool
  );

  // Register MCP commands
  const mcpCommandsInstance = new mcpCommands(
    configManagerInstance,
    loggerTool,
    pathDi,
    mcpServer,
    baseMcpServer,
    processDi,
    stdioServerTransport,
    providerFactoryInstance,
    {
      registerRoleBasedTools: registerRoleBasedTools
    }
  );
  mcpCommandsInstance.registerCommands(program);

  // Register LLM command
  registerLlmCommand(
    program,
    llmCommand,
    loggerTool,
    filePathProcessorFactory,
    providerFactoryInstance
  );

  // Register tool commands
  registerToolCommands(
    program,
    toolCommands,
    loggerTool,
    toolExecutorInstance
  );

  // Register role model configuration commands
  const roleModelConfigInstance = new roleModelConfigCommand(loggerTool);
  roleModelConfigInstance.registerCommands(program);
}
