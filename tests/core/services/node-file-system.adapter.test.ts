/**
 * @file Tests for Node file system adapter
 */

import { jest } from '@jest/globals';
import { NodeFileSystem } from '../../../src/core/adapters/node-file-system.adapter';
import { IFileSystem } from '../../../src/core/interfaces/file-system.interface';
import { mockConsole, mockFsPromises, mockModule } from '../../utils/test-setup';

// Mock fs/promises
const mockFs = mockFsPromises();
mockModule('node:fs/promises', mockFs);

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
mockModule('../../../src/core/utils', {
  logger: mockLogger
});

// We need to override node:fs/promises directly so we prevent NodeFileSystem
// from accessing the real file system which causes ENOENT errors
const realFsPromisesModule = jest.requireActual('node:fs/promises');
jest.unstable_mockModule('node:fs/promises', () => ({
  ...mockFs
}));

describe('NodeFileSystem', () => {
  // Console mocks
  let consoleSpy: ReturnType<typeof mockConsole>;

  // File system adapter instance
  let fileSystem: IFileSystem;
  
  // Test constants
  const TEST_PATH = '/test/path';
  const TEST_CONTENT = 'test content';
  const TEST_FILE_ARRAY = ['file1.txt', 'file2.txt'];
  const TEST_ENCODING = 'utf-8' as BufferEncoding;
  
  // Error for testing
  const TEST_ERROR = new Error('File system error');
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup console mocks
    consoleSpy = mockConsole();

    // Create file system instance
    fileSystem = new NodeFileSystem();
  });

  afterEach(() => {
    // Restore console mocks
    consoleSpy.restore();
    jest.restoreAllMocks();
  });

  describe('access', () => {
    it('should call fs.access with correct parameters', async () => {
      // Setup fs mock
      mockFs.access.mockResolvedValueOnce(undefined);

      await fileSystem.access(TEST_PATH);

      expect(mockFs.access).toHaveBeenCalledWith(TEST_PATH);
    });

    it('should log and throw error if access fails', async () => {
      // Setup fs mock to throw error
      mockFs.access.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.access(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.access).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('stat', () => {
    it('should call fs.stat with correct parameters and return expected result', async () => {
      // Setup fs mock
      const mockStats = {
        isDirectory: jest.fn().mockReturnValue(false),
        size: 1024
      };
      mockFs.stat.mockResolvedValueOnce(mockStats);
      
      const result = await fileSystem.stat(TEST_PATH);

      expect(mockFs.stat).toHaveBeenCalledWith(TEST_PATH);
      expect(result.isDirectory()).toBe(false);
      expect(result.size).toBe(1024);
    });

    it('should log and throw error if stat fails', async () => {
      // Setup fs mock to throw error
      mockFs.stat.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.stat(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.stat).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('readFile', () => {
    it('should call fs.readFile with correct parameters and return content', async () => {
      // Setup fs mock
      mockFs.readFile.mockResolvedValueOnce(TEST_CONTENT);

      const result = await fileSystem.readFile(TEST_PATH, TEST_ENCODING);

      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_PATH, { encoding: TEST_ENCODING });
      expect(result).toBe(TEST_CONTENT);
    });

    it('should log and throw error if readFile fails', async () => {
      // Setup fs mock to throw error
      mockFs.readFile.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.readFile(TEST_PATH, TEST_ENCODING)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_PATH, { encoding: TEST_ENCODING });
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('readdir', () => {
    it('should call fs.readdir with correct parameters and return file list', async () => {
      // Setup fs mock
      mockFs.readdir.mockResolvedValueOnce(TEST_FILE_ARRAY);

      const result = await fileSystem.readdir(TEST_PATH);

      expect(mockFs.readdir).toHaveBeenCalledWith(TEST_PATH);
      expect(result).toEqual(TEST_FILE_ARRAY);
    });

    it('should log and throw error if readdir fails', async () => {
      // Setup fs mock to throw error
      mockFs.readdir.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.readdir(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.readdir).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('writeFile', () => {
    it('should call fs.writeFile with correct parameters', async () => {
      // Setup fs mock
      mockFs.writeFile.mockResolvedValueOnce(undefined);

      await fileSystem.writeFile(TEST_PATH, TEST_CONTENT);

      expect(mockFs.writeFile).toHaveBeenCalledWith(TEST_PATH, TEST_CONTENT);
    });

    it('should log and throw error if writeFile fails', async () => {
      // Setup fs mock to throw error
      mockFs.writeFile.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.writeFile(TEST_PATH, TEST_CONTENT)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.writeFile).toHaveBeenCalledWith(TEST_PATH, TEST_CONTENT);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('unlink', () => {
    it('should call fs.unlink with correct parameters', async () => {
      // Setup fs mock
      mockFs.unlink.mockResolvedValueOnce(undefined);

      await fileSystem.unlink(TEST_PATH);

      expect(mockFs.unlink).toHaveBeenCalledWith(TEST_PATH);
    });

    it('should log and throw error if unlink fails', async () => {
      // Setup fs mock to throw error
      mockFs.unlink.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.unlink(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.unlink).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('mkdir', () => {
    it('should call fs.mkdir with correct parameters', async () => {
      // Setup fs mock
      mockFs.mkdir.mockResolvedValueOnce(undefined);

      const options = { recursive: true };
      await fileSystem.mkdir(TEST_PATH, options);

      expect(mockFs.mkdir).toHaveBeenCalledWith(TEST_PATH, options);
    });

    it('should handle default options if none provided', async () => {
      // Setup fs mock
      mockFs.mkdir.mockResolvedValueOnce(undefined);

      await fileSystem.mkdir(TEST_PATH);

      expect(mockFs.mkdir).toHaveBeenCalledWith(TEST_PATH, undefined);
    });

    it('should log and throw error if mkdir fails', async () => {
      // Setup fs mock to throw error
      mockFs.mkdir.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.mkdir(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.mkdir).toHaveBeenCalledWith(TEST_PATH, undefined);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('rmdir', () => {
    it('should call fs.rmdir with correct parameters for basic removal', async () => {
      // Setup fs mock
      mockFs.rmdir.mockResolvedValueOnce(undefined);

      await fileSystem.rmdir(TEST_PATH);

      expect(mockFs.rmdir).toHaveBeenCalledWith(TEST_PATH);
      expect(mockFs.rm).not.toHaveBeenCalled();
    });

    it('should call fs.rm when recursive or force options are provided', async () => {
      // Setup fs mock
      mockFs.rm.mockResolvedValueOnce(undefined);

      const options = { recursive: true, force: true };
      await fileSystem.rmdir(TEST_PATH, options);

      expect(mockFs.rm).toHaveBeenCalledWith(TEST_PATH, options);
      expect(mockFs.rmdir).not.toHaveBeenCalled();
    });

    it('should log and throw error if rmdir fails', async () => {
      // Setup fs mock to throw error
      mockFs.rmdir.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.rmdir(TEST_PATH)).rejects.toThrow(TEST_ERROR);

      expect(mockFs.rmdir).toHaveBeenCalledWith(TEST_PATH);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should log and throw error if rm fails', async () => {
      // Setup fs mock to throw error
      mockFs.rm.mockRejectedValueOnce(TEST_ERROR);

      await expect(fileSystem.rmdir(TEST_PATH, { recursive: true })).rejects.toThrow(TEST_ERROR);

      expect(mockFs.rm).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });
});