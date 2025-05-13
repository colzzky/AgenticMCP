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
    let output = '';
    output += 'Example Command';
    output += '\n';
    output += 'Usage: agenticmcp example [options]';
    output += '\n';
    output += 'Options:';
    output += '\n';
    output += '  -v, --verbose     Enable verbose output';
    output += '\n';
    output += 'Examples:';
    output += '\n';
    output += '  agenticmcp example';
    output += '\n';
    output += '  agenticmcp example --verbose';
    output += '\n';
    output += '  agenticmcp example subcommand "Hello World"';
    return output;
  }
}

export default BasicExampleCommand;
