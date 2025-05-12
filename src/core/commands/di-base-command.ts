/**
 * @file Base command class with dependency injection for file path processing
 */

import type { Command, CommandContext, CommandOutput } from '../types/command.types';
import type { Logger } from '../types/logger.types';
import { DIContainer } from '../di/container';
import { DI_TOKENS } from '../di/tokens';
import { DIFilePathProcessor } from '../../context/di-file-path-processor';

/**
 * Base class for commands that need to process file paths as context
 * This version uses dependency injection for better testability
 */
export abstract class DIBaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  aliases?: string[];
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: unknown;
  }>;
  
  protected logger: Logger;
  protected container: DIContainer;

  constructor(logger: Logger, container?: DIContainer) {
    this.logger = logger;
    this.container = container || DIContainer.getInstance();
  }

  /**
   * Process arguments, extracting file paths and loading them as context
   * @param args - Command arguments
   * @returns Object containing processed context and remaining args
   */
  protected async processFileArgs(
    args: unknown[]
  ): Promise<{ context: string; remainingArgs: string[] }> {
    // Convert args to strings, filtering out non-string values
    const stringArgs = args.filter(arg => typeof arg === 'string') as string[];
    
    // Get file path processor from DI container
    const processor = this.container.get<DIFilePathProcessor>(DI_TOKENS.FILE_PATH_PROCESSOR);
    
    // Process the arguments
    return processor.processArgs(stringArgs);
  }

  /**
   * Main command execution method
   * Implemented by derived classes
   */
  abstract execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput>;
}
