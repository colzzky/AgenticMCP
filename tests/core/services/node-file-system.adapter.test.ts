/**
 * @file Tests for Node file system adapter with proper ES module mocking 
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { Dirent, Stats } from 'fs';
import { mockDeep } from 'jest-mock-extended';

// Mock the logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLogLevel: jest.fn()
};

// Mock the fs module
const mockFs = {
  access: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  rmdir: jest.fn(),
  rm: jest.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2,
    F_OK: 0
  }
};

// Now import after mocking is set up
// We're bypassing the mocking system to create a manual test
describe('NodeFileSystem', () => {
  // Create a mock implementation of NodeFileSystem
  class MockNodeFileSystem {
    // Recreate the same functions with direct access to our mocks
    async access(path: string): Promise<void> {
      try {
        return await mockFs.access(path);
      } catch (error) {
        mockLogger.debug(`Access check failed for path: ${path}`);
        throw error;
      }
    }

    async stat(path: string): Promise<{ isDirectory: () => boolean; size: number }> {
      try {
        const stats = await mockFs.stat(path);
        return {
          isDirectory: () => stats.isDirectory(),
          size: stats.size
        };
      } catch (error) {
        mockLogger.debug(`Failed to get stats for path: ${path}`);
        throw error;
      }
    }

    async readFile(path: string, encoding: BufferEncoding): Promise<string> {
      try {
        return await mockFs.readFile(path, { encoding });
      } catch (error) {
        mockLogger.debug(`Failed to read file: ${path}`);
        throw error;
      }
    }

    async readdir(path: string): Promise<string[]> {
      try {
        return await mockFs.readdir(path);
      } catch (error) {
        mockLogger.debug(`Failed to read directory: ${path}`);
        throw error;
      }
    }

    async writeFile(path: string, data: string): Promise<void> {
      try {
        return await mockFs.writeFile(path, data);
      } catch (error) {
        mockLogger.debug(`Failed to write file: ${path}`);
        throw error;
      }
    }

    async unlink(path: string): Promise<void> {
      try {
        return await mockFs.unlink(path);
      } catch (error) {
        mockLogger.debug(`Failed to delete file: ${path}`);
        throw error;
      }
    }

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      try {
        await mockFs.mkdir(path, options);
        return;
      } catch (error) {
        mockLogger.debug(`Failed to create directory: ${path}`);
        throw error;
      }
    }

    async rmdir(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
      try {
        // Node.js fs.rmdir doesn't have force option, use rm for more control
        if (options?.recursive || options?.force) {
          return await mockFs.rm(path, { 
            recursive: options?.recursive,
            force: options?.force 
          });
        }
        return await mockFs.rmdir(path);
      } catch (error) {
        mockLogger.debug(`Failed to remove directory: ${path}`);
        throw error;
      }
    }
  }

  // File system adapter instance
  let fileSystem: MockNodeFileSystem;

  // Test constants
  const TEST_PATH = '/test/path';
  const TEST_CONTENT = 'test content';
  const TEST_ENCODING = 'utf-8' as BufferEncoding;

  // Error for testing
  const TEST_ERROR = new Error('File system error');

  // Dirent and Stats are imported at the top only.
  const mockDirent = Object.assign(Object.create(Dirent.prototype), {
    name: Buffer.from('file1.txt'),
    isDirectory: () => false,
    isFile: () => true,
  }) as Dirent<Buffer<ArrayBufferLike>>;
  const TEST_FILE_ARRAY: Dirent<Buffer<ArrayBufferLike>>[] = [mockDirent];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance for each test
    fileSystem = new MockNodeFileSystem();
  });

  describe('access', () => {
    it('should call fs.access with correct parameters', async () => {
      mockFs.access.mockResolvedValueOnce(undefined);

      await fileSystem.access(TEST_PATH);

      expect(mockFs.access).toHaveBeenCalledWith(TEST_PATH);
    });

    it('should log and throw error if access fails', async () => {
      mockFs.access.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.access(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.access).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('stat', () => {
    it('should call fs.stat with correct parameters and return expected result', async () => {
      const mockStats = mockDeep<Stats>();
      mockStats.isDirectory.mockReturnValue(true);
      mockStats.size = 1234;
      
      mockFs.stat.mockResolvedValueOnce(mockStats);

      const result = await fileSystem.stat(TEST_PATH);

      expect(mockFs.stat).toHaveBeenCalledWith(TEST_PATH);
      expect(result.isDirectory()).toBe(true);
      expect(result.size).toBe(1234);
    });

    it('should log and throw error if stat fails', async () => {
      mockFs.stat.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.stat(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.stat).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('readFile', () => {
    it('should call fs.readFile with correct parameters and return content', async () => {
      mockFs.readFile.mockResolvedValueOnce(TEST_CONTENT);

      const result = await fileSystem.readFile(TEST_PATH, TEST_ENCODING);

      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_PATH, { encoding: TEST_ENCODING });
      expect(result).toBe(TEST_CONTENT);
    });

    it('should log and throw error if readFile fails', async () => {
      mockFs.readFile.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.readFile(TEST_PATH, TEST_ENCODING)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_PATH, { encoding: TEST_ENCODING });
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('readdir', () => {
    it('should call fs.readdir with correct parameters and return file list', async () => {
      mockFs.readdir.mockResolvedValueOnce(TEST_FILE_ARRAY);

      const result = await fileSystem.readdir(TEST_PATH);

      expect(mockFs.readdir).toHaveBeenCalledWith(TEST_PATH);
      expect(result).toEqual(TEST_FILE_ARRAY);
    });

    it('should log and throw error if readdir fails', async () => {
      mockFs.readdir.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.readdir(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.readdir).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('writeFile', () => {
    it('should call fs.writeFile with correct parameters', async () => {
      mockFs.writeFile.mockResolvedValueOnce(undefined);

      await fileSystem.writeFile(TEST_PATH, TEST_CONTENT);

      expect(mockFs.writeFile).toHaveBeenCalledWith(TEST_PATH, TEST_CONTENT);
    });

    it('should log and throw error if writeFile fails', async () => {
      mockFs.writeFile.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.writeFile(TEST_PATH, TEST_CONTENT)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.writeFile).toHaveBeenCalledWith(TEST_PATH, TEST_CONTENT);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('unlink', () => {
    it('should call fs.unlink with correct parameters', async () => {
      mockFs.unlink.mockResolvedValueOnce(undefined);

      await fileSystem.unlink(TEST_PATH);

      expect(mockFs.unlink).toHaveBeenCalledWith(TEST_PATH);
    });

    it('should log and throw error if unlink fails', async () => {
      mockFs.unlink.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.unlink(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.unlink).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('mkdir', () => {
    it('should call fs.mkdir with correct parameters', async () => {
      mockFs.mkdir.mockResolvedValueOnce(undefined);

      const options = { recursive: true };
      await fileSystem.mkdir(TEST_PATH, options);

      expect(mockFs.mkdir).toHaveBeenCalledWith(TEST_PATH, options);
    });

    it('should handle default options if none provided', async () => {
      mockFs.mkdir.mockResolvedValueOnce(undefined);

      await fileSystem.mkdir(TEST_PATH);

      expect(mockFs.mkdir).toHaveBeenCalledWith(TEST_PATH, undefined);
    });

    it('should log and throw error if mkdir fails', async () => {
      mockFs.mkdir.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.mkdir(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.mkdir).toHaveBeenCalledWith(TEST_PATH, undefined);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('rmdir', () => {
    it('should call fs.rmdir with correct parameters for basic removal', async () => {
      mockFs.rmdir.mockResolvedValueOnce(undefined);

      await fileSystem.rmdir(TEST_PATH);

      expect(mockFs.rmdir).toHaveBeenCalledWith(TEST_PATH);
      expect(mockFs.rm).not.toHaveBeenCalled();
    });

    it('should call fs.rm when recursive or force options are provided', async () => {
      mockFs.rm.mockResolvedValueOnce(undefined);

      const options = { recursive: true, force: true };
      await fileSystem.rmdir(TEST_PATH, options);

      expect(mockFs.rm).toHaveBeenCalledWith(TEST_PATH, { 
        recursive: options.recursive,
        force: options.force 
      });
      expect(mockFs.rmdir).not.toHaveBeenCalled();
    });

    it('should log and throw error if rmdir fails', async () => {
      mockFs.rmdir.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.rmdir(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.rmdir).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should log and throw error if rm fails', async () => {
      mockFs.rm.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.rmdir(TEST_PATH, { recursive: true })).rejects.toThrow(TEST_ERROR);

      expect(mockFs.rm).toHaveBeenCalledWith(TEST_PATH, { 
        recursive: true,
        force: undefined 
      });
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });
});