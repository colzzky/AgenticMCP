/**
 * @file In-memory filesystem implementation for testing
 */

import { IFileSystem, DirectoryEntry } from '../../src/core/interfaces/file-system.interface';

/**
 * In-memory implementation of the IFileSystem interface for testing
 */
export class InMemoryFileSystem implements IFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Map<string, string[]> = new Map();

  /**
   * Check if a file or directory exists
   * @param path - Path to check
   */
  async access(path: string): Promise<void> {
    const fileExists = this.files.has(path);
    const dirExists = this.directories.has(path);

    if (!fileExists && !dirExists) {
      throw new Error(`ENOENT: no such file or directory, access '${path}'`);
    }
  }

  /**
   * Get file or directory stats
   * @param path - Path to get stats for
   */
  async stat(path: string): Promise<{
    isDirectory: () => boolean;
    size: number;
  }> {
    const isDir = this.directories.has(path);
    const isFile = this.files.has(path);

    if (!isDir && !isFile) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }

    return {
      isDirectory: () => isDir,
      size: isFile ? (this.files.get(path) || '').length : 0
    };
  }

  /**
   * Read file contents
   * @param path - Path to file
   * @param encoding - File encoding
   */
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, readFile '${path}'`);
    }
    return content;
  }

  /**
   * Read directory contents
   * @param path - Path to directory
   */
  async readdir(path: string): Promise<string[]> {
    const entries = this.directories.get(path);
    if (entries === undefined) {
      throw new Error(`ENOENT: no such file or directory, readdir '${path}'`);
    }
    return [...entries];
  }

  /**
   * Write to file
   * @param path - Path to file
   * @param data - Content to write
   */
  async writeFile(path: string, data: string): Promise<void> {
    // Ensure parent directory exists
    const dirPath = path.substring(0, path.lastIndexOf('/'));
    if (dirPath && !this.directories.has(dirPath)) {
      await this.mkdir(dirPath, { recursive: true });
    }
    
    this.files.set(path, data);
    
    // Add file to parent directory if not already there
    if (dirPath) {
      const filename = path.substring(path.lastIndexOf('/') + 1);
      const entries = this.directories.get(dirPath) || [];
      if (!entries.includes(filename)) {
        entries.push(filename);
        this.directories.set(dirPath, entries);
      }
    }
  }

  /**
   * Delete a file
   * @param path - Path to file
   */
  async unlink(path: string): Promise<void> {
    if (!this.files.has(path)) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }
    
    // Remove from parent directory entries
    const dirPath = path.substring(0, path.lastIndexOf('/'));
    const filename = path.substring(path.lastIndexOf('/') + 1);
    if (dirPath && this.directories.has(dirPath)) {
      const entries = this.directories.get(dirPath) || [];
      const updatedEntries = entries.filter(entry => entry !== filename);
      this.directories.set(dirPath, updatedEntries);
    }
    
    this.files.delete(path);
  }

  /**
   * Create a directory
   * @param path - Path to directory
   * @param options - Directory creation options
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    // If directory already exists, nothing to do
    if (this.directories.has(path)) {
      return;
    }

    if (options?.recursive) {
      // Create parent directories recursively
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';
      
      for (const part of parts) {
        if (currentPath) {
          currentPath += '/' + part;
        } else {
          currentPath = '/' + part;
        }
        
        if (!this.directories.has(currentPath)) {
          this.directories.set(currentPath, []);
          
          // Add to parent directory
          const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
          if (parentPath && this.directories.has(parentPath)) {
            const parentEntries = this.directories.get(parentPath) || [];
            const dirName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
            if (!parentEntries.includes(dirName)) {
              parentEntries.push(dirName);
              this.directories.set(parentPath, parentEntries);
            }
          }
        }
      }
    } else {
      // Non-recursive mkdir requires parent to exist
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      if (parentPath && !this.directories.has(parentPath)) {
        throw new Error(`ENOENT: no such directory, mkdir '${path}'`);
      }
      
      this.directories.set(path, []);
      
      // Add to parent directory
      if (parentPath) {
        const parentEntries = this.directories.get(parentPath) || [];
        const dirName = path.substring(path.lastIndexOf('/') + 1);
        parentEntries.push(dirName);
        this.directories.set(parentPath, parentEntries);
      }
    }
  }

  /**
   * Remove a directory
   * @param path - Path to directory
   * @param options - Directory removal options
   */
  async rmdir(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such directory, rmdir '${path}'`);
    }
    
    const entries = this.directories.get(path) || [];
    
    if (entries.length > 0 && !(options?.force || options?.recursive)) {
      throw new Error(`ENOTEMPTY: directory not empty, rmdir '${path}'`);
    }
    
    if (options?.recursive) {
      // Get all files and dirs under this path
      const allPaths = [...this.files.keys(), ...this.directories.keys()]
        .filter(p => p.startsWith(`${path}/`));
      
      // Remove all files under this path
      for (const filePath of allPaths) {
        if (this.files.has(filePath)) {
          this.files.delete(filePath);
        }
        if (this.directories.has(filePath)) {
          this.directories.delete(filePath);
        }
      }
    }
    
    // Remove from parent directory entries
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    const dirName = path.substring(path.lastIndexOf('/') + 1);
    if (parentPath && this.directories.has(parentPath)) {
      const parentEntries = this.directories.get(parentPath) || [];
      const updatedEntries = parentEntries.filter(entry => entry !== dirName);
      this.directories.set(parentPath, updatedEntries);
    }
    
    this.directories.delete(path);
  }

  // Additional utility methods for testing

  /**
   * Create a file with the specified content
   * @param path - Path to file
   * @param content - File content
   */
  async createFile(path: string, content: string): Promise<void> {
    await this.writeFile(path, content);
  }

  /**
   * Create a directory structure
   * @param structure - Object representing directory structure
   * @param basePath - Base path to create structure under
   */
  async createDirectoryStructure(
    structure: Record<string, string | Record<string, string>>,
    basePath = ''
  ): Promise<void> {
    for (const [name, content] of Object.entries(structure)) {
      const path = basePath ? `${basePath}/${name}` : name;
      
      if (typeof content === 'string') {
        await this.createFile(path, content);
      } else {
        await this.mkdir(path, { recursive: true });
        await this.createDirectoryStructure(content, path);
      }
    }
  }

  /**
   * Reset the filesystem to empty state
   */
  reset(): void {
    this.files.clear();
    this.directories.clear();
  }

  /**
   * Debug method to print the current state of the filesystem
   */
  debug(): void {
    console.log('Files:');
    this.files.forEach((content, path) => {
      console.log(`  ${path} (${content.length} bytes)`);
    });
    
    console.log('Directories:');
    this.directories.forEach((entries, path) => {
      console.log(`  ${path}/`);
      entries.forEach(entry => console.log(`    - ${entry}`));
    });
  }
}