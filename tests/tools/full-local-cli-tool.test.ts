/**
 * Comprehensive test suite for DILocalCliTool
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { DILocalCliTool } from '../../src/tools/localCliTool';
import { mock, MockProxy } from 'jest-mock-extended';
import type { Logger } from '../../src/core/types/logger.types';
import type { IFileSystem } from '../../src/core/interfaces/file-system.interface';
import type { IDiffService } from '../../src/core/interfaces/diff-service.interface';

describe('DILocalCliTool', () => {
  // Test variables
  let logger: MockProxy<Logger>;
  let fileSystem: MockProxy<IFileSystem>;
  let diffService: MockProxy<IDiffService>;
  let config: any;
  let cli: DILocalCliTool;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mocks
    logger = mock<Logger>();
    fileSystem = mock<IFileSystem>();
    diffService = mock<IDiffService>();
    
    // Set up diffService methods
    diffService.generateDiff.mockImplementation((oldContent, newContent) => {
      return `--- a/file\n+++ b/file\n@@ -1,1 +1,1 @@\n-${oldContent}\n+${newContent}`;
    });
    
    // Config setup
    config = { baseDir: '/base/dir', allowFileOverwrite: false };
    
    // Create the CLI instance
    cli = new DILocalCliTool(config, logger, fileSystem, diffService);
  });

  it('should construct with injected dependencies', () => {
    expect(cli).toBeInstanceOf(DILocalCliTool);
  });

  it('should return available commands as a map', () => {
    const commands = cli.getCommandMap();
    expect(commands).toBeDefined();
    expect(typeof commands).toBe('object');
  });

  it('should provide tool definitions', () => {
    const toolDefs = cli.getToolDefinitions();
    expect(Array.isArray(toolDefs)).toBe(true);
    expect(toolDefs.length).toBeGreaterThan(0);
  });

  describe('listDirectory', () => {
    it('should list files and directories in the baseDir', async () => {
      fileSystem.readdir.mockResolvedValue(['file1.txt', 'subdir']);
      fileSystem.stat.mockResolvedValueOnce({ isDirectory: () => false, size: 100 } as any);
      fileSystem.stat.mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any);
      const result = await (cli as any)._listDirectory({ path: '', recursive: false });
      expect(result.entries.length).toBe(2);
      expect(result.entries[0].name).toBe('file1.txt');
      expect(result.entries[1].name).toBe('subdir');
    });
  });

  describe('readFile', () => {
    it('should read a file and return its content', async () => {
      fileSystem.readFile.mockResolvedValue('hello world');
      fileSystem.stat.mockResolvedValue({ isDirectory: () => false, size: 11 } as any);
      const result = await (cli as any)._readFile({ path: 'file1.txt' });
      expect(result.content).toBe('hello world');
    });

    it('should throw if file does not exist', async () => {
      fileSystem.stat.mockRejectedValue(new Error('not found'));
      await expect((cli as any)._readFile({ path: 'missing.txt' })).rejects.toThrow('not found');
    });
  });

  describe('writeFile', () => {
    it('should write content to a file', async () => {
      fileSystem.writeFile.mockResolvedValue(undefined);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => false, size: 0 } as any);
      const result = await (cli as any)._writeFile({ path: 'file2.txt', content: 'abc' });
      expect(fileSystem.writeFile).toHaveBeenCalledWith('/base/dir/file2.txt', 'abc');
      expect(result.success).toBe(true);
    });
  });

  describe('createDirectory', () => {
    it('should create a directory', async () => {
      fileSystem.mkdir.mockResolvedValue(undefined);
      const result = await (cli as any)._createDirectory({ path: 'newdir' });
      expect(fileSystem.mkdir).toHaveBeenCalledWith('/base/dir/newdir', { recursive: true });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      fileSystem.unlink.mockResolvedValue(undefined);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => false, size: 0 } as any);
      const result = await (cli as any)._deleteFile({ path: 'file3.txt' });
      expect(fileSystem.unlink).toHaveBeenCalledWith('/base/dir/file3.txt');
      expect(result.success).toBe(true);
    });
  });

  describe('deleteDirectory', () => {
    it('should delete a directory', async () => {
      fileSystem.rmdir.mockResolvedValue(undefined);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => true, size: 0 } as any);
      const result = await (cli as any)._deleteDirectory({ path: 'dir1' });
      expect(fileSystem.rmdir).toHaveBeenCalledWith('/base/dir/dir1', { recursive: true, force: true });
      expect(result.success).toBe(true);
    });
  });

  describe('searchCodebase', () => {
    it('should search codebase for a pattern', async () => {
      fileSystem.readdir.mockResolvedValue(['fileA.txt']);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => false, size: 0 } as any);
      fileSystem.readFile.mockResolvedValue('search this line\nother line');
      const result = await (cli as any)._searchCodebase({ pattern: 'search', recursive: false });
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].line_content).toContain('search');
    });
  });

  describe('findFiles', () => {
    it('should find files by pattern', async () => {
      fileSystem.readdir.mockResolvedValue(['foo.txt', 'bar.md']);
      fileSystem.stat.mockResolvedValue({ isDirectory: () => false, size: 0 } as any);
      const result = await (cli as any)._findFiles({ pattern: '*.txt', recursive: false });
      expect(result.files).toContain('foo.txt');
    });
  });
});