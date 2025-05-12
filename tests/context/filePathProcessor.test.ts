/**
 * @file Tests for FilePathProcessor
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FilePathProcessor } from '../../src/context/filePathProcessor';
import path from 'node:path';
import fs from 'node:fs/promises';

// Create manual mocks instead of relying on jest.mock
const mockFs = {
  access: jest.fn() as unknown as jest.Mock,
  stat: jest.fn() as unknown as jest.Mock,
  readFile: jest.fn() as unknown as jest.Mock,
  readdir: jest.fn() as unknown as jest.Mock,
  mkdir: jest.fn() as unknown as jest.Mock
};

const mockPath = {
  isAbsolute: jest.fn(),
  resolve: jest.fn(),
  basename: jest.fn(),
  extname: jest.fn(),
  join: jest.fn(),
  sep: '/'
};

// Override the actual implementations with mocks
jest.mock('node:fs/promises', () => mockFs);
jest.mock('node:path', () => mockPath);

describe('FilePathProcessor', () => {
  let processor: FilePathProcessor;
  let mockLogger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock path.isAbsolute
    mockPath.isAbsolute = jest.fn() as unknown as jest.Mock;
    (mockPath.isAbsolute as jest.Mock).mockImplementation((...args: unknown[]) => {
      const p = args[0] as string;

      // Mock path.resolve
      mockPath.resolve = jest.fn() as unknown as jest.Mock;
      (mockPath.resolve as jest.Mock).mockImplementation((...args: unknown[]) => {
        return (args as string[]).join('/').replace(/\/+/, '/');
      });

      // Mock path.basename
      mockPath.basename = jest.fn() as unknown as jest.Mock;
      (mockPath.basename as jest.Mock).mockImplementation((...args: unknown[]) => {
        const p = args[0] as string;
        return p.split('/').pop() || '';
      });
      return p.split('/').pop() || '';
    });

    // Mock path.extname
    mockPath.extname = jest.fn() as unknown as jest.Mock;
    (mockPath.extname as jest.Mock).mockImplementation((...args: unknown[]) => {
      const p = args[0] as string;
      const filename = p.split('/').pop() || '';
      const dotIndex = filename.lastIndexOf('.');
      return dotIndex === -1 ? '' : filename.slice(dotIndex);
    });

    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Create processor instance
    processor = new FilePathProcessor(mockLogger);
  });

  describe('processArgs', () => {
    it('should identify file paths in arguments', async () => {
      // Mock fs.access to make some paths exist
      mockFs.access.mockImplementation((...args: unknown[]) => {
        const p = args[0] as string;
        if (p === '/test/file.txt' || p === '/test/file2.md') {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });

      mockFs.stat.mockImplementation(() => Promise.resolve({
        isDirectory: () => false,
        size: 100
      }));

      mockFs.readFile.mockImplementation((...args: unknown[]) => {
        const p = args[0] as string;
        if (p === '/test/file.txt') {
          return Promise.resolve('File content 1');
        } else if (p === '/test/file2.md') {
          return Promise.resolve('File content 2');
        }
        return Promise.resolve('');
      });

      // Process arguments with file paths
      const args = ['command', '/test/file.txt', 'prompt text', '/test/file2.md'];
      const result = await processor.processArgs(args);

      // Verify that file paths were identified
      expect(result.remainingArgs).toEqual(['command', 'prompt text']);
      expect(result.context).toContain('file.txt');
      expect(result.context).toContain('File content 1');
      expect(result.context).toContain('file2.md');
      expect(result.context).toContain('File content 2');

      // Verify that fs.access was called for each argument
      expect(mockFs.access).toHaveBeenCalledTimes(4);

      // Verify that fs.readFile was called for file paths
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file2.md', 'utf8');
    });

    it('should handle non-existent file paths', async () => {
      // Mock fs.access to make all paths not exist
      mockFs.access = jest.fn((...args: unknown[]) => {
        return Promise.reject(new Error('File not found') as any);
      }) as any;

      // Process arguments with non-existent file paths
      const args = ['command', '/test/nonexistent.txt', 'prompt text'];
      const result = await processor.processArgs(args);

      // Verify that all arguments were treated as non-file paths
      expect(result.remainingArgs).toEqual(['command', '/test/nonexistent.txt', 'prompt text']);
      expect(result.context).toBe('');

      // Verify that fs.access was called for each argument
      expect(mockFs.access).toHaveBeenCalledTimes(3);

      // Verify that fs.readFile was not called
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should handle directory paths', async () => {
      // Mock fs.access to make directory path exist
      mockFs.access = jest.fn((...args: unknown[]) => {
        const p = args[0] as string;
        if (p === '/test/dir') {
          return Promise.resolve();
        }
        return Promise.reject(new Error('Not a directory') as any);
      }) as any;

      // Mock fs.stat to return directory status
      mockFs.stat = jest.fn((...args: unknown[]) => {
        const p = args[0] as string;
        if (p === '/test/dir') {
          return Promise.resolve({
            isDirectory: () => true,
            size: 4096,
          });
        }
        return Promise.resolve({
          isDirectory: () => false,
          size: 100,
        });
      });

      // Mock fs.readdir to return directory contents
      mockFs.readdir = jest.fn() as unknown as jest.Mock;
      mockFs.readdir.mockImplementation(() => Promise.resolve([
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'file2.md', isDirectory: () => false }
      ]));

      // Mock fs.readFile to return file content
      mockFs.readFile = jest.fn() as unknown as jest.Mock;
      mockFs.readFile.mockImplementation(() => Promise.resolve('File content'));

      // Process arguments with directory path
      const args = ['command', '/test/dir', 'prompt text'];
      const result = await processor.processArgs(args);

      // Verify that directory path was identified
      expect(result.remainingArgs).toEqual(['command', 'prompt text']);
      expect(result.context).toContain('File content');

      // Verify that fs.readdir was called for directory path
      expect(mockFs.readdir).toHaveBeenCalled();
    });

    it('should handle errors during file reading', async () => {
      // Mock fs.access to make file path exist
      mockFs.access = jest.fn() as unknown as jest.Mock;
      mockFs.access.mockImplementation(() => Promise.resolve());

      // Mock fs.stat to return file status
      mockFs.stat = jest.fn() as unknown as jest.Mock;
      mockFs.stat.mockImplementation(() => Promise.resolve({
        isDirectory: () => false,
        size: 100
      }));

      // Mock fs.readFile to throw error
      mockFs.readFile = jest.fn() as unknown as jest.Mock;
      mockFs.readFile.mockImplementation(() => Promise.reject(new Error('Error reading file')));

      // Process arguments with file path that will error during reading
      const args = ['command', '/test/error.txt', 'prompt text'];
      const result = await processor.processArgs(args);

      // Verify that file path was identified but context is empty
      expect(result.remainingArgs).toEqual(['command', 'prompt text']);
      expect(result.context).toBe('');

      // Verify that error was logged
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});