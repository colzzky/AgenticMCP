/**
 * @file Mock implementation of FilePathProcessor for tests
 */

import { mock } from 'jest-mock-extended';
import type { FilePathProcessor } from '../../src/context/filePathProcessor';

/**
 * Create a mock FilePathProcessor using jest-mock-extended
 * @returns A mocked FilePathProcessor instance
 */
export function createMockFilePathProcessor(): jest.Mocked<FilePathProcessor> {
  const mockProcessor = mock<FilePathProcessor>();
  
  // Configure default behavior
  mockProcessor.processArgs.mockImplementation(async (args: string[]) => {
    const fileArgs = args.filter(arg => typeof arg === 'string' && 
      (arg.endsWith('.txt') || arg.endsWith('.md') || arg.endsWith('.js')));
    const remainingArgs = args.filter(arg => !fileArgs.includes(arg));
    
    const context = fileArgs.length > 0 
      ? `Content from files: ${fileArgs.join(', ')}` 
      : '';
      
    return { context, remainingArgs };
  });
  
  return mockProcessor;
}

/**
 * In-memory file system for tests
 */
export class TestFileStore {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  
  /**
   * Reset the test file store
   */
  reset(): void {
    this.files.clear();
    this.directories.clear();
  }
  
  /**
   * Add a test file
   * @param path - Path to the file
   * @param content - File content
   */
  addFile(path: string, content: string): void {
    this.files.set(path, content);
    
    // Also add the directory
    const dirPath = path.slice(0, path.lastIndexOf('/'));
    if (dirPath) this.directories.add(dirPath);
  }
  
  /**
   * Add a test directory
   * @param path - Directory path
   */
  addDirectory(path: string): void {
    this.directories.add(path);
  }
  
  /**
   * Check if path exists
   * @param path - Path to check
   */
  exists(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }
  
  /**
   * Check if path is a file
   * @param path - Path to check
   */
  isFile(path: string): boolean {
    return this.files.has(path);
  }
  
  /**
   * Check if path is a directory
   * @param path - Path to check
   */
  isDirectory(path: string): boolean {
    return this.directories.has(path);
  }
  
  /**
   * Get file content
   * @param path - File path
   */
  getFileContent(path: string): string | undefined {
    return this.files.get(path);
  }
}
