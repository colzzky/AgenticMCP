/**
 * @file Node.js implementation of IFileSystem interface
 */

import fs from 'node:fs/promises';
import { IFileSystem } from '../interfaces/file-system.interface';
import { logger } from '../utils';

/**
 * Node.js implementation of file system operations
 */
export class NodeFileSystem implements IFileSystem {
  /**
   * @inheritdoc
   */
  async access(path: string): Promise<void> {
    try {
      return await fs.access(path);
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
      const stats = await fs.stat(path);
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
      return await fs.readFile(path, { encoding });
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
      return await fs.readdir(path);
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
      return await fs.writeFile(path, data);
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
      return await fs.unlink(path);
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
      await fs.mkdir(path, options);
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
      // Node.js fs.rmdir doesn't have force option, use rm for more control
      if (options?.recursive || options?.force) {
        return await fs.rm(path, { 
          recursive: options?.recursive,
          force: options?.force 
        });
      }
      return await fs.rmdir(path);
    } catch (error) {
      logger.debug(`Failed to remove directory: ${path}`);
      throw error;
    }
  }
}
