/**
 * Command initializer for loading and registering commands
 */

import { CommandRegistry } from './registry';
import { info, error, debug } from '../utils/logger';

/**
 * Command initializer class.
 * Responsible for loading and initializing all commands in the application.
 */
export class CommandInitializer {
  private registry: CommandRegistry;

  constructor() {
    this.registry = CommandRegistry.getInstance();
  }

  /**
   * Initialize command modules
   * This will load all command modules and register them with the registry
   */
  public async initialize(): Promise<void> {
    debug('Initializing command registry...');

    try {
      // Dynamic import of command modules
      // This helps with automatic discovery and registration of commands
      
      // Example commands
      await import('../../commands/examples');
      info('Loaded example commands');
      
      // In a real app, you'd dynamically import more command modules here
      // await import('../../commands/writer');
      // await import('../../commands/coder');
      // etc.

      const commandCount = this.registry.getCommandNames().length;
      info(`Command initialization complete. ${commandCount} commands registered.`);

    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : String(error_);
      error(`Error initializing commands: ${message}`);
      throw error_;
    }
  }

  /**
   * Get all registered command names
   */
  public getCommandNames(): string[] {
    return this.registry.getCommandNames();
  }

  /**
   * Get all commands by category
   */
  public getCommandsByCategory(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    
    for (const category of this.registry.getCategories()) {
      result[category] = this.registry.getCommandsByCategory(category);
    }
    
    return result;
  }
}

export default CommandInitializer;
