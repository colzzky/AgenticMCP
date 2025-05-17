import { Command } from 'commander';
import { ToolCommands } from '../../commands/toolCommands';
import { ToolExecutor } from '../../tools/toolExecutor';
import type { Logger } from '../types/logger.types';

/**
 * Registers the tool commands with the CLI program
 */
export function registerToolCommands(
  program: Command,
  toolCommands: typeof ToolCommands,
  loggerTool: Logger,
  toolExecutor: ToolExecutor
): void {

  const toolCommandsInstance = new toolCommands(toolExecutor);
  program
    .command(toolCommandsInstance.name)
    .description(toolCommandsInstance.description)
    .action(async (options) => {
      try {
        const result = await toolCommandsInstance.execute({ options }, options);
        loggerTool.info(JSON.stringify(result, undefined, 2));
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

/**
 * Sets up tool subcommands for listing and executing specific tools
 */
export function setupToolSubcommands(
  toolsCommand: Command,
  toolCommandsInstance: ToolCommands,
  loggerTool: Logger
): void {
  toolsCommand
    .command('list')
    .description('List all registered tools')
    .action(async () => {
      try {
        const result = await toolCommandsInstance.listTools();
        loggerTool.info(JSON.stringify(result, undefined, 2));
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
        loggerTool.info(JSON.stringify(result, undefined, 2));
      } catch (error) {
        if (error instanceof Error) {
          loggerTool.error(`Error executing tool: ${error.message}`);
        }
      }
    });
}
