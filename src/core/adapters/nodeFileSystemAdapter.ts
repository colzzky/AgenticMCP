/**
 * @file Node.js implementation of IFileSystem interface
 */

import type { PathDI, FileSystemDI } from '../../types/global.types';
import { IFileSystem } from '../interfaces/file-system.interface';
import { logger } from '../utils';

/**
 * Node.js implementation of file system operations
 */
export class NodeFileSystem implements IFileSystem {
  pathDI: PathDI;
  fileSystemDI: FileSystemDI;

  constructor(pathDI: PathDI, fileSystemDI: FileSystemDI) {
    this.pathDI = pathDI;
    this.fileSystemDI = fileSystemDI;
  }

  /**
   * @inheritdoc
   */
  async access(path: string): Promise<void> {
    try {
      return await this.fileSystemDI.access(path);
    } catch (error) {
      logger.debug(`Access check failed for path: ${path}`);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async stat(path: string): Promise<{ isDirectory: () => boolean; size: number }> {
    try {
      const stats = await this.fileSystemDI.stat(path);
      return {
        isDirectory: () => stats.isDirectory(),
        size: stats.size
      };
    } catch (error) {
      logger.debug(`Failed to get stats for path: ${path}`);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    try {
      return await this.fileSystemDI.readFile(path, { encoding });
    } catch (error) {
      logger.debug(`Failed to read file: ${path}`);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async readdir(path: string): Promise<string[]> {
    try {
      return await this.fileSystemDI.readdir(path);
    } catch (error) {
      logger.debug(`Failed to read directory: ${path}`);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async writeFile(path: string, data: string): Promise<void> {
    try {
      return await this.fileSystemDI.writeFile(path, data);
    } catch (error) {
      logger.debug(`Failed to write file: ${path}`);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async unlink(path: string): Promise<void> {
    try {
      return await this.fileSystemDI.unlink(path);
    } catch (error) {
      logger.debug(`Failed to delete file: ${path}`);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    try {
      await this.fileSystemDI.mkdir(path, options);
      return;
    } catch (error) {
      logger.debug(`Failed to create directory: ${path}`);
      throw error;
    }
  }

  /**
   * @inheritdoc
   */
  async rmdir(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    try {
      // Node.js this.fileSystemDI.rmdir doesn't have force option, use rm for more control
      if (options?.recursive || options?.force) {
        return await this.fileSystemDI.rm(path, { 
          recursive: options?.recursive,
          force: options?.force 
        });
      }
      return await this.fileSystemDI.rmdir(path);
    } catch (error) {
      logger.debug(`Failed to remove directory: ${path}`);
      throw error;
    }
  }
}