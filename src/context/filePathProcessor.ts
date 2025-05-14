/**
 * @file Utility for processing file path arguments into context - DI enabled version
 */

import type { PathDI, FileSystemDI } from '../types/global.types';
import { FileContextManager } from './contextManager';
import type { Logger } from '../core/types/logger.types';
import { IFileSystem } from '../core/interfaces/file-system.interface';

/**
 * Options for file path processing
 */
export interface FilePathProcessorOptions {
  /** Base directory for relative paths (defaults to process.cwd()) */
  baseDir?: string;
  /** Whether to process directories recursively */
  recursive?: boolean;
  /** Maximum depth for directory traversal */
  maxDepth?: number;
  /** File patterns to include (e.g. "*.md") */
  includePatterns?: string[];
}

/**
 * Default options for file path processing
 */
const DEFAULT_OPTIONS: FilePathProcessorOptions = {
  baseDir: process.cwd(),
  recursive: true,
  maxDepth: 5,
  includePatterns: ['**/*']
};

/**
 * Utility class for processing file path arguments into context
 * This version uses dependency injection for testability
 */
export class DIFilePathProcessor {
  private contextManager: FileContextManager;
  private logger: Logger;
  private fileSystem: IFileSystem;
  private options: FilePathProcessorOptions;
  private pathDI: PathDI;
  private processDi: NodeJS.Process;

  /**
   * Creates a new FilePathProcessor with dependency injection
   * @param logger - Logger instance
   * @param fileSystem - File system implementation 
   * @param options - Processing options
   */
  constructor(
    logger: Logger, 
    fileSystem: IFileSystem,
    pathDI: PathDI,
    fileSystemDI: FileSystemDI,
    processDi: NodeJS.Process,
    options: FilePathProcessorOptions = {}
  ) {
    this.logger = logger;
    this.fileSystem = fileSystem;
    this.pathDI = pathDI;
    this.processDi = processDi;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.contextManager = new FileContextManager(pathDI, fileSystemDI);
  }

  /**
   * Process an array of arguments, extracting file paths and loading their contents
   * @param args - Command line arguments
   * @returns Object containing processed context and remaining non-file arguments
   */
  public async processArgs(args: string[]): Promise<{
    context: string;
    remainingArgs: string[];
  }> {
    const filePaths: string[] = [];
    const remainingArgs: string[] = [];

    // First pass: identify file paths
    for (const arg of args) {
      try {
        // Check if the argument is a file path
        const isFilePath = await this.isExistingPath(arg);
        if (isFilePath) {
          filePaths.push(arg);
        } else {
          remainingArgs.push(arg);
        }
      } catch {
        // If error checking path, assume it's not a file path
        remainingArgs.push(arg);
      }
    }

    // If we found file paths, load their contents
    if (filePaths.length > 0) {
      await this.loadFilePaths(filePaths);
      const contextItems = await this.contextManager.getContextItems();

      // Combine all context items into a single string
      let context = '';
      
      for (const item of contextItems) {
        if (item.content) {
          if (context) context += '\n\n';
          context += `--- ${ this.pathDI.basename(item.sourcePath || '')} ---\n`;
          context += item.content;
        }
      }

      return { context, remainingArgs };
    }

    // No file paths found
    return { context: '', remainingArgs };
  }

  /**
   * Checks if a path exists (file or directory)
   * @param pathStr - Path to check
   * @returns Promise resolving to true if the path exists
   */
  private async isExistingPath(pathStr: string): Promise<boolean> {
    try {
      // Resolve relative paths against base directory
      const resolvedPath =  this.pathDI.isAbsolute(pathStr) 
        ? pathStr 
        :  this.pathDI.resolve(this.options.baseDir || this.processDi.cwd(), pathStr);
      
      await this.fileSystem.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Loads context from file paths
   * @param filePaths - Array of file paths to load
   */
  private async loadFilePaths(filePaths: string[]): Promise<void> {
    // Clear any existing context
    await this.contextManager.clearContext();

    // Process each file path
    for (const filePath of filePaths) {
      try {
        // Resolve relative paths against base directory
        const resolvedPath =  this.pathDI.isAbsolute(filePath) 
          ? filePath 
          :  this.pathDI.resolve(this.options.baseDir || this.processDi.cwd(), filePath);
        
        const stat = await this.fileSystem.stat(resolvedPath);
        
        // Add as a context source
        await this.contextManager.addSource({
          type: stat.isDirectory() ? 'directory' : 'file',
          path: resolvedPath,
          recursive: this.options.recursive,
          maxDepth: this.options.maxDepth,
          globPatterns: this.options.includePatterns
        });
        
        this.logger.debug(`Added ${stat.isDirectory() ? 'directory' : 'file'} to context: ${resolvedPath}`);
      } catch (error) {
        this.logger.error(`Error loading file path: ${filePath}`, error);
      }
    }
  }
}
