import type { PathDI, FileSystemDI } from '../../types/global.types';

/**
 * @file Interface for file system operations to enable dependency injection and testability
 */

/**
 * Represents an entry within a directory listing.
 */
export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number; // Size might not be available for all entry types or systems
}

/**
 * Represents a result from a file search operation.
 */
export interface FileSearchResult {
  path: string;
  score?: number; // Optional relevance score
}

/**
 * Interface for file system operations 
 * This enables dependency injection and testability by decoupling from direct fs usage
 */
export interface IFileSystem {

  pathDI: PathDI;
  fileSystemDI: FileSystemDI;

  /**
   * Check if a file or directory exists
   * @param path - Path to check
   */
  access(path: string): Promise<void>;
  
  /**
   * Get file or directory stats
   * @param path - Path to get stats for
   */
  stat(path: string): Promise<{
    isDirectory: () => boolean;
    size: number;
    birthtime: Date;
    mtime: Date;
    atime: Date;
    isFile: () => boolean;
    mode: number;
  }>;
  
  /**
   * Read file contents
   * @param path - Path to file
   * @param encoding - File encoding
   */
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  
  /**
   * Read directory contents
   * @param path - Path to directory
   */
  readdir(path: string): Promise<string[]>;
  
  /**
   * Write to file
   * @param path - Path to file
   * @param data - Content to write
   */
  writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void>;
  
  /**
   * Delete a file
   * @param path - Path to file
   */
  unlink(path: string): Promise<void>;
  
  /**
   * Create a directory
   * @param path - Path to directory
   * @param options - Directory creation options
   */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  
  /**
   * Remove a directory
   * @param path - Path to directory
   * @param options - Directory removal options
   */
  rmdir(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;


  /**
   * Resolve the real path of a given path
   * @param path - Path to resolve
   */
  realpath(path: string): Promise<string>;

  rename(source: string, destination: string): Promise<void>;

}
