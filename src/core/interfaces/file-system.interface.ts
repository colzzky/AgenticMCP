/**
 * @file Interface for file system operations to enable dependency injection and testability
 */

/**
 * Interface for file system operations 
 * This enables dependency injection and testability by decoupling from direct fs usage
 */
export interface IFileSystem {
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
  writeFile(path: string, data: string): Promise<void>;
  
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
}
