/**
 * @file Example command implementation using the decorator-based command system.
 */

import { Command, CommandContext, CommandOutput } from '../../core/types/command.types';
import { AgentCommand, CommandHandler, CommandParam } from '../../core/commands/decorators';
import { info } from '../../core/utils/logger';

/**
 * Basic example command demonstrating the decorator-based command system.
 */
@AgentCommand({
  name: 'example',
  description: 'An example command demonstrating the decorator-based command system',
  aliases: ['ex', 'demo'],
  category: 'examples'
})
export class BasicExampleCommand implements Command {
  name = 'example';
  description = 'An example command demonstrating the decorator-based command system';
  aliases = ['ex', 'demo'];
  options = [
    {
      flags: '-v, --verbose',
      description: 'Enable verbose output'
    }
  ];

  /**
   * Execute the command
   */
  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    info(`Executing example command with args: ${JSON.stringify(args)}`);
    
    // Check for verbose flag in the options
    const verbose = context.options?.verbose || false;
    
    if (verbose) {
      // If verbose is enabled, provide detailed output
      return {
        success: true,
        message: 'Example command executed successfully (verbose mode)',
        data: {
          args,
          context,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Basic output
    return {
      success: true,
      message: 'Example command executed successfully',
      data: { commandName: this.name }
    };
  }

  /**
   * Example of a command handler sub-command
   */
  @CommandHandler({
    name: 'subcommand',
    description: 'A sub-command within the example command'
  })
  async handleSubCommand(
    @CommandParam('input') input: string,
    @CommandParam('options') options: Record<string, unknown>
  ): Promise<CommandOutput> {
    return {
      success: true,
      message: `Executed sub-command with input: ${input}`,
      data: { input, options }
    };
  }

  /**
   * Get help for this command
   */
  getHelp(): string {
    return `
Example Command

Usage:
  agenticmcp example [options]
  agenticmcp example subcommand <input>

Options:
  -v, --verbose     Enable verbose output

Examples:
  agenticmcp example
  agenticmcp example --verbose
  agenticmcp example subcommand "Hello World"
    `;
  }
}

export default BasicExampleCommand;
