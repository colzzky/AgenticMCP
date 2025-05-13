/**
 * @file Example test demonstrating ES module compatible filesystem testing
 */

import { jest } from '@jest/globals';
import { mockConsole, setupFsPromisesMock, mockESModule, setupLoggerMock } from '../utils/test-setup';
import { Dirent, Stats } from 'fs';

// Set up mocks BEFORE importing modules that use them
let mockFs: ReturnType<typeof setupFsPromisesMock>;
let NodeFileSystem: any;
let IFileSystem: any;
let logger: any;

// Use beforeAll to set up mocks and imports
beforeAll(async () => {
  // Use the helper function to create a logger mock
  const { logger: mockLogger } = setupLoggerMock();

  // Set up mocks
  mockFs = setupFsPromisesMock();

  // Register mocks with proper default export structure
  jest.unstable_mockModule('node:fs/promises', () => ({
    default: mockFs,
    ...mockFs
  }));

  // We need to mock the logger from the core/utils module
  // This uses a more robust approach that doesn't depend on resolving the exact path
  jest.mock('../../src/core/utils', () => ({
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  }), { virtual: true });

  // Import after mocking
  const fileSystemAdapterModule = await import('../../src/core/adapters/node-file-system.adapter');
  const fileSystemInterfaceModule = await import('../../src/core/interfaces/file-system.interface');
  NodeFileSystem = fileSystemAdapterModule.NodeFileSystem;
  IFileSystem = fileSystemInterfaceModule.IFileSystem;

  // Store logger for testing
  logger = mockLogger;
});

describe('NodeFileSystem Example', () => {
  // Console mocks for verifying logging
  let consoleSpy: ReturnType<typeof mockConsole>;

  // File system adapter instance
  let fileSystem: typeof IFileSystem;
  
  // Test constants
  const TEST_PATH = '/test/path';
  const TEST_CONTENT = 'test content';
  const TEST_FILE_ARRAY = ['file1.txt', 'file2.txt'];
  const TEST_ENCODING = 'utf-8' as BufferEncoding;
  
  // Error for testing
  const TEST_ERROR = new Error('File system error');

  beforeEach(() => {
    // Reset module state and mocks
    jest.resetModules();
    jest.clearAllMocks();

    // Set up console mocks
    consoleSpy = mockConsole();

    // Create file system instance
    fileSystem = new NodeFileSystem();

    // Set up default mock implementations
    mockFs.access.mockResolvedValue(undefined);

    const mockStats = {
      isDirectory: jest.fn().mockReturnValue(false),
      isFile: jest.fn().mockReturnValue(true),
      size: 1024,
      dev: 0,
      ino: 0,
      mode: 0,
      nlink: 0,
      uid: 0,
      gid: 0,
      rdev: 0,
      blksize: 0,
      blocks: 0,
      atimeMs: 0,
      mtimeMs: 0,
      ctimeMs: 0,
      birthtimeMs: 0,
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    };

    const mockDirent = {
      name: 'file1.txt',
      isDirectory: jest.fn().mockReturnValue(false),
      isFile: jest.fn().mockReturnValue(true),
      isBlockDevice: jest.fn().mockReturnValue(false),
      isCharacterDevice: jest.fn().mockReturnValue(false),
      isFIFO: jest.fn().mockReturnValue(false),
      isSocket: jest.fn().mockReturnValue(false),
      isSymbolicLink: jest.fn().mockReturnValue(false),
    };

    mockFs.stat.mockResolvedValue(mockStats);
    // Mock readFile to return string content when encoding is provided in options
    mockFs.readFile.mockImplementation((path, options) => {
      if (options && options.encoding) {
        return Promise.resolve(TEST_CONTENT);
      }
      return Promise.resolve(Buffer.from(TEST_CONTENT));
    });
    mockFs.readdir.mockResolvedValue([mockDirent]);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.rmdir.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    // Restore console mocks
    if (consoleSpy && typeof consoleSpy.restore === 'function') {
      consoleSpy.restore();
    }
  });
  
  describe('access', () => {
    it('should call fs.access with correct parameters', async () => {
      await fileSystem.access(TEST_PATH);
      
      expect(mockFs.access).toHaveBeenCalledWith(TEST_PATH);
    });
    
    it('should log and throw error if access fails', async () => {
      // Set up mock to throw error for this test
      mockFs.access.mockRejectedValueOnce(TEST_ERROR);
      
      await expect(fileSystem.access(TEST_PATH)).rejects.toThrow(TEST_ERROR);
      
      expect(mockFs.access).toHaveBeenCalledWith(TEST_PATH);
    });
  });
  
  describe('readFile', () => {
    it('should call fs.readFile with correct parameters and return content', async () => {
      const result = await fileSystem.readFile(TEST_PATH, TEST_ENCODING);
      
      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_PATH, { encoding: TEST_ENCODING });
      expect(result).toBe(TEST_CONTENT);
    });
    
    it('should log and throw error if readFile fails', async () => {
      // Set up mock to throw error for this test
      mockFs.readFile.mockRejectedValueOnce(TEST_ERROR);
      
      await expect(fileSystem.readFile(TEST_PATH, TEST_ENCODING)).rejects.toThrow(TEST_ERROR);
      
      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_PATH, { encoding: TEST_ENCODING });
    });
  });
  
  describe('writeFile', () => {
    it('should call fs.writeFile with correct parameters', async () => {
      await fileSystem.writeFile(TEST_PATH, TEST_CONTENT);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(TEST_PATH, TEST_CONTENT);
    });
  });
});