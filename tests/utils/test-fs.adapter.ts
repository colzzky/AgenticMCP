/**
 * @file In-memory file system adapter for testing
 * Implements the IFileSystem interface for testing purposes
 */

import { IFileSystem } from '../../src/core/interfaces/file-system.interface';

/**
 * An in-memory file system implementation for testing
 * Implements the IFileSystem interface with in-memory state
 */
export class TestFileSystem implements IFileSystem {
  // In-memory data structures
  private files: Map<string, Buffer> = new Map();
  private directories: Set<string> = new Set();
  
  /**
   * Reset the file system state
   */
  reset(): void {
    this.files.clear();
    this.directories.clear();
  }
  
  /**
   * Add a file to the mock file system
   * @param path - File path
   * @param content - File content
   */
  addFile(path: string, content: string): void {
    this.files.set(path, Buffer.from(content));
    
    // Add all parent directories
    let dirPath = path.slice(0, path.lastIndexOf('/'));
    while (dirPath) {
      this.directories.add(dirPath);
      const lastSlash = dirPath.lastIndexOf('/');
      if (lastSlash <= 0) break;
      dirPath = dirPath.slice(0, lastSlash);
    }
  }
  
  /**
   * Add a directory to the mock file system
   * @param path - Directory path
   */
  addDirectory(path: string): void {
    this.directories.add(path);
  }
  
  /**
   * Check if a file or directory exists
   * @param path - Path to check
   */
  private exists(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }
  
  // IFileSystem implementation
  
  /**
   * Check if a path is accessible
   * @param path - Path to check
   */
  async access(path: string): Promise<void> {
    if (!this.exists(path)) {
      throw new Error(`ENOENT: no such file or directory, access '${path}'`);
    }
  }
  
  /**
   * Read a file
   * @param path - Path to read
   * @param encoding - File encoding
   */
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    
    return content.toString(encoding);
  }
  
  /**
   * Get file or directory information
   * @param path - Path to stat
   */
  async stat(path: string): Promise<{ isDirectory: () => boolean; size: number }> {
    if (!this.exists(path)) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    
    const isFile = this.files.has(path);
    const fileContent = this.files.get(path);
    
    return {
      isDirectory: () => this.directories.has(path),
      size: isFile && fileContent ? fileContent.length : 0
    };
  }
  
  /**
   * Create a directory
   * @param path - Directory path to create
   * @param options - Creation options
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (this.exists(path) && !options?.recursive) {
      throw new Error(`EEXIST: file already exists, mkdir '${path}'`);
    }
    
    this.directories.add(path);
    
    // For recursive option, create parent directories too
    if (options?.recursive) {
      let dirPath = path.slice(0, path.lastIndexOf('/'));
      while (dirPath) {
        this.directories.add(dirPath);
        const lastSlash = dirPath.lastIndexOf('/');
        if (lastSlash <= 0) break;
        dirPath = dirPath.slice(0, lastSlash);
      }
    }
  }
  
  /**
   * Write data to a file
   * @param path - File path
   * @param data - Data to write
   */
  async writeFile(path: string, data: string): Promise<void> {
    const content = Buffer.from(data);
    this.files.set(path, content);
    
    // Auto-create parent directory
    const dirPath = path.slice(0, path.lastIndexOf('/'));
    if (dirPath) {
      this.directories.add(dirPath);
    }
  }
  
  /**
   * Read directory contents
   * @param path - Path to directory
   */
  async readdir(path: string): Promise<string[]> {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, readdir '${path}'`);
    }
    
    // Find all files and directories that are direct children of this path
    const entries: string[] = [];
    
    // Add files
    for (const filePath of this.files.keys()) {
      const dirPath = filePath.slice(0, filePath.lastIndexOf('/'));
      if (dirPath === path) {
        entries.push(filePath.slice(filePath.lastIndexOf('/') + 1));
      }
    }
    
    // Add directories
    for (const dirPath of this.directories) {
      if (dirPath !== path && dirPath.startsWith(path)) {
        // Check if it's a direct child (not a nested subdirectory)
        const relativePath = dirPath.slice(path.length + 1); // +1 for the slash
        if (!relativePath.includes('/')) {
          entries.push(relativePath);
        }
      }
    }
    
    return entries;
  }
  
  /**
   * Delete a file
   * @param path - Path to file
   */
  async unlink(path: string): Promise<void> {
    if (!this.files.has(path)) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }
    
    this.files.delete(path);
  }
  
  /**
   * Remove a directory
   * @param path - Path to directory
   */
  async rmdir(path: string): Promise<void> {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, rmdir '${path}'`);
    }
    
    // Check if the directory has any files
    for (const filePath of this.files.keys()) {
      const dirPath = filePath.slice(0, filePath.lastIndexOf('/'));
      if (dirPath === path) {
        throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`);
      }
    }
    
    // Check if the directory has any subdirectories
    for (const dirPath of this.directories) {
      if (dirPath !== path && dirPath.startsWith(path + '/')) {
        throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`);
      }
    }
    
    // Directory is empty, remove it
    this.directories.delete(path);
  }
}
