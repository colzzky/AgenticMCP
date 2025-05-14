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
import type { DIContainer as DIContainerType } from './core/di/container';
import type { FileSystemService as FileSystemServiceType } from './core/services/file-system.service';
import type { DiffService as DiffServiceType } from './core/services/diff.service';
import type { ToolRegistry as ToolRegistryType } from './tools/toolRegistry';
import type { ToolExecutor as ToolExecutorType } from './tools/toolExecutor';
import type { ToolResultFormatter as ToolResultFormatterType } from './tools/toolResultFormatter';
import type { McpCommands as McpCommandsType } from './commands/mcpCommands';
import type { LLMCommand as LLMCommandType } from './commands/llmCommand';
import type { ToolCommands as ToolCommandsType } from './commands/toolCommands';
import type { ConfigManager as ConfigManagerType } from './core/config/configManager';
import type { ProviderInitializer as ProviderInitializerType } from './providers/providerInitializer';
import type { ProviderFactory as ProviderFactoryType } from './providers/providerFactory';
import type { CredentialManager } from './core/credentials';
import { NodeFileSystem } from './core/adapters/nodeFileSystemAdapter';
import type { DefaultFilePathProcessorFactory } from './core/commands/baseCommand';
import type { DIFilePathProcessor } from './context/filePathProcessor';
import type { McpServer } from './mcp/mcpServer';
import type { McpServer as BaseMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StdioServerTransport as StdioServerTransportType } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { RoleBasedToolsRegistrar } from './mcp/tools/types';
import type { DefaultShellCommandWrapper } from './tools/shellCommandWrapper';
import { FileKeytar } from './core/credentials/file-keytar';
import { DILocalShellCliTool } from './tools/localShellCliTool';
import { DILocalCliTool } from './tools/localCliTool';

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
  DIContainer: { getInstance: () => DIContainerType };
  FileSystemService: typeof FileSystemServiceType; 
  DiffService: typeof DiffServiceType;
  DILocalCliTool: typeof DILocalCliTool;
  ToolRegistry: typeof ToolRegistryType;
  ToolExecutor: typeof ToolExecutorType;
  ToolResultFormatter: typeof ToolResultFormatterType;
  ConfigManager: typeof ConfigManagerType;
  ProviderInitializer: typeof ProviderInitializerType;
  ProviderFactory: typeof ProviderFactoryType;
  NodeFileSystem: typeof NodeFileSystem;
  DefaultFilePathProcessorFactory: typeof DefaultFilePathProcessorFactory;
  DIFilePathProcessor: typeof DIFilePathProcessor;
  McpCommands: typeof McpCommandsType;
  LLMCommand: typeof LLMCommandType;
  ToolCommands: typeof ToolCommandsType;
  McpServer: typeof McpServer;
  BaseMcpServer: typeof BaseMcpServer;
  StdioServerTransport: typeof StdioServerTransportType;
  CredentialManager: typeof CredentialManager;
  RoleBasedToolsRegistrarFactory: { createDefault: () => RoleBasedToolsRegistrar };

  // Shell Tool
  DILocalShellCliTool: typeof DILocalShellCliTool;
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

    // Create the role-based tools registrar
    const roleRegistrar = deps.RoleBasedToolsRegistrarFactory.createDefault();

    // Set up the dependency injection container
    const container = deps.DIContainer.getInstance();
    const diResult = deps.setupDependencyInjection(
      container,
      deps.logger,
      deps.FileSystemService,
      deps.DiffService,
      deps.path,
      deps.fs,
      deps.process,
      deps.spawn,
      deps.DILocalCliTool,
      deps.DILocalShellCliTool
    );

    // Set up the tools system
    const tools = deps.setupToolSystem(
      diResult.localCliToolInstance,
      diResult.localShellCliToolInstance,
      deps.ToolRegistry,
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
      deps.ProviderInitializer,
      tools.toolRegistry,
      deps.logger,
      deps.path,
      deps.fs,
      deps.defaultAppConfig,
      deps.ProviderFactory,
      credentialManagerInstance
    );

    // Create NodeFileSystem instance
    const nfsInstance = new deps.NodeFileSystem(deps.path, deps.fs); // NodeFileSystem is used here

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
      deps.fs,
      deps.McpCommands,
      deps.LLMCommand,
      deps.ToolCommands,
      providers.configManager,
      deps.logger,
      tools.toolRegistry,
      tools.toolExecutor,
      deps.process,
      filePathProcessorFactory,
      providers.providerFactoryInstance,
      deps.McpServer,
      deps.BaseMcpServer,
      deps.StdioServerTransport,
      credentialManagerInstance,
      roleRegistrar
    );

    // Run the program
    await deps.runProgram(program, deps.process, deps.logger);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    deps.logger.error(`Unhandled error in main function: ${errorMessage}`);
    deps.process.exit(1);
  }
}