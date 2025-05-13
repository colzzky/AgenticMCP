/**
 * @file Base command class with file path processing functionality
 */

import type { Command, CommandContext, CommandOutput } from '../types/command.types';
import type { Logger } from '../types/logger.types';
import { DIFilePathProcessor as FilePathProcessor } from '../../context/filePathProcessor';
import type { PathDI, FileSystemDI } from '../../global.types';
import { IFileSystem } from '../interfaces/file-system.interface';

/**
 * Factory interface for creating FilePathProcessors
 */
export interface FilePathProcessorFactory {
  pathDI: PathDI;
  fileSystem: IFileSystem;
  fileSystemDI: FileSystemDI;
  processDi: NodeJS.Process;
  factory: typeof FilePathProcessor;
  create(logger: Logger): FilePathProcessor;
}

/**
 * Default implementation of the FilePathProcessorFactory
 */
export class DefaultFilePathProcessorFactory implements FilePathProcessorFactory {
  pathDI: PathDI;
  fileSystem: IFileSystem;
  fileSystemDI: FileSystemDI;
  processDi: NodeJS.Process;
  factory: typeof FilePathProcessor;

  constructor(
    pathDI: PathDI,
    fileSystem: IFileSystem,
    fileSystemDI: FileSystemDI,
    processDi: NodeJS.Process,
    factory: typeof FilePathProcessor
  ) {
    this.pathDI = pathDI;
    this.fileSystem = fileSystem;
    this.fileSystemDI = fileSystemDI;
    this.processDi = processDi;
    this.factory = factory;
  }

  create(logger: Logger): FilePathProcessor {
    return new this.factory(
    logger,
    this.fileSystem,
    this.pathDI,
    this.fileSystemDI,
    this.processDi,
    {}
    );
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

  protected filePathProcessorFactory: FilePathProcessorFactory;
  protected logger: Logger;

  constructor(
    logger: Logger,
    filePathProcessorFactory: FilePathProcessorFactory
  ) {
    this.logger = logger;
    this.filePathProcessorFactory = filePathProcessorFactory;
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