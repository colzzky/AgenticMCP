/**
 * @file Concrete implementation of IFileSystem using Node.js fs module
 */
import type { PathDI, FileSystemDI } from '../../global.types';
import { IFileSystem, DirectoryEntry, FileSearchResult } from '../interfaces/file-system.interface';

// Basic implementation using Node's fs/promises
export class FileSystemService implements IFileSystem {

  // --- IFileSystem Implementation ---

  pathDI: PathDI;
  fileSystemDI: FileSystemDI;

  constructor(pathDI: PathDI, fileSystemDI: FileSystemDI) {
    this.pathDI = pathDI;
    this.fileSystemDI = fileSystemDI;
  }

  async access(checkPath: string): Promise<void> {
    await this.fileSystemDI.access(checkPath);
  }

  async stat(checkPath: string): Promise<{ isDirectory: () => boolean; size: number; }> {
      const stats = await this.fileSystemDI.stat(checkPath);
      return {
          isDirectory: () => stats.isDirectory(),
          size: stats.size,
      };
  }

  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return this.fileSystemDI.readFile(filePath, encoding);
  }

  async readdir(dirPath: string): Promise<string[]> {
     // IFileSystem expects only names, but our DirectoryEntry needs more.
     // We'll adapt here. If only names are truly needed elsewhere, the interface might need adjustment.
     const entries = await this.fileSystemDI.readdir(dirPath, { withFileTypes: true });
     return entries.map(entry => entry.name);
     // Note: This implementation differs from the previous listDirectory which returned DirectoryEntry[].
     // If DirectoryEntry[] is needed, the interface should specify that return type for readdir.
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure parent directory exists before writing
    await this.mkdir(this.pathDI.dirname(filePath));
    await this.fileSystemDI.writeFile(filePath, content, 'utf-8');
  }

  async unlink(filePath: string): Promise<void> {
    await this.fileSystemDI.unlink(filePath);
  }

  async mkdir(dirPath: string): Promise<void> {
    await this.fileSystemDI.mkdir(dirPath, { recursive: true });
  }

  async rmdir(dirPath: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    // Pass options directly, let this.fileSystemDI.rm handle defaults if options is undefined
    await this.fileSystemDI.rm(dirPath, options);
  }


  // --- Additional Helper Methods (Not strictly part of IFileSystem as defined, but useful) ---
  // Kept previous implementations for potential internal use or future interface expansion

  // Original implementation renamed, kept for potential internal use
  async pathExistsInternal(checkPath: string): Promise<boolean> { 
      try {
          await this.fileSystemDI.access(checkPath);
          return true;
      } catch {
          return false;
      }
  }

  // Original implementation renamed, kept for potential internal use
  async isDirectoryInternal(checkPath: string): Promise<boolean> {
    try {
      const stats = await this.fileSystemDI.stat(checkPath);
      return stats.isDirectory();
    } catch {
      // If stat fails (e.g., path doesn't exist), it's not a directory
      return false;
    }
  }

  // Original implementation renamed, kept for potential internal use or if interface changes
  async listDirectoryInternal(dirPath: string): Promise<DirectoryEntry[]> { 
    const entries = await this.fileSystemDI.readdir(dirPath, { withFileTypes: true });
    // Explicitly type the array resulting from Promise.all
    const results: (DirectoryEntry | undefined)[] = await Promise.all(
      entries.map(async (entry): Promise<DirectoryEntry | undefined> => {
        const fullPath = this.pathDI.join(dirPath, entry.name);
        try {
            const stats = await this.fileSystemDI.stat(fullPath);
            // Ensure the returned object structure matches DirectoryEntry exactly
            const directoryEntry: DirectoryEntry = {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file', // Type assertion not strictly needed here but reinforces intent
              size: stats.size,
            };
            return directoryEntry;
        } catch (error) {
            console.error(`Error stating file ${fullPath}:`, error);
            return undefined;
        }
      })
    );
    // Filter out undefined results from failed stat calls using an explicit type guard
    return results.filter((result): result is DirectoryEntry => result !== undefined);
  }

  // Basic search - To be implemented properly if needed
  async searchFiles(basePath: string, pattern: string): Promise<FileSearchResult[]> {
     console.warn('FileSystemService.searchFiles is not yet implemented.');
     // TODO: Implement recursive file search (e.g., using glob or manual recursion)
     return [];
  }
}
