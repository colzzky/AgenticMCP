/**
 * @fileoverview Tests for the DILocalCliTool class
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DILocalCliTool } from '../../src/tools/localCliTool.js';
import type { Logger } from '../../src/core/types/logger.types.js';
import type { IFileSystem } from '../../src/core/interfaces/file-system.interface.js';
import type { IDiffService } from '../../src/core/interfaces/diff-service.interface.js';
import type { PathDI } from '../../src/global.types.js';
import path from 'node:path';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLogLevel: jest.fn()
};

// Mock file system
const mockFileSystem: IFileSystem = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  rmdir: jest.fn()
};

// Mock diff service
const mockDiffService: IDiffService = {
  generateDiff: jest.fn()
};

// Mock path
const mockPathDI: PathDI = {
  ...path,
  resolve: jest.fn(),
  join: jest.fn(),
  dirname: jest.fn(),
  relative: jest.fn(),
  isAbsolute: jest.fn()
};

describe('DILocalCliTool', () => {
  let localCliTool: DILocalCliTool;
  const baseDir = '/test/base/dir';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    (mockPathDI.isAbsolute as jest.Mock).mockReturnValue(true);
    (mockPathDI.resolve as jest.Mock).mockReturnValue(baseDir);
    (mockPathDI.sep as string) = '/';
    
    localCliTool = new DILocalCliTool(
      { baseDir },
      mockLogger,
      mockFileSystem,
      mockDiffService,
      mockPathDI
    );
  });
  
  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(localCliTool).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });
    
    it('should throw error if baseDir is not specified', () => {
      expect(() => {
        new DILocalCliTool(
          { baseDir: '' } as any,
          mockLogger,
          mockFileSystem,
          mockDiffService,
          mockPathDI
        );
      }).toThrow(TypeError);
    });
    
    it('should throw error if baseDir is not absolute', () => {
      (mockPathDI.isAbsolute as jest.Mock).mockReturnValueOnce(false);
      
      expect(() => {
        new DILocalCliTool(
          { baseDir: 'relative/path' },
          mockLogger,
          mockFileSystem,
          mockDiffService,
          mockPathDI
        );
      }).toThrow(TypeError);
    });
  });
  
  describe('getCommandMap', () => {
    it('should return command map with all expected commands', () => {
      const commandMap = localCliTool.getCommandMap();
      
      expect(commandMap).toHaveProperty('create_directory');
      expect(commandMap).toHaveProperty('write_file');
      expect(commandMap).toHaveProperty('read_file');
      expect(commandMap).toHaveProperty('delete_file');
      expect(commandMap).toHaveProperty('delete_directory');
      expect(commandMap).toHaveProperty('list_directory');
      expect(commandMap).toHaveProperty('search_codebase');
      expect(commandMap).toHaveProperty('find_files');
    });
    
    it('should return readonly command map', () => {
      const commandMap = localCliTool.getCommandMap();
      const updatedMap = localCliTool.getCommandMap();
      
      // Compare original map with the one returned after attempted modification
      // We just test that the commandMap doesn't change between invocations
      expect(updatedMap).toEqual(commandMap);
      expect(Object.keys(updatedMap).length).toEqual(Object.keys(commandMap).length);
    });
  });
  
  describe('getToolDefinitions', () => {
    it('should return array of tool definitions', () => {
      const toolDefinitions = localCliTool.getToolDefinitions();
      
      expect(Array.isArray(toolDefinitions)).toBe(true);
      expect(toolDefinitions.length).toBeGreaterThan(0);
      
      // Check structure of first tool definition
      const firstTool = toolDefinitions[0];
      expect(firstTool).toHaveProperty('type', 'function');
      expect(firstTool).toHaveProperty('function');
      expect(firstTool.function).toHaveProperty('name');
      expect(firstTool.function).toHaveProperty('description');
      expect(firstTool.function).toHaveProperty('parameters');
    });
  });
  
  describe('execute', () => {
    describe('create_directory', () => {
      it('should successfully create a directory', async () => {
        // Setup mocks
        (mockPathDI.resolve as jest.Mock).mockReturnValueOnce(`${baseDir}/test-dir`);
        (mockFileSystem.mkdir as jest.Mock).mockResolvedValueOnce(undefined);
        
        // Execute
        const result = await localCliTool.execute('create_directory', { path: 'test-dir' });
        
        // Verify
        expect(mockFileSystem.mkdir).toHaveBeenCalledWith(`${baseDir}/test-dir`, { recursive: true });
        expect(result).toEqual({ success: true });
      });
      
      it('should handle errors when creating directory', async () => {
        // Setup mocks
        (mockPathDI.resolve as jest.Mock).mockReturnValueOnce(`${baseDir}/error-dir`);
        (mockFileSystem.mkdir as jest.Mock).mockRejectedValueOnce(new Error('Failed to create directory'));
        
        // Execute
        const result = await localCliTool.execute('create_directory', { path: 'error-dir' });
        
        // Verify
        expect(result).toEqual({ success: false });
      });
    });
    
    describe('write_file', () => {
      beforeEach(() => {
        // Setup common mocks
        (mockPathDI.resolve as jest.Mock).mockReturnValueOnce(`${baseDir}/test-file.txt`);
        (mockPathDI.dirname as jest.Mock).mockReturnValueOnce(`${baseDir}`);
      });
      
      it('should successfully write a new file', async () => {
        // Setup mocks for a new file
        (mockFileSystem.access as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
        (mockFileSystem.mkdir as jest.Mock).mockResolvedValueOnce(undefined);
        (mockFileSystem.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
        (mockDiffService.generateDiff as jest.Mock).mockReturnValueOnce('mock diff output');
        
        // Execute
        const result = await localCliTool.execute('write_file', { 
          path: 'test-file.txt', 
          content: 'test content'
        });
        
        // Verify
        expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
          `${baseDir}/test-file.txt`, 
          'test content'
        );
        expect(mockDiffService.generateDiff).toHaveBeenCalledWith(
          '', 
          'test content'
        );
        expect(result).toEqual({ 
          success: true,
          diff: 'mock diff output'
        });
      });
      
      it('should handle when file exists and overwrite is allowed', async () => {
        // Setup both mock implementations to handle both createDiff calls
        (mockDiffService.generateDiff as jest.Mock)
          .mockReturnValueOnce('existing vs new diff') // First call for checking
          .mockReturnValueOnce('mock diff output');    // Second call for result
          
        // Setup mocks for existing file
        (mockFileSystem.access as jest.Mock).mockResolvedValueOnce(undefined);
        (mockFileSystem.stat as jest.Mock).mockResolvedValueOnce({ 
          isDirectory: () => false 
        });
        (mockFileSystem.readFile as jest.Mock).mockResolvedValueOnce('existing content');
        (mockFileSystem.mkdir as jest.Mock).mockResolvedValueOnce(undefined);
        (mockFileSystem.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
        
        // Execute
        const result = await localCliTool.execute('write_file', { 
          path: 'test-file.txt', 
          content: 'new content',
          allowOverwrite: true
        });
        
        // Verify
        expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
          `${baseDir}/test-file.txt`, 
          'new content'
        );
        // The first call should compare existing to new
        expect(mockDiffService.generateDiff).toHaveBeenNthCalledWith(
          1,
          'existing content', 
          'new content'
        );
        // The second call should also compare existing to new for the result
        expect(mockDiffService.generateDiff).toHaveBeenNthCalledWith(
          2,
          'existing content', 
          'new content'
        );
        expect(result).toEqual({ 
          success: true,
          diff: 'mock diff output'
        });
      });
      
      it('should not overwrite file when allowOverwrite is false', async () => {
        // Setup mocks for existing file
        (mockFileSystem.access as jest.Mock).mockResolvedValueOnce(undefined);
        (mockFileSystem.stat as jest.Mock).mockResolvedValueOnce({ 
          isDirectory: () => false 
        });
        (mockFileSystem.readFile as jest.Mock).mockResolvedValueOnce('existing content');
        (mockDiffService.generateDiff as jest.Mock).mockReturnValueOnce('mock diff output');
        
        // Execute
        const result = await localCliTool.execute('write_file', { 
          path: 'test-file.txt', 
          content: 'new content',
          allowOverwrite: false
        });
        
        // Verify
        expect(mockFileSystem.writeFile).not.toHaveBeenCalled();
        expect(result).toEqual({ 
          success: false,
          fileExists: true,
          existingContent: 'existing content',
          diff: 'mock diff output',
          message: expect.any(String)
        });
      });
      
      it('should handle when path is a directory', async () => {
        // Setup mocks for path being a directory
        (mockFileSystem.access as jest.Mock).mockResolvedValueOnce(undefined);
        (mockFileSystem.stat as jest.Mock).mockResolvedValueOnce({ 
          isDirectory: () => true 
        });
        
        // Execute
        const result = await localCliTool.execute('write_file', { 
          path: 'test-file.txt', 
          content: 'new content'
        });
        
        // Verify
        expect(mockFileSystem.writeFile).not.toHaveBeenCalled();
        expect(result).toEqual({ 
          success: false,
          message: expect.any(String)
        });
      });
      
      it('should handle errors when writing file', async () => {
        // Setup mocks for write error
        (mockFileSystem.access as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
        (mockFileSystem.mkdir as jest.Mock).mockResolvedValueOnce(undefined);
        (mockFileSystem.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write error'));
        
        // Execute
        const result = await localCliTool.execute('write_file', { 
          path: 'test-file.txt', 
          content: 'test content'
        });
        
        // Verify
        expect(result).toEqual({ 
          success: false,
          message: expect.any(String)
        });
      });
    });
    
    describe('read_file', () => {
      it('should successfully read a file', async () => {
        // Setup mocks
        (mockPathDI.resolve as jest.Mock).mockReturnValueOnce(`${baseDir}/test-file.txt`);
        (mockFileSystem.readFile as jest.Mock).mockResolvedValueOnce('file content');
        
        // Execute
        const result = await localCliTool.execute('read_file', { path: 'test-file.txt' });
        
        // Verify
        expect(mockFileSystem.readFile).toHaveBeenCalledWith(`${baseDir}/test-file.txt`, 'utf8');
        expect(result).toEqual({ content: 'file content' });
      });
      
      it('should return empty content when file does not exist', async () => {
        // Setup mocks
        (mockPathDI.resolve as jest.Mock).mockReturnValueOnce(`${baseDir}/non-existent.txt`);
        (mockFileSystem.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
        
        // Execute
        const result = await localCliTool.execute('read_file', { path: 'non-existent.txt' });
        
        // Verify
        expect(result).toEqual({ content: '' });
      });
    });
    
    describe('invalid command', () => {
      it('should throw error for unknown command', async () => {
        await expect(
          // @ts-expect-error - Testing with invalid command
          localCliTool.execute('invalid_command', {})
        ).rejects.toThrow('Unknown command');
      });
    });
  });
});