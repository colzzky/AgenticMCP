/**
 * @file In-memory filesystem implementation for tests
 */

import path from 'node:path';
import { IFileSystem } from '../../src/core/interfaces/file-system.interface';

/**
 * Represents a file or directory in the in-memory filesystem
 */
interface FileSystemEntry {
  /** Whether this entry is a directory */
  isDirectory: boolean;
  /** Content of the file (empty for directories) */
  content?: string;
  /** Child entries for directories */
  children?: Map<string, FileSystemEntry>;
  /** Last modification time */
  mtime: Date;
}

/**
 * Implementation of a filesystem that exists only in memory
 * Used for testing file operations without touching the actual filesystem
 */
export class InMemoryFileSystem implements IFileSystem {
  private root: Map<string, FileSystemEntry>;
  
  constructor() {
    this.root = new Map();
  }
  
  /**
   * Create an empty directory at the given path
   * @param directoryPath - Path to create
   */
  public createDirectory(directoryPath: string): void {
    const normalizedPath = this.normalizePath(directoryPath);
    const parts = this.getPathParts(normalizedPath);
    
    let current = this.root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.has(part)) {
        if (i === parts.length - 1) {
          // Create the final directory
          current.set(part, {
            isDirectory: true,
            children: new Map(),
            mtime: new Date()
          });
        } else {
          // Create intermediate directory
          current.set(part, {
            isDirectory: true,
            children: new Map(),
            mtime: new Date()
          });
        }
      } else if (!current.get(part)!.isDirectory) {
        throw new Error(`Path ${normalizedPath} exists but is not a directory`);
      }
      
      // Move to the next level
      current = current.get(part)!.children!;
    }
  }
  
  /**
   * Creates a file with the given content
   * @param filePath - Path to the file
   * @param content - Content to write
   */
  public createFile(filePath: string, content: string): void {
    const normalizedPath = this.normalizePath(filePath);
    const parts = this.getPathParts(normalizedPath);
    
    if (parts.length === 0) {
      throw new Error('Invalid file path');
    }
    
    // The file name is the last part of the path
    const fileName = parts.pop()!;
    
    // Create parent directories if needed
    if (parts.length > 0) {
      const dirPath = path.join('/', ...parts);
      this.createDirectory(dirPath);
    }
    
    // Get the parent directory
    let current = this.navigateToDirectory(parts);
    
    // Create/update the file
    current.set(fileName, {
      isDirectory: false,
      content,
      mtime: new Date()
    });
  }
  
  /**
   * Check if a file or directory exists
   * @param path - Path to check
   */
  public async access(path: string): Promise<void> {
    try {
      this.getEntry(path);
      return;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get file or directory stats
   * @param path - Path to get stats for
   */
  public async stat(path: string): Promise<{
    isDirectory: () => boolean;
    size: number;
    mtime?: Date;
  }> {
    const entry = this.getEntry(path);
    
    return {
      isDirectory: () => entry.isDirectory,
      size: entry.isDirectory ? 0 : (entry.content?.length || 0),
      mtime: entry.mtime
    }
  }
  
  /**
   * Read file contents
   * @param path - Path to file
   * @param encoding - Ignored in this implementation
   */
  public async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    const entry = this.getEntry(path);
    
    if (entry.isDirectory) {
      throw new Error(`EISDIR: illegal operation on a directory, read ${path}`);
    }
    
    return entry.content || ''
  }
  
  /**
   * Read directory contents
   * @param path - Path to directory
   */
  public async readdir(path: string): Promise<string[]> {
    const entry = this.getEntry(path);
    
    if (!entry.isDirectory) {
      throw new Error(`ENOTDIR: not a directory, scandir ${path}`);
    }
    
    return Array.from(entry.children!.keys())
  }
  
  /**
   * Write to file
   * @param path - Path to file
   * @param data - Content to write
   */
  public async writeFile(path: string, data: string): Promise<void> {
    try {
      this.createFile(path, data);
      return;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Delete a file
   * @param path - Path to file
   */
  public async unlink(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const parts = this.getPathParts(normalizedPath);
    
    if (parts.length === 0) {
      throw new Error('Cannot delete root directory');
    }
    
    const fileName = parts.pop()!;
    const parentDir = this.navigateToDirectory(parts);
    
    if (!parentDir.has(fileName)) {
      throw new Error(`ENOENT: no such file or directory, unlink ${path}`);
    }
    
    const entry = parentDir.get(fileName)!;
    if (entry.isDirectory) {
      throw new Error(`EISDIR: illegal operation on a directory, unlink ${path}`);
    }
    
    parentDir.delete(fileName);
    return;
  }
  
  /**
   * Create a directory
   * @param path - Path to directory
   * @param options - Directory creation options
   */
  public async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const parts = this.getPathParts(normalizedPath);
    
    if (options?.recursive) {
      // Create parent directories
      try {
        this.createDirectory(normalizedPath);
        return;
      } catch (error) {
        throw error;
      }
    } else {
      // Only create the final directory, not parents
      if (parts.length === 0) {
        throw new Error('Invalid directory path');
      }
      
      try {
        // Check if parent exists
        const parentParts = parts.slice(0, -1);
        const parentPath = parentParts.join('/');
        
        const parentEntry = this.getEntry(parentPath);
        if (!parentEntry.isDirectory) {
          throw new Error(`ENOTDIR: not a directory, mkdir ${path}`);
        }
        
        // Create the directory
        this.createDirectory(normalizedPath);
        return;
      } catch (error) {
        throw error;
      }
    }
  }
  
  /**
   * Remove a directory
   * @param path - Path to directory
   * @param options - Directory removal options
   */
  public async rmdir(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);
      const parts = this.getPathParts(normalizedPath);

      if (parts.length === 0) {
        throw new Error('Cannot delete root directory');
      }

      const dirName = parts.pop()!;
      const parentDir = this.navigateToDirectory(parts);

      if (!parentDir.has(dirName)) {
        if (options?.force) {
          return;
        }
        throw new Error(`ENOENT: no such file or directory, rmdir ${path}`);
      }

      const entry = parentDir.get(dirName)!;
      if (!entry.isDirectory) {
        throw new Error(`ENOTDIR: not a directory, rmdir ${path}`);
      }

      if (!options?.recursive && entry.children!.size > 0) {
        throw new Error(`ENOTEMPTY: directory not empty, rmdir ${path}`);
      }

      parentDir.delete(dirName);
      return;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Clear all files and directories
   */
  public clear(): void {
    this.root.clear();
  }
  
  /**
   * Debugging helper to dump the filesystem structure
   */
  public dumpFileSystem(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [name, entry] of this.root.entries()) {
      if (entry.isDirectory) {
        result[name] = this.dumpDirectory(entry.children!);
      } else {
        result[name] = entry.content;
      }
    }
    
    return result;
  }
  
  /**
   * Helper to dump a directory structure
   */
  private dumpDirectory(dir: Map<string, FileSystemEntry>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [name, entry] of dir.entries()) {
      if (entry.isDirectory) {
        result[name] = this.dumpDirectory(entry.children!);
      } else {
        result[name] = entry.content;
      }
    }
    
    return result;
  }
  
  /**
   * Find an entry at the given path
   */
  private getEntry(entryPath: string): FileSystemEntry {
    const normalizedPath = this.normalizePath(entryPath);
    const parts = this.getPathParts(normalizedPath);
    
    if (parts.length === 0) {
      // Root directory
      return {
        isDirectory: true,
        children: this.root,
        mtime: new Date()
      };
    }
    
    let current = this.root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.has(part)) {
        throw new Error(`ENOENT: no such file or directory, stat ${entryPath}`);
      }
      
      const entry = current.get(part)!;
      if (i === parts.length - 1) {
        // This is the entry we're looking for
        return entry;
      }
      
      if (!entry.isDirectory) {
        throw new Error(`ENOTDIR: not a directory, scandir ${entryPath}`);
      }
      
      // Move to the next level
      current = entry.children!;
    }
    
    // Should never reach here
    throw new Error(`Internal error navigating to ${entryPath}`);
  }
  
  /**
   * Navigate to a directory and return its children map
   */
  private navigateToDirectory(parts: string[]): Map<string, FileSystemEntry> {
    let current = this.root;
    
    for (const part of parts) {
      if (!current.has(part)) {
        throw new Error(`Directory not found: ${part}`);
      }
      
      const entry = current.get(part)!;
      if (!entry.isDirectory) {
        throw new Error(`Not a directory: ${part}`);
      }
      
      current = entry.children!;
    }
    
    return current;
  }
  
  /**
   * Normalize a path to a standard format
   */
  private normalizePath(inputPath: string): string {
    let normalizedPath = path.normalize(inputPath);
    
    // Remove leading slashes for our internal representation
    return normalizedPath;
  }
  
  /**
   * Split a path into its component parts
   */
  private getPathParts(normalizedPath: string): string[] {
    return normalizedPath.split(path.sep).filter(part => part !== '');
  }
}