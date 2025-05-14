import { Command } from 'commander';
import { registerConfigCommands } from '../../commands/configCommands';
import { registerCredentialCommands } from '../../commands/credentialCommands';
import { McpCommands } from '../../commands/mcpCommands';
import { LLMCommand } from '../../commands/llmCommand';
import { ToolCommands } from '../../commands/toolCommands';
import { ConfigManager } from '../config/configManager';
import { ToolRegistry } from '../../tools/toolRegistry';
import { ToolExecutor } from '../../tools/toolExecutor';
import { FilePathProcessorFactory } from '../commands/type';
import { McpServer } from "../../mcp/mcpServer";
import { McpServer as BaseMcpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ProviderFactory } from '../../providers/providerFactory';
import { CredentialManager } from '../credentials/credentialManager';
import { registerLlmCommand } from './llmCommandSetup';
import { registerToolCommands } from './toolCommandsSetup';
import type { RoleBasedToolsRegistrar } from '../../mcp/tools/types';
import type { PathDI } from '../../types/global.types';
import type { Logger } from '../types/logger.types';
import type { ProviderFactoryInstance } from '../../providers/types';

/**
 * Sets up all CLI commands for the application
 */
export function setupCliCommands(
  program: Command,
  pathDi: PathDI,
  fsDi: any,
  mcpCommands: typeof McpCommands,
  llmCommand: typeof LLMCommand,
  toolCommands: typeof ToolCommands,
  configManagerInstance: ConfigManager,
  loggerTool: Logger,
  toolRegistryInstance: ToolRegistry,
  toolExecutorInstance: ToolExecutor,
  processDi: NodeJS.Process,
  filePathProcessorFactory: FilePathProcessorFactory,
  providerFactoryInstance: ProviderFactoryInstance,
  mcpServer: typeof McpServer,
  baseMcpServer: typeof BaseMcpServer,
  stdioServerTransport: typeof StdioServerTransport,
  providerFactory: typeof ProviderFactory,
  credentialManager: typeof CredentialManager,
  roleBasedToolsRegistrar: RoleBasedToolsRegistrar
): void {
  // Register config and credential commands
  registerConfigCommands(program, configManagerInstance, processDi);
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
    providerFactory,
    roleBasedToolsRegistrar
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
    toolRegistryInstance,
    toolExecutorInstance
  );
}
