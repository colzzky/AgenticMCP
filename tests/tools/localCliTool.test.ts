/**
 * @file Tests for DILocalCliTool with proper ESM mocking
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { setupNodeFsMock } from '../utils/node-module-mock';
import type { Logger } from '../../src/core/types/logger.types';
import type { IFileSystem } from '../../src/core/interfaces/file-system.interface';
import type { IDiffService } from '../../src/core/interfaces/diff-service.interface';
import type { LocalCliCommandMap } from '../../src/core/types/cli.types';

// Mock the path module
const mockPathModule = {
  resolve: jest.fn((...parts) => parts.join('/')),
  join: jest.fn((...parts) => parts.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  relative: jest.fn((from, to) => to.replace(from, '')),
  isAbsolute: jest.fn((path) => path.startsWith('/')),
  sep: '/',
};

// Register mocks before imports
jest.unstable_mockModule('node:path', () => mockPathModule);

describe('DILocalCliTool', () => {
  let DILocalCliTool: any;
  let logger: MockProxy<Logger>;
  let fileSystem: MockProxy<IFileSystem>;
  let diffService: MockProxy<IDiffService>;
  let cli: any;

  beforeAll(async () => {
    // Dynamic import after mocking
    const module = await import('../../src/tools/localCliTool');
    DILocalCliTool = module.DILocalCliTool;
  });

  beforeEach(() => {
    logger = mock<Logger>();
    fileSystem = mock<IFileSystem>();
    diffService = mock<IDiffService>();
    
    // Setup path module mock behavior for each test
    mockPathModule.resolve.mockImplementation((...parts) => parts.join('/'));
    mockPathModule.isAbsolute.mockImplementation((path) => path.startsWith('/'));
    
    // Create instance with test configuration
    cli = new DILocalCliTool({ baseDir: '/base/dir', allowFileOverwrite: false }, logger, fileSystem, diffService);
  });

  it('should construct with injected dependencies', () => {
    expect(cli).toBeDefined();
  });

  it('should return available commands as a map', () => {
    const commands = cli.getCommandMap();
    expect(commands).toBeDefined();
    expect(typeof commands).toBe('object');
  });

  describe('listDirectory', () => {
    it('should list files and directories in the baseDir', async () => {
      fileSystem.readdir.mockResolvedValue(['file1.txt', 'subdir']);
      fileSystem.stat.mockResolvedValueOnce({ isDirectory: () => false, size: 100 } as any);
      fileSystem.stat.mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any);
      const result = await cli._listDirectory({ path: '' });
      expect(result.entries.length).toBe(2);
    });
  });

  describe('readFile', () => {
    it('should read a file and return its content', async () => {
      fileSystem.readFile.mockResolvedValue('hello world');
      const result = await cli._readFile({ path: 'file1.txt' });
      expect(result.content).toBe('hello world');
    });

    it('should return empty content if file does not exist', async () => {
      fileSystem.readFile.mockRejectedValue(new Error('not found'));
      const result = await cli._readFile({ path: 'missing.txt' });
      expect(result.content).toBe('');
    });
  });

  describe('writeFile', () => {
    it('should write content to a file', async () => {
      fileSystem.writeFile.mockResolvedValue(undefined);
      diffService.generateDiff.mockReturnValue('diff output');
      const result = await cli._writeFile({ path: 'file2.txt', content: 'abc' });
      expect(result.success).toBe(true);
    });
  });

  describe('createDirectory', () => {
    it('should create a directory', async () => {
      fileSystem.mkdir.mockResolvedValue(undefined);
      const result = await cli._createDirectory({ path: 'newdir' });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      fileSystem.unlink.mockResolvedValue(undefined);
      const result = await cli._deleteFile({ path: 'file3.txt' });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteDirectory', () => {
    it('should delete a directory', async () => {
      fileSystem.access.mockResolvedValue(undefined);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => true } as any);
      fileSystem.rmdir.mockResolvedValue(undefined);
      const result = await cli._deleteDirectory({ path: 'dir1' });
      expect(result.success).toBe(true);
    });
  });

  describe('searchCodebase', () => {
    it('should search codebase for a pattern', async () => {
      fileSystem.readdir.mockResolvedValue(['fileA.txt']);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => false } as any);
      fileSystem.readFile.mockResolvedValue('search this line\nother line');
      const result = await cli._searchCodebase({ query: 'search' });
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('findFiles', () => {
    it('should find files by pattern', async () => {
      fileSystem.readdir.mockResolvedValue(['foo.txt']);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => false } as any);
      const result = await cli._findFiles({ pattern: '*.txt' });
      expect(result.files).toHaveLength(1);
    });
  });
});