/**
 * @file Base command class with file path processing functionality
 */

import type { Command, CommandContext, CommandOutput } from '../types/command.types';
import type { Logger } from '../types/logger.types';
import type { FilePathProcessor } from '../../context/filePathProcessor';

/**
 * Factory interface for creating FilePathProcessors
 */
export interface FilePathProcessorFactory {
  create(logger: Logger): FilePathProcessor;
}

/**
 * Default implementation of the FilePathProcessorFactory
 */
export class DefaultFilePathProcessorFactory implements FilePathProcessorFactory {
  create(logger: Logger): FilePathProcessor {
    // Import is done here to avoid circular dependency
    const { FilePathProcessor } = require('../../context/filePathProcessor');
    return new FilePathProcessor(logger);
  }
}

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
  protected filePathProcessorFactory: FilePathProcessorFactory;

  constructor(
    logger: Logger,
    filePathProcessorFactory?: FilePathProcessorFactory
  ) {
    this.logger = logger;
    this.filePathProcessorFactory = filePathProcessorFactory || new DefaultFilePathProcessorFactory();
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
    
    // Create a file path processor using the factory (for better testability)
    const processor = this.filePathProcessorFactory.create(this.logger);
    
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