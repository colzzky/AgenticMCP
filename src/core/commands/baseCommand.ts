/**
 * @file Base command class with file path processing functionality
 */

import type { Command, CommandContext, CommandOutput } from '../types/command.types';
import type { Logger } from '../types/logger.types';
import { FilePathProcessor } from '../../context/filePathProcessor';

/**
 * Base class for commands that need to process file paths as context
 */
export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  aliases?: string[];
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: unknown;
  }>;
  
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
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
    
    // Create a file path processor
    const processor = new FilePathProcessor(this.logger);
    
    // Process the arguments
    return processor.processArgs(stringArgs);
  }

  /**
   * Main command execution method
   * Implemented by derived classes
   */
  abstract execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput>;

  /**
   * Get help text for the command
   */
  abstract getHelp(): string;
}