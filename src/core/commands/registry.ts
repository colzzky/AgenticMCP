import 'reflect-metadata';
import type { Command, CommandContext, CommandOutput } from '../types/command.types';
import { info, error, debug } from '../utils/logger';

/**
 * Symbol used to store command metadata on class constructors
 */
export const COMMAND_METADATA = Symbol('command:metadata');

/**
 * Command metadata interface
 */
export interface CommandMetadata {
  name: string;
  description: string;
  aliases?: string[];
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: unknown;
  }>;
  category?: string;
}

/**
 * Type for a command class constructor
 */
export type CommandClass = new (...args: any[]) => Command;

/**
 * Registry for all commands in the application.
 * Uses a decorator-based approach for registration.
 */
export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, CommandClass> = new Map();
  private aliases: Map<string, string> = new Map();
  private categoryMap: Map<string, string[]> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize maps
  }

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  /**
   * Register a command class with the registry
   * This is typically called by the @Command decorator
   */
  public registerCommand(commandClass: CommandClass): void {
    const metadata = this.getCommandMetadata(commandClass);
    if (!metadata) {
      throw new Error(
        `Cannot register command class: ${commandClass.name} missing metadata. Use @AgentCommand decorator.`
      );
    }

    // Register the command by name
    this.commands.set(metadata.name, commandClass);
    debug(`Registered command: ${metadata.name}`);

    // Register aliases if any
    if (metadata.aliases && metadata.aliases.length > 0) {
      for (const alias of metadata.aliases) {
        this.aliases.set(alias, metadata.name);
        debug(`Registered alias: ${alias} -> ${metadata.name}`);
      }
    }

    // Add to category map if a category is specified
    if (metadata.category) {
      const categoryCommands = this.categoryMap.get(metadata.category) || [];
      categoryCommands.push(metadata.name);
      this.categoryMap.set(metadata.category, categoryCommands);
      debug(`Added command ${metadata.name} to category: ${metadata.category}`);
    }
  }

  /**
   * Get a command class by name or alias
   */
  public getCommand(nameOrAlias: string): CommandClass | undefined {
    // Check if this is an alias and resolve to the actual command name
    const commandName = this.aliases.get(nameOrAlias) || nameOrAlias;
    return this.commands.get(commandName);
  }

  /**
   * Get all registered command names
   */
  public getCommandNames(): string[] {
    return [...this.commands.keys()];
  }

  /**
   * Get all registered commands by category
   */
  public getCommandsByCategory(category: string): string[] {
    return this.categoryMap.get(category) || [];
  }

  /**
   * Get all categories
   */
  public getCategories(): string[] {
    return [...this.categoryMap.keys()];
  }

  /**
   * Get all commands
   */
  public getAllCommands(): Array<{ name: string; metadata: CommandMetadata }> {
    return [...this.commands.entries()].map(([name, commandClass]) => ({
      name,
      metadata: this.getCommandMetadata(commandClass) as CommandMetadata
    }));
  }

  /**
   * Execute a command by name with given context and arguments
   */
  public async executeCommand(
    nameOrAlias: string,
    context: CommandContext,
    ...args: unknown[]
  ): Promise<CommandOutput> {
    const CommandClass = this.getCommand(nameOrAlias);
    
    if (!CommandClass) {
      error(`Command not found: ${nameOrAlias}`);
      return {
        success: false,
        error: new Error(`Command not found: ${nameOrAlias}`),
        message: `Command "${nameOrAlias}" not found. Available commands: ${this.getCommandNames().join(', ')}`
      };
    }

    try {
      const command = new CommandClass();
      info(`Executing command: ${nameOrAlias}`);
      return await command.execute(context, ...args);
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : String(error_);
      error(`Error executing command ${nameOrAlias}: ${message}`);
      return {
        success: false,
        error: error_ instanceof Error ? error_ : new Error(String(error_)),
        message: `Error executing command "${nameOrAlias}": ${message}`
      };
    }
  }

  /**
   * Get command metadata from a command class
   */
  private getCommandMetadata(commandClass: CommandClass): CommandMetadata | undefined {
    return Reflect.getMetadata(COMMAND_METADATA, commandClass) as CommandMetadata | undefined;
  }

  /**
   * Reset the registry (mainly for testing)
   */
  public reset(): void {
    this.commands.clear();
    this.aliases.clear();
    this.categoryMap.clear();
    debug('Command registry reset');
  }
}

/**
 * Get the global command registry instance
 */
export function getCommandRegistry(): CommandRegistry {
  return CommandRegistry.getInstance();
}

export default CommandRegistry;
