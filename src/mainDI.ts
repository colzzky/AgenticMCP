/**
 * Dependency-injectable main function
 * This version of the main function accepts all dependencies as parameters,
 * making it fully testable with mocks.
 */
import { Command } from 'commander';
import type { Logger } from './core/types/logger.types';
import type { AppConfig } from './config/appConfig';
import type { PathDI, FileSystemDI, SpawnDi } from './types/global.types';

// Import more specific types for proper type checking
import type { FileSystemService as FileSystemServiceType } from './core/services/file-system.service';
import type { DiffService as DiffServiceType } from './core/services/diff.service';
import type { ToolRegistry as ToolRegistryType } from './tools/toolRegistry';
import type { ToolExecutor as ToolExecutorType } from './tools/toolExecutor';
import type { ToolResultFormatter as ToolResultFormatterType } from './tools/toolResultFormatter';
import type { McpCommands as McpCommandsType } from './commands/mcpCommands';
import type { LLMCommand as LLMCommandType } from './commands/llmCommand';
import type { ToolCommands as ToolCommandsType } from './commands/toolCommands';
import type { RoleModelConfigCommand as RoleModelConfigCommandType } from './commands/roleModelConfigCommand';
import { ConfigManager, type ConfigManager as ConfigManagerType } from './core/config/configManager';
import type { ProviderInitializer as ProviderInitializerType } from './providers/providerInitializer';
import type { ProviderFactory as ProviderFactoryType } from './providers/providerFactory';
import type { CredentialManager } from './core/credentials';
import type { DefaultFilePathProcessorFactory } from './core/commands/baseCommand';
import type { DIFilePathProcessor } from './context/filePathProcessor';
import { McpServer } from './mcp/mcpServer';
import type { McpServer as BaseMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StdioServerTransport as StdioServerTransportType } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { RoleBasedToolsRegistrar } from './mcp/tools/types';
import type { DefaultShellCommandWrapper } from './tools/shellCommandWrapper';
import { FileKeytar } from './core/credentials/file-keytar';
import { LocalShellCliTool } from './tools/localShellCliTool';
import { UnifiedShellCliTool } from './tools/unifiedShellCliTool';
import { FileSystemTool } from './tools/services/fileSystem';

import type {
  SetupCliCommandsFn,
  SetupDependencyInjectionFn,
  SetupToolSystemFn,
  SetupProviderSystemFn,
  RunProgramFn
} from './core/setup'

// Types for all the classes and constructors that main uses
export interface MainDependencies {
  // Core dependencies
  pkg: { version: string; description: string };
  logger: Logger;
  process: NodeJS.Process;
  path: PathDI;
  fs: FileSystemDI;
  spawn: SpawnDi;
  keytar: FileKeytar;
  
  // Setup functions with proper type signatures
  setupDependencyInjection: SetupDependencyInjectionFn;
  setupToolSystem: SetupToolSystemFn;
  setupProviderSystem: SetupProviderSystemFn;
  setupCliCommands: SetupCliCommandsFn;
  runProgram: RunProgramFn;
  
  // Classes and factories with more specific types
  Command: typeof Command;
  FileSystemService: typeof FileSystemServiceType; 
  DiffService: typeof DiffServiceType;
  FileSystemTool: typeof FileSystemTool;
  ToolRegistry: typeof ToolRegistryType;
  ToolExecutor: typeof ToolExecutorType;
  ToolResultFormatter: typeof ToolResultFormatterType;
  ConfigManager: typeof ConfigManagerType;
  ProviderInitializer: typeof ProviderInitializerType;
  ProviderFactory: typeof ProviderFactoryType;
  DefaultFilePathProcessorFactory: typeof DefaultFilePathProcessorFactory;
  DIFilePathProcessor: typeof DIFilePathProcessor;
  McpCommands: typeof McpCommandsType;
  LLMCommand: typeof LLMCommandType;
  ToolCommands: typeof ToolCommandsType;
  /** CLI commands for role model configuration */
  RoleModelConfigCommand: typeof RoleModelConfigCommandType;
  McpServer: typeof McpServer;
  BaseMcpServer: typeof BaseMcpServer;
  StdioServerTransport: typeof StdioServerTransportType;
  CredentialManager: typeof CredentialManager;

  // Shell Tool
  LocalShellCliTool: typeof LocalShellCliTool;
  UnifiedShellCliTool: typeof UnifiedShellCliTool;
  DefaultShellCommandWrapper: typeof DefaultShellCommandWrapper;
  SHELL_COMMANDS: readonly string[];
  
  // Configuration
  defaultAppConfig: AppConfig;
}

/**
 * Main application entry point with full dependency injection
 * This allows for complete testability by mocking dependencies
 */
export async function mainDI(deps: MainDependencies): Promise<void> {
  try {
    // Create the Commander program
    const program = new deps.Command();
    program.version(deps.pkg.version).description(deps.pkg.description);

    // Set up the dependency injection container
    const diResult = deps.setupDependencyInjection(
      deps.logger,
      deps.FileSystemService,
      deps.DiffService,
      deps.path,
      deps.fs,
      deps.process,
      deps.spawn,
      deps.FileSystemTool,
      deps.LocalShellCliTool
    );

    // Set up the tools system
    const tools = deps.setupToolSystem(
      diResult.fileSystemToolInstance,
      diResult.localShellCliToolInstance,
      deps.ToolExecutor,
      deps.ToolResultFormatter,
      deps.logger
    );

    const credentialManagerInstance = new deps.CredentialManager(
      deps.keytar,
      deps.logger
    )

    // Set up provider system with app config
    const providers = deps.setupProviderSystem(
      deps.ConfigManager,
      tools.toolExecutor,
      deps.logger,
      deps.path,
      deps.fs,
      deps.defaultAppConfig,
      deps.ProviderFactory,
      credentialManagerInstance
    );

    // Create FileSystemService instance
    const nfsInstance = new deps.FileSystemService(deps.path, deps.fs); // FileSystemService is used here

    // Create file path processor factory
    const filePathProcessorFactory = new deps.DefaultFilePathProcessorFactory(
      deps.path,
      nfsInstance,
      deps.fs,
      deps.process,
      deps.DIFilePathProcessor
    );

    // Configure and register CLI commands
    deps.setupCliCommands(
      program,
      deps.path,
      deps.McpCommands,
      deps.LLMCommand,
      deps.ToolCommands,
      deps.RoleModelConfigCommand,
      providers.configManager,
      deps.logger,
      tools.toolExecutor,
      deps.process,
      filePathProcessorFactory,
      providers.providerFactoryInstance,
      deps.McpServer,
      deps.BaseMcpServer,
      deps.StdioServerTransport,
      credentialManagerInstance,
    );

    // Run the program
    await deps.runProgram(program, deps.process, deps.logger);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    deps.logger.error(`Unhandled error in main function: ${errorMessage}`);
    deps.process.exit(1);
  }
}