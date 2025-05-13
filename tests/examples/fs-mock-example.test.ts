/**
 * @file Example test demonstrating ES module compatible filesystem testing
 */

import { jest } from '@jest/globals';
import { mockConsole, setupFsPromisesMock, mockESModule } from '../utils/test-setup';
import { Dirent, Stats } from 'fs';

let mockFs: ReturnType<typeof setupFsPromisesMock>;
beforeAll(() => {
  mockFs = setupFsPromisesMock();
  mockESModule('node:fs/promises', mockFs, { virtual: true });
});

// Now we can import the module that uses fs
import { NodeFileSystem } from '../../src/core/adapters/node-file-system.adapter';
import { IFileSystem } from '../../src/core/interfaces/file-system.interface';

describe('NodeFileSystem Example', () => {
  // Console mocks for verifying logging
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
    // Reset module state and mocks
    jest.resetModules();
    jest.clearAllMocks();
    
    // Set up console mocks
    consoleSpy = mockConsole();
    
    // Create file system instance
    fileSystem = new NodeFileSystem();
    
    // Set up default mock implementations
    mockFs.access.mockResolvedValue(undefined);
    const mockStats: Stats = {
  isDirectory: () => false,
  isFile: () => true,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  isSymbolicLink: () => false,
  dev: 0, ino: 0, mode: 0, nlink: 0, uid: 0, gid: 0, rdev: 0, size: 1024, blksize: 0, blocks: 0,
  atimeMs: 0, mtimeMs: 0, ctimeMs: 0, birthtimeMs: 0,
  atime: new Date(), mtime: new Date(), ctime: new Date(), birthtime: new Date(),
};
const mockDirent = Object.assign(Object.create(Dirent.prototype), {
  name: Buffer.from('file1.txt'),
  isDirectory: () => false,
  isFile: () => true,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  isSymbolicLink: () => false,
  parentPath: Buffer.from('/test/path'),
  path: Buffer.from('/test/path/file1.txt'),
}) as Dirent<Buffer<ArrayBufferLike>>;

mockFs.stat.mockResolvedValue(mockStats);
mockFs.readFile.mockResolvedValue(Buffer.from(TEST_CONTENT));
mockFs.readdir.mockResolvedValue([mockDirent] as Dirent<Buffer<ArrayBufferLike>>[]);
mockFs.writeFile.mockResolvedValue(undefined);
mockFs.unlink.mockResolvedValue(undefined);
mockFs.mkdir.mockResolvedValue(undefined);
mockFs.rmdir.mockResolvedValue(undefined);
mockFs.rm.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    // Restore console mocks
    consoleSpy.restore();
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