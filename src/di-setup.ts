/**
 * @file Dependency injection setup for the application
 * This file configures the DI container and provides factory functions
 * to create DI-enabled components
 */

import { DIContainer } from './core/di/container';
import { registerAllDependencies } from './core/di/registry';
import { DI_TOKENS } from './core/di/tokens';
import { DIBaseCommand } from './core/commands/di-base-command';
import { DILLMCommand } from './commands/di-llm-command';
import { logger } from './core/utils';

/**
 * Initialize the dependency injection container
 * @returns The configured DI container instance
 */
export function initializeDI(): DIContainer {
  const container = DIContainer.getInstance();
  registerAllDependencies(container);
  return container;
}

/**
 * Factory function to create DI-enabled commands
 */
export const CommandFactory = {
  /**
   * Create a new LLM command with dependency injection
   * @returns A new LLMCommand instance with injected dependencies
   */
  createLLMCommand(): DILLMCommand {
    // Ensure DI is initialized
    const container = initializeDI();
    // Create command with logger from container
    return new DILLMCommand(
      container.get(DI_TOKENS.LOGGER),
      container
    );
  },
  
  /**
   * Create a custom command with dependency injection
   * @param CommandClass - The command class to instantiate
   * @returns A new command instance with injected dependencies
   */
  createCommand<T extends DIBaseCommand>(CommandClass: new (logger: any, container?: DIContainer) => T): T {
    // Ensure DI is initialized
    const container = initializeDI();
    // Create command with logger from container
    return new CommandClass(
      container.get(DI_TOKENS.LOGGER),
      container
    );
  }
};

// Export a pre-initialized container for convenience
export const diContainer = initializeDI();
