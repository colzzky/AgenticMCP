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
import { DILocalShellCliTool } from './tools/localShellCliTool';
import { DILocalCliTool } from './tools/localCliTool';

// Define properly typed setup function signatures
export type SetupDependencyInjectionFn = (
  container: DIContainerType, 
  logger: Logger, 
  fileSystemService: typeof FileSystemServiceType, 
  diffService: typeof DiffServiceType, 
  path: PathDI, 
  fs: FileSystemDI, 
  process: NodeJS.Process, 
  spawn: SpawnDi,
  localCliTool: typeof DILocalCliTool,
  localShellCliTool: typeof DILocalShellCliTool
) => { localCliToolInstance: InstanceType<typeof DILocalCliTool>, localShellCliToolInstance: InstanceType<typeof DILocalShellCliTool> };

export type SetupToolSystemFn = (
  localCliToolInstance: InstanceType<typeof DILocalCliTool>, 
  localShellCliToolInstance: InstanceType<typeof DILocalShellCliTool>,
  toolRegistry: typeof ToolRegistryType, 
  toolExecutor: typeof ToolExecutorType, 
  toolResultFormatter: typeof ToolResultFormatterType, 
  logger: Logger
) => { toolRegistry: InstanceType<typeof ToolRegistryType>; toolExecutor: InstanceType<typeof ToolExecutorType>; toolResultFormatter: InstanceType<typeof ToolResultFormatterType> };

export type SetupProviderSystemFn = (
  configManager: typeof ConfigManagerType, 
  providerInitializer: typeof ProviderInitializerType, 
  toolRegistry: InstanceType<typeof ToolRegistryType>, 
  logger: Logger, 
  path: PathDI, 
  fs: FileSystemDI, 
  appConfig: AppConfig, 
  factory: typeof ProviderFactoryType
) => { configManager: InstanceType<typeof ConfigManagerType>; providerInitializer: InstanceType<typeof ProviderInitializerType>; providerFactory: any };

export type SetupCliCommandsFn = (
  program: InstanceType<typeof Command>,
  path: PathDI,
  fs: FileSystemDI,
  mcpCommands: typeof McpCommandsType,
  llmCommand: typeof LLMCommandType,
  toolCommands: typeof ToolCommandsType,
  configManagerInstance: InstanceType<typeof ConfigManagerType>,
  logger: Logger,
  toolRegistryInstance: InstanceType<typeof ToolRegistryType>,
  toolExecutorInstance: InstanceType<typeof ToolExecutorType>,
  process: NodeJS.Process,
  filePathProcessorFactory: any,
  providerFactoryInstance: any,
  mcpServer: any,
  baseMcpServer: any,
  stdioServerTransport: any,
  providerFactory: typeof ProviderFactoryType,
  credentialManager: any,
  roleBasedToolsRegistrar: any
) => void;

export type RunProgramFn = (
  program: InstanceType<typeof Command>,
  process: NodeJS.Process,
  logger: Logger
) => Promise<void>;

// Types for all the classes and constructors that main uses
export interface MainDependencies {
  // Core dependencies
  pkg: { version: string; description: string };
  logger: Logger;
  process: NodeJS.Process;
  path: PathDI;
  fs: FileSystemDI;
  spawn: SpawnDi;
  
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
  DILocalCliTool: any; // Can be improved further
  ToolRegistry: typeof ToolRegistryType;
  ToolExecutor: typeof ToolExecutorType;
  ToolResultFormatter: typeof ToolResultFormatterType;
  ConfigManager: typeof ConfigManagerType;
  ProviderInitializer: typeof ProviderInitializerType;
  ProviderFactory: typeof ProviderFactoryType;
  NodeFileSystem: any; // Can be improved
  DefaultFilePathProcessorFactory: any; // Can be improved
  DIFilePathProcessor: any; // Can be improved
  McpCommands: typeof McpCommandsType;
  LLMCommand: typeof LLMCommandType;
  ToolCommands: typeof ToolCommandsType;
  McpServer: any; // Can be improved
  BaseMcpServer: any; // Can be improved
  StdioServerTransport: any; // Can be improved
  CredentialManager: any; // Can be improved
  RoleBasedToolsRegistrarFactory: { createDefault: () => any }; // Can be improved

  // Shell Tool
  DILocalShellCliTool: any;
  DefaultShellCommandWrapper: any;
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

    // Set up provider system with app config
    const providers = deps.setupProviderSystem(
      deps.ConfigManager,
      deps.ProviderInitializer,
      tools.toolRegistry,
      deps.logger,
      deps.path,
      deps.fs,
      deps.defaultAppConfig,
      deps.ProviderFactory
    );

    // Create NodeFileSystem instance
    const nfsInstance = new deps.NodeFileSystem(deps.path, deps.fs);

    // Create file path processor factory
    const filePathProcessorFactory = new deps.DefaultFilePathProcessorFactory(
      deps.path,
      nfsInstance,
      deps.fs,
      deps.process,
      deps.DIFilePathProcessor
    );

    // Create provider factory instance
    const providerFactoryInstance = new deps.ProviderFactory(
      providers.configManager,
      deps.logger
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
      providerFactoryInstance,
      deps.McpServer,
      deps.BaseMcpServer,
      deps.StdioServerTransport,
      deps.ProviderFactory,
      deps.CredentialManager,
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