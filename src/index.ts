#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json' assert { type: 'json' };
import { registerConfigCommands } from './commands/configCommands';
import { registerCredentialCommands } from './commands/credentialCommands';
import { McpCommands } from './commands/mcpCommands';
import { ToolCommands } from './commands/toolCommands';
import { LLMCommand } from './commands/llmCommand';
import { logger } from './core/utils/logger';
import { configManager } from './core/config/configManager';
import { DIContainer } from './core/di/container';
import { DILocalCliTool, LocalCliToolConfig } from './tools/localCliTool';
import { ToolRegistry } from './tools/toolRegistry';
import { FileSystemService } from './core/services/file-system.service';
import { DiffService } from './core/services/diff.service';
import { ToolExecutor } from './tools/toolExecutor';
import { ToolResultFormatter } from './tools/toolResultFormatter';
import { ProviderInitializer } from './providers/providerInitializer';
import path from 'node:path';

async function main(): Promise<void> {
  const program = new Command();

  // --- Dependency Injection Setup --- 
  const container = DIContainer.getInstance();
  
  // 1. Register Logger (created externally)
  container.register<typeof logger>('logger', logger);

  // 2. Create and Register FileSystem Service
  const fileSystemService = new FileSystemService();
  container.register<FileSystemService>('FileSystem', fileSystemService);

  // 3. Create and Register Diff Service
  const diffService = new DiffService();
  container.register<DiffService>('DiffService', diffService);

  // 4. Create and Register LocalCliTool Configuration
  const baseDir = process.cwd();
  const localCliToolConfig: LocalCliToolConfig = {
    baseDir,
    allowedCommands: [], // Keep empty for now, can be configured later
    allowFileOverwrite: false // Default to false for safety
  };
  container.register<LocalCliToolConfig>('LocalCliToolConfig', localCliToolConfig);
  logger.info(`Base directory for tool operations: ${baseDir}`);

  // 5. Manually instantiate DILocalCliTool using registered dependencies
  const localCliTool = new DILocalCliTool(
    container.get('LocalCliToolConfig'),
    container.get('logger'),
    container.get('FileSystem'),
    container.get('DiffService')
  );
  // Optionally register the created instance if it needs to be injected elsewhere
  container.register<DILocalCliTool>('DILocalCliTool', localCliTool); 
  // --- End of DI Setup ---


  // Create tool registry and register local CLI tools
  const toolRegistry = new ToolRegistry(logger);
  const registeredToolCount = toolRegistry.registerLocalCliTools(localCliTool);
  logger.info(`Registered ${registeredToolCount} local CLI tools`);

  // Get command map from LocalCliTool using the public getter
  const commandMap = localCliTool.getCommandMap();

  // Create tool implementations map for execution
  const toolImplementations: Record<string, Function> = {};
  for (const commandName in commandMap) {
    toolImplementations[commandName] = commandMap[commandName as keyof typeof commandMap];
  }

  // Instantiate ToolExecutor and ToolResultFormatter (potentially needs DI too later)
  const toolExecutor = new ToolExecutor(toolRegistry, toolImplementations, logger);
  const toolResultFormatter = new ToolResultFormatter(logger);

  // Initialize provider system with tool registry
  logger.info('Initializing provider system');
  const providerInitializer = new ProviderInitializer(configManager);
  const providerFactory = providerInitializer.getFactory();

  // Connect provider factory with tool registry
  providerFactory.setToolRegistry(toolRegistry);
  logger.info('Connected tool registry with provider factory');

  // Store tool components in globalThis for later use by providers and commands
  globalThis.toolRegistry = toolRegistry;
  globalThis.toolExecutor = toolExecutor;
  globalThis.toolResultFormatter = toolResultFormatter;
  globalThis.providerFactory = providerFactory;

  program
    .version(pkg.version)
    .description(pkg.description);

  // Register command groups
  registerConfigCommands(program);
  registerCredentialCommands(program);

  // Register MCP commands
  const mcpCommands = new McpCommands(configManager, logger);
  mcpCommands.registerCommands(program);

  // Register LLM command with file path context support
  const llmCommand = new LLMCommand();
  program
    .command(llmCommand.name)
    .description(llmCommand.description)
    .option('-p, --provider <provider>', 'LLM provider to use (default: openai)')
    .option('-m, --model <model>', 'Model to use with the provider')
    .allowUnknownOption(true) // Allow file paths to be passed as args
    .action(async (options, command) => {
      try {
        // Get remaining args (after the command and options)
        const args = command.args;
        const result = await llmCommand.execute({ options }, ...args);

        // Output the result
        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error executing LLM command: ${error.message}`);
          console.error(`Error: ${error.message}`);
        }
      }
    });

  // Register tool commands
  const toolCommands = new ToolCommands();
  program
    .command(toolCommands.name)
    .description(toolCommands.description)
    .action(async (options) => {
      try {
        const result = await toolCommands.execute({ options }, options);
        console.log(JSON.stringify(result, undefined, 2));
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error executing tool commands: ${error.message}`);
        }
      }
    });

  // Add subcommands for tool commands
  const toolsCommand = program.commands.find(cmd => cmd.name() === toolCommands.name);
  if (toolsCommand) {
    toolsCommand
      .command('list')
      .description('List all registered tools')
      .action(async (options) => {
        try {
          // @ts-ignore - We know this method exists on the class
          const result = await toolCommands.listTools();
          console.log(JSON.stringify(result, undefined, 2));
        } catch (error) {
          if (error instanceof Error) {
            logger.error(`Error listing tools: ${error.message}`);
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
              logger.error(`Invalid JSON arguments: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              return;
            }
          }

          // @ts-ignore - We know this method exists on the class
          const result = await toolCommands.executeTool(name, args);
          console.log(JSON.stringify(result, undefined, 2));
        } catch (error) {
          if (error instanceof Error) {
            logger.error(`Error executing tool: ${error.message}`);
          }
        }
      });
  }

  // Default help and error handling
  program.on('--help', () => {
    console.log('');
    console.log('Use "[command] --help" for more information on a command.');
    logger.info('Displaying help information.');
  });

  try {
    await program.parseAsync(process.argv);
    // Use .length === 0 for explicit length check
    if (process.argv.slice(2).length === 0) {
      program.outputHelp();
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Command execution failed: ${error.message}`);
      if (process.env.DEBUG === 'true') {
        console.error(error.stack);
      }
    } else {
      logger.error('An unknown error occurred during command execution.');
    }
    process.exit(1);
  }
}

// Prefer direct top-level await
try {
  await main();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Unhandled error in main function: ${errorMessage}`);
  process.exit(1);
}
