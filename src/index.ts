#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json' assert { type: 'json' };
import { registerConfigCommands } from './commands/configCommands';
import { registerCredentialCommands } from './commands/credentialCommands';
import { McpCommands } from './commands/mcpCommands';
import { ToolCommands } from './commands/toolCommands';
import { LLMCommand } from './commands/llmCommand';
import { logger } from './core/utils/logger';
import { ConfigManager } from './core/config/configManager';
import { DIContainer } from './core/di/container';
import { DILocalCliTool, LocalCliToolConfig } from './tools/localCliTool';
import { ToolRegistry } from './tools/toolRegistry';
import { FileSystemService } from './core/services/file-system.service';
import { DiffService } from './core/services/diff.service';
import { ToolExecutor } from './tools/toolExecutor';
import { ToolResultFormatter } from './tools/toolResultFormatter';
import { ProviderInitializer } from './providers/providerInitializer';
import { ProviderFactory } from './providers/providerFactory';
import type { ProviderFactoryInstance } from './providers/types';
import type { PathDI } from './global.types';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { DI_TOKENS } from './core/di/tokens';
import { FilePathProcessorFactory } from './core/commands/type';
import { DefaultFilePathProcessorFactory } from './core/commands/baseCommand';
import { McpServer } from "./mcp/mcpServer";
import { McpServer as BaseMcpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FilePathProcessor } from './context/filePathProcessor';

type LoggerType = typeof logger;

export async function main(
  command: typeof Command,
  diContainer: typeof DIContainer,
  fileSystem: typeof FileSystemService,
  diffServiceInstance: typeof DiffService,
  processDi: NodeJS.Process,
  localCliTool: typeof DILocalCliTool,
  loggerTool: LoggerType,
  toolRegistry: typeof ToolRegistry,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  configManager: typeof ConfigManager,
  providerInitializer: typeof ProviderInitializer,
  mcpCommands: typeof McpCommands,
  llmCommand: typeof LLMCommand,
  toolCommands: typeof ToolCommands,
  pathDi: typeof path,
  fsDi: typeof fs,
  filePathProcessorFactory: typeof DefaultFilePathProcessorFactory,
): Promise<void> {
  const program = new command();
  
  // Set up the DI container
  const container = setupDependencyInjection(
    diContainer,
    loggerTool,
    fileSystem,
    diffServiceInstance,
    pathDi,
    fsDi,
    processDi,
    localCliTool
  );
  
  // Set up the tools system
  const tools = setupToolSystem(
    container,
    toolRegistry,
    toolExecutor,
    toolResultFormatter,
    loggerTool
  );
  
  // Set up provider system
  const providers = setupProviderSystem(
    configManager,
    providerInitializer, 
    tools.toolRegistry,
    loggerTool,
    pathDi,
    fsDi
  );
  
  // Register global references (needed for CLI operation)
  registerGlobalReferences(tools, providers.providerFactory);
  
  const filePathProcessorFactoryInstance = new filePathProcessorFactory(
    pathDi,
    fsDi,
    processDi,
    FilePathProcessor
  );

  // Configure and register CLI commands
  setupCliCommands(
    program,
    pathDi,
    fsDi,
    mcpCommands,
    llmCommand,
    toolCommands,
    providers.configManager,
    loggerTool,
    tools.toolRegistry,
    processDi,
    filePathProcessorFactoryInstance,
    providers.providerFactory
  );

  // Run the program
  return runProgram(program, processDi, loggerTool);
}

// Helper functions outside main

function setupDependencyInjection(
  diContainer: typeof DIContainer,
  loggerTool: LoggerType,
  fileSystem: typeof FileSystemService,
  diffServiceInstance: typeof DiffService,
  pathDi: typeof path,
  fsDi: typeof fs,
  processDi: NodeJS.Process,
  localCliTool: typeof DILocalCliTool
): { container: any, localCliToolInstance: any } {
  const container = diContainer.getInstance();
  
  // 1. Register Logger
  container.register<LoggerType>(DI_TOKENS.LOGGER, loggerTool);

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
  loggerTool.info(`Base directory for tool operations: ${baseDir}`);

  // 6. Instantiate and register DILocalCliTool
  const localCliToolInstance = new localCliTool(
    container.get(DI_TOKENS.LOCAL_CLI_TOOL),
    container.get(DI_TOKENS.LOGGER),
    container.get(DI_TOKENS.FILE_SYSTEM),
    container.get(DI_TOKENS.DIFF_SERVICE),
    container.get(DI_TOKENS.PATH_DI)
  );
  container.register<DILocalCliTool>(DI_TOKENS.LOCAL_CLI_TOOL, localCliToolInstance);
  
  return { container, localCliToolInstance };
}

function setupToolSystem(
  diSetup: { container: any, localCliToolInstance: any },
  toolRegistry: typeof ToolRegistry,
  toolExecutor: typeof ToolExecutor,
  toolResultFormatter: typeof ToolResultFormatter,
  loggerTool: LoggerType
): { toolRegistry: any, toolExecutor: any, toolResultFormatter: any } {
  // Create tool registry and register local CLI tools
  const toolRegistryInstance = new toolRegistry(loggerTool);
  const registeredToolCount = toolRegistryInstance.registerLocalCliTools(diSetup.localCliToolInstance);
  loggerTool.info(`Registered ${registeredToolCount} local CLI tools`);

  // Get command map and create tool implementations map
  const commandMap = diSetup.localCliToolInstance.getCommandMap();
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

function setupProviderSystem(
  configManager: typeof ConfigManager,
  providerInitializer: typeof ProviderInitializer,
  toolRegistryInstance: any,
  loggerTool: LoggerType,
  pathDi: typeof path,
  fsDi: typeof fs
): { configManager: any, providerInitializer: any, providerFactory: any } {
  loggerTool.info('Initializing provider system');
  const configManagerInstance = new configManager("AgenticMCP", pathDi, fsDi);
  const providerInitializerInstance = new providerInitializer(configManagerInstance);
  const providerFactoryInstance = providerInitializerInstance.getFactory();

  // Connect provider factory with tool registry
  providerFactoryInstance.setToolRegistry(toolRegistryInstance);
  loggerTool.info('Connected tool registry with provider factory');

  return {
    configManager: configManagerInstance,
    providerInitializer: providerInitializerInstance,
    providerFactory: providerFactoryInstance
  };
}

function registerGlobalReferences(
  tools: { toolRegistry: any, toolExecutor: any, toolResultFormatter: any },
  providerFactory: any
): void {
  // Store components in globalThis for use by providers and commands
  globalThis.toolRegistry = tools.toolRegistry;
  globalThis.toolExecutor = tools.toolExecutor;
  globalThis.toolResultFormatter = tools.toolResultFormatter;
  globalThis.providerFactory = providerFactory;
}

function setupCliCommands(
  program: any,
  pathDi: typeof path,
  fsDi: typeof fs,
  mcpCommands: typeof McpCommands,
  llmCommand: typeof LLMCommand,
  toolCommands: typeof ToolCommands,
  configManagerInstance: any,
  loggerTool: LoggerType,
  toolRegistryInstance: any,
  processDi: NodeJS.Process,
  filePathProcessorFactory: FilePathProcessorFactory,
  providerFactoryInstance: ProviderFactoryInstance
): void {

  program
    .version(pkg.version)
    .description(pkg.description);

  // Register config and credential commands
  registerConfigCommands(program, configManagerInstance, processDi);
  registerCredentialCommands(program);

  // Register MCP commands
  const mcpCommandsInstance = new mcpCommands(
    configManagerInstance,
    loggerTool,
    pathDi,
    McpServer,
    BaseMcpServer,
    process,
    StdioServerTransport,
    ProviderFactory
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
  registerToolCommands(program, toolCommands, loggerTool);
}

function registerLlmCommand(
  program: any,
  llmCommand: typeof LLMCommand,
  loggerTool: LoggerType,
  filePathProcessorFactory: FilePathProcessorFactory,
  providerFactoryInstance: ProviderFactoryInstance
): void {
  const llmCommandInstance = new llmCommand(
    loggerTool, filePathProcessorFactory, providerFactoryInstance
  );
  program
    .command(llmCommandInstance.name)
    .description(llmCommandInstance.description)
    .option('-p, --provider <provider>', 'LLM provider to use (default: openai)')
    .option('-m, --model <model>', 'Model to use with the provider')
    .allowUnknownOption(true) // Allow file paths to be passed as args
    .action(async (options, command) => {
      try {
        const args = command.args;
        const result = await llmCommandInstance.execute({ options }, ...args);

        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
      } catch (error) {
        if (error instanceof Error) {
          loggerTool.error(`Error executing LLM command: ${error.message}`);
          console.error(`Error: ${error.message}`);
        }
      }
    });
}

function registerToolCommands(
  program: any,
  toolCommands: typeof ToolCommands,
  loggerTool: LoggerType
): void {
  const toolCommandsInstance = new toolCommands();
  program
    .command(toolCommandsInstance.name)
    .description(toolCommandsInstance.description)
    .action(async (options) => {
      try {
        const result = await toolCommandsInstance.execute({ options }, options);
        console.log(JSON.stringify(result, undefined, 2));
      } catch (error) {
        if (error instanceof Error) {
          loggerTool.error(`Error executing tool commands: ${error.message}`);
        }
      }
    });

  // Add subcommands for tool commands
  const toolsCommand = program.commands.find(cmd => cmd.name() === toolCommandsInstance.name);
  if (toolsCommand) {
    setupToolSubcommands(toolsCommand, toolCommandsInstance, loggerTool);
  }
}

function setupToolSubcommands(
  toolsCommand: any,
  toolCommandsInstance: any,
  loggerTool: LoggerType
): void {
  toolsCommand
    .command('list')
    .description('List all registered tools')
    .action(async () => {
      try {
        const result = await toolCommandsInstance.listTools();
        console.log(JSON.stringify(result, undefined, 2));
      } catch (error) {
        if (error instanceof Error) {
          loggerTool.error(`Error listing tools: ${error.message}`);
        }
      }
    });

  toolsCommand
    .command('execute <name>')
    .description('Execute a specific tool')
    .option('-a, --args <json>', 'JSON-formatted arguments for the tool')
    .action(async (name, options) => {
      try {
        let args = {};
        if (options.args) {
          try {
            args = JSON.parse(options.args);
          } catch (parseError) {
            loggerTool.error(`Invalid JSON arguments: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            return;
          }
        }

        const result = await toolCommandsInstance.executeTool(name, args);
        console.log(JSON.stringify(result, undefined, 2));
      } catch (error) {
        if (error instanceof Error) {
          loggerTool.error(`Error executing tool: ${error.message}`);
        }
      }
    });
}

async function runProgram(
  program: any,
  processDi: NodeJS.Process,
  loggerTool: LoggerType
): Promise<void> {
  // Add help handler
  program.on('--help', () => {
    console.log('');
    console.log('Use "[command] --help" for more information on a command.');
    loggerTool.info('Displaying help information.');
  });

  try {
    await program.parseAsync(processDi.argv);
    if (processDi.argv.slice(2).length === 0) {
      program.outputHelp();
    }
  } catch (error) {
    if (error instanceof Error) {
      loggerTool.error(`Command execution failed: ${error.message}`);
      if (processDi.env.DEBUG === 'true') {
        console.error(error.stack);
      }
    } else {
      loggerTool.error('An unknown error occurred during command execution.');
    }
    processDi.exit(1);
  }
}

// Prefer direct top-level await
try {
  await main(
    Command,
    DIContainer,
    FileSystemService,
    DiffService,
    process,
    DILocalCliTool,
    logger,
    ToolRegistry,
    ToolExecutor,
    ToolResultFormatter,
    ConfigManager,
    ProviderInitializer,
    McpCommands,
    LLMCommand,
    ToolCommands,
    path,
    fs,
    DefaultFilePathProcessorFactory
  );
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Unhandled error in main function: ${errorMessage}`);
  process.exit(1);
}
