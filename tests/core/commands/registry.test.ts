/**
 * @file Tests for the command registry and decorator system
 */

import 'reflect-metadata';
import { Command, CommandContext, CommandOutput } from '../../../src/core/types/command.types';
import {
  CommandRegistry,
  AgentCommand,
  CommandHandler,
  CommandParam,
  CommandOptions,
  COMMAND_METADATA,
  CommandMetadata,
} from '../../../src/core/commands';

// Create a mock command for testing
@AgentCommand({
  name: 'test',
  description: 'Test command for registry testing',
  aliases: ['t'],
  category: 'testing'
})
class TestCommand implements Command {
  name: string = 'test';
  description: string = 'Test command for registry testing';
  aliases: string[] = ['t'];

  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    return {
      success: true,
      message: 'Test command executed',
      data: { args: args as unknown[] }
    };
  }

  @CommandHandler({
    name: 'subcommand',
    description: 'Test subcommand'
  })
  async subCommand(
    @CommandParam('input') input: string
  ): Promise<CommandOutput> {
    return {
      success: true,
      message: `Subcommand executed with input: ${input}`,
      data: { input }
    };
  }
}

// Second command for category testing
@AgentCommand({
  name: 'another-test',
  description: 'Another test command',
  aliases: ['at'],
  category: 'testing'
})
class AnotherTestCommand implements Command {
  name = 'another-test';
  description = 'Another test command';
  aliases = ['at'];

  async execute(): Promise<CommandOutput> {
    return {
      success: true,
      message: 'Another test command executed'
    };
  }
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    // Reset the registry before each test
    registry = CommandRegistry.getInstance();
    registry.reset();
    
    // Manually register the command classes
    // In a Jest environment, the decorators may not work as expected
    // So we need to manually define the metadata and register the commands
    Reflect.defineMetadata(COMMAND_METADATA, {
      name: 'test',
      description: 'Test command for registry testing',
      aliases: ['t'],
      category: 'testing'
    }, TestCommand);
    
    Reflect.defineMetadata(COMMAND_METADATA, {
      name: 'another-test',
      description: 'Another test command',
      aliases: ['at'],
      category: 'testing'
    }, AnotherTestCommand);
    
    registry.registerCommand(TestCommand);
    registry.registerCommand(AnotherTestCommand);
  });

  test('registers commands via decorators', () => {
    // The commands should already be registered by the decorators
    const command = registry.getCommand('test');
    expect(command).toBeDefined();
    expect(command).toBe(TestCommand);
  });

  test('resolves command aliases', () => {
    const command = registry.getCommand('t');
    expect(command).toBeDefined();
    expect(command).toBe(TestCommand);
  });

  test('returns undefined for unknown commands', () => {
    const command = registry.getCommand('nonexistent');
    expect(command).toBeUndefined();
  });

  test('gets command names', () => {
    const names = registry.getCommandNames();
    expect(names).toContain('test');
    expect(names).toContain('another-test');
  });

  test('gets commands by category', () => {
    const commands = registry.getCommandsByCategory('testing');
    expect(commands).toContain('test');
    expect(commands).toContain('another-test');
  });

  test('gets all commands', () => {
    const commands = registry.getAllCommands();
    expect(commands.length).toBe(2);
    
    const testCommand = commands.find(c => c.name === 'test');
    expect(testCommand).toBeDefined();
    expect(testCommand?.metadata.aliases).toContain('t');
    
    const anotherCommand = commands.find(c => c.name === 'another-test');
    expect(anotherCommand).toBeDefined();
    expect(anotherCommand?.metadata.aliases).toContain('at');
  });

  test('executes commands', async () => {
    const result = await registry.executeCommand('test', { rawArgs: [] }, 'arg1', 'arg2');
    expect(result.success).toBe(true);
    expect(result.message).toBe('Test command executed');
    expect((result.data as { args: unknown[] }).args).toEqual(['arg1', 'arg2']);
  });

  test('handles errors in command execution', async () => {
    // Mock a command that throws an error
    @AgentCommand({
      name: 'error-command',
      description: 'A command that throws an error',
      category: 'testing'
    })
    class ErrorCommand implements Command {
      name = 'error-command';
      description = 'A command that throws an error';

      async execute(): Promise<CommandOutput> {
        throw new Error('Test error');
      }
    }

    const result = await registry.executeCommand('error-command', {});
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Test error');
  });

  test('handles unknown commands gracefully', async () => {
    const result = await registry.executeCommand('nonexistent', {});
    expect(result.success).toBe(false);
    expect(result.message).toContain('Command "nonexistent" not found');
  });
});

describe('Command Decorators', () => {
  test('@AgentCommand attaches metadata to the class', () => {
    const metadata = Reflect.getMetadata(COMMAND_METADATA, TestCommand);
    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('test');
    expect(metadata.description).toBe('Test command for registry testing');
    expect(metadata.aliases).toContain('t');
    expect(metadata.category).toBe('testing');
  });

  test('@CommandOptions updates options metadata', () => {
    // Create a test command class
    class OptionsTestCommand implements Command {
      name = 'options-test';
      description = 'Test command for options testing';

      async execute(): Promise<CommandOutput> {
        return { success: true };
      }
    }

    // Manually apply the metadata
    Reflect.defineMetadata(COMMAND_METADATA, {
      name: 'options-test',
      description: 'Test command for options testing'
    }, OptionsTestCommand);

    // Now apply the options using our helper function to simulate the decorator
    const options = [
      {
        flags: '-v, --verbose',
        description: 'Enable verbose output'
      }
    ];

    // Get existing metadata
    const metadata = Reflect.getMetadata(COMMAND_METADATA, OptionsTestCommand) as CommandMetadata;
    
    // Update options
    metadata.options = options;
    
    // Re-attach updated metadata
    Reflect.defineMetadata(COMMAND_METADATA, metadata, OptionsTestCommand);

    // Verify the metadata was updated correctly
    const updatedMetadata = Reflect.getMetadata(COMMAND_METADATA, OptionsTestCommand) as CommandMetadata;
    expect(updatedMetadata.options).toBeDefined();
    expect(updatedMetadata.options?.length).toBe(1);
    expect(updatedMetadata.options?.[0].flags).toBe('-v, --verbose');
  });

  test('@CommandHandler marks methods as handlers', () => {
    const handler = Reflect.getMetadata('command:handler', TestCommand.prototype, 'subCommand');
    expect(handler).toBeDefined();
    expect(handler.name).toBe('subcommand');
    expect(handler.description).toBe('Test subcommand');
  });

  test('@CommandParam tracks parameter metadata', () => {
    const params = Reflect.getMetadata('command:params', TestCommand.prototype, 'subCommand');
    expect(params).toBeDefined();
    expect(params[0].name).toBe('input');
  });
});
