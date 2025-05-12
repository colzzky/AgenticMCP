/**
 * @file Test implementation of FilePathProcessor for use in tests
 */

import { DIFilePathProcessor } from '../../src/context/di-file-path-processor';
import { Logger } from '../../src/core/types/logger.types';
import { IFileSystem } from '../../src/core/interfaces/file-system.interface';

/**
 * Simplified FilePathProcessor for testing that doesn't rely on actual file system operations
 * This allows us to avoid complex mocking of file operations and directly test the parsing logic
 */
export class TestFilePathProcessor extends DIFilePathProcessor {
  // Map to store test file content by path
  private testFiles: Map<string, string> = new Map();
  // Flag to determine if a path is a directory
  private testDirs: Set<string> = new Set();
  // Store logger reference for testing
  private testLogger: Logger;

  constructor(logger: Logger, fileSystem: IFileSystem) {
    super(logger, fileSystem);
    this.testLogger = logger;
  }

  /**
   * Add a test file with content
   * @param path - File path
   * @param content - File content
   */
  addFile(path: string, content: string): void {
    this.testFiles.set(path, content);
    
    // Add parent directories
    let dirPath = path.slice(0, path.lastIndexOf('/'));
    while (dirPath) {
      this.testDirs.add(dirPath);
      const lastSlash = dirPath.lastIndexOf('/');
      if (lastSlash <= 0) break;
      dirPath = dirPath.slice(0, lastSlash);
    }
  }

  /**
   * Override processArgs to use test files instead of actual file system
   */
  public async processArgs(args: string[]): Promise<{
    context: string;
    remainingArgs: string[];
  }> {
    // Log debug information for testing
    this.testLogger.debug('Processing args:', args);
    
    const filePaths: string[] = [];
    const remainingArgs: string[] = [];

    // Identify file paths using the test file map and dirs
    for (const arg of args) {
      if (this.testFiles.has(arg) || this.testDirs.has(arg)) {
        filePaths.push(arg);
      } else {
        remainingArgs.push(arg);
      }
    }

    // Generate context from test files
    let context = '';
    for (const filePath of filePaths) {
      // Handle directories differently
      if (this.testDirs.has(filePath) && !this.testFiles.has(filePath)) {
        // Find all files in this directory or subdirectories
        for (const [path, content] of this.testFiles.entries()) {
          if (path.startsWith(filePath + '/')) {
            if (context) context += '\n\n';
            context += `--- ${path.slice(path.lastIndexOf('/') + 1)} ---\n`;
            context += content;
          }
        }
      } else if (this.testFiles.has(filePath)) {
        // Regular file
        if (context) context += '\n\n';
        context += `--- ${filePath.slice(filePath.lastIndexOf('/') + 1)} ---\n`;
        context += this.testFiles.get(filePath);
      }
    }

    return { context, remainingArgs };
  }
}
