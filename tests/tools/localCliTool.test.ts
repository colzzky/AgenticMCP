// @ts-nocheck - To bypass type checking issues with mocking
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { jest } from '@jest/globals';
import { LocalCliTool } from '../../src/tools/localCliTool';

// Mock fs promises
jest.mock('node:fs/promises');

// Mock minimatch
jest.mock('minimatch');

describe('LocalCliTool', () => {
  // Test variables
  const testBasePath = '/test/base/dir';
  let mockLogger;
  let cliTool;
  
  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup fs mock implementations
    fs.mkdir = jest.fn().mockResolvedValue();
    fs.writeFile = jest.fn().mockResolvedValue();
    fs.readFile = jest.fn().mockResolvedValue('');
    fs.unlink = jest.fn().mockResolvedValue();
    fs.rm = jest.fn().mockResolvedValue();
    fs.readdir = jest.fn().mockResolvedValue([]);
    
    // Mock path methods
    jest.spyOn(path, 'isAbsolute').mockImplementation((p) => p.startsWith('/'));
    jest.spyOn(path, 'resolve').mockImplementation((...p) => p.join('/'));
    jest.spyOn(path, 'join').mockImplementation((...p) => p.join('/'));
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    
    // Create config
    const config = {
      baseDir: testBasePath,
      allowedCommands: ['ls', 'cat'],
    };
    
    // Create CLI tool instance
    cliTool = new LocalCliTool(config, mockLogger);
  });
  
  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(cliTool).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error if baseDir is not provided', () => {
      expect(() => {
        new LocalCliTool({ baseDir: '' }, mockLogger);
      }).toThrow("'baseDir' must be specified");
    });

    it('should throw error if baseDir is not absolute', () => {
      jest.spyOn(path, 'isAbsolute').mockReturnValueOnce(false);
      expect(() => {
        new LocalCliTool({ baseDir: 'relative/path' }, mockLogger);
      }).toThrow("'baseDir' must be an absolute path");
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = cliTool.getToolDefinitions();
      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBeGreaterThan(0);
      
      // Verify a sample definition
      const sampleDef = definitions.find(d => d.function.name === 'read_file');
      expect(sampleDef).toBeDefined();
      expect(sampleDef.type).toBe('function');
      expect(sampleDef.function).toHaveProperty('description');
      expect(sampleDef.function).toHaveProperty('parameters');
      
      // Verify all required commands are defined
      const commandNames = definitions.map(d => d.function.name);
      expect(commandNames).toContain('create_directory');
      expect(commandNames).toContain('write_file');
      expect(commandNames).toContain('read_file');
      expect(commandNames).toContain('delete_file');
      expect(commandNames).toContain('delete_directory');
      expect(commandNames).toContain('list_directory');
      expect(commandNames).toContain('search_codebase');
      expect(commandNames).toContain('find_files');
    });
  });

  describe('execute', () => {
    it('should throw error for unknown command', async () => {
      await expect(
        cliTool.execute('unknown_command', {})
      ).rejects.toThrow("Unknown command 'unknown_command'");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle execute method for read_file command', async () => {
      const mockContent = 'test file content';
      fs.readFile.mockResolvedValueOnce(mockContent);
      
      const result = await cliTool.execute('read_file', { path: 'test.txt' });
      
      expect(result).toEqual({ content: mockContent });
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle errors in command execution', async () => {
      const testError = new Error('Test error message');
      fs.readFile.mockRejectedValueOnce(testError);
      
      await expect(
        cliTool.execute('read_file', { path: 'nonexistent.txt' })
      ).rejects.toThrow('Test error message');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      fs.readFile.mockRejectedValueOnce('string error');
      
      await expect(
        cliTool.execute('read_file', { path: 'nonexistent.txt' })
      ).rejects.toThrow('Unknown error occurred');
    });

    it('should resolve paths correctly and prevent path traversal', async () => {
      jest.spyOn(path, 'resolve').mockReturnValueOnce('/test/base/dir/../../../etc/passwd');
      
      await expect(
        cliTool.execute('read_file', { path: '../../../etc/passwd' })
      ).rejects.toThrow('Access denied: Path');
    });
  });

  describe('file operations', () => {
    const testFilePath = 'test/file.txt';
    const testDirPath = 'test/dir';
    const resolvedFilePath = `${testBasePath}/${testFilePath}`;
    const resolvedDirPath = `${testBasePath}/${testDirPath}`;

    describe('create_directory', () => {
      it('should create directory successfully', async () => {
        const result = await cliTool.execute('create_directory', { path: testDirPath });
        
        expect(result).toEqual({ success: true });
        expect(fs.mkdir).toHaveBeenCalledWith(resolvedDirPath, { recursive: true });
      });

      it('should handle directory creation failure', async () => {
        fs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
        
        const result = await cliTool.execute('create_directory', { path: testDirPath });
        
        expect(result).toEqual({ success: false });
      });
    });

    describe('write_file', () => {
      it('should write file successfully', async () => {
        const content = 'Test content';
        
        const result = await cliTool.execute('write_file', { 
          path: testFilePath, 
          content 
        });
        
        expect(result).toEqual({ success: true });
        expect(fs.writeFile).toHaveBeenCalledWith(resolvedFilePath, content, 'utf8');
      });

      it('should handle file write failure', async () => {
        fs.writeFile.mockRejectedValueOnce(new Error('Write error'));
        
        const result = await cliTool.execute('write_file', { 
          path: testFilePath, 
          content: 'content' 
        });
        
        expect(result).toEqual({ success: false });
      });
    });

    describe('read_file', () => {
      it('should read file successfully', async () => {
        const content = 'File content';
        fs.readFile.mockResolvedValueOnce(content);
        
        const result = await cliTool.execute('read_file', { path: testFilePath });
        
        expect(result).toEqual({ content });
        expect(fs.readFile).toHaveBeenCalledWith(resolvedFilePath, 'utf8');
      });

      it('should handle file read failure', async () => {
        fs.readFile.mockRejectedValueOnce(new Error('Read error'));
        
        const result = await cliTool.execute('read_file', { path: testFilePath });
        
        expect(result).toEqual({ content: '' });
      });
    });

    describe('delete_file', () => {
      it('should delete file successfully', async () => {
        const result = await cliTool.execute('delete_file', { path: testFilePath });
        
        expect(result).toEqual({ success: true });
        expect(fs.unlink).toHaveBeenCalledWith(resolvedFilePath);
      });

      it('should handle file deletion failure', async () => {
        fs.unlink.mockRejectedValueOnce(new Error('Delete error'));
        
        const result = await cliTool.execute('delete_file', { path: testFilePath });
        
        expect(result).toEqual({ success: false });
      });
    });

    describe('delete_directory', () => {
      it('should delete directory successfully', async () => {
        const result = await cliTool.execute('delete_directory', { path: testDirPath });
        
        expect(result).toEqual({ success: true });
        expect(fs.rm).toHaveBeenCalledWith(resolvedDirPath, { recursive: true, force: true });
      });

      it('should handle directory deletion failure', async () => {
        fs.rm.mockRejectedValueOnce(new Error('Delete error'));
        
        const result = await cliTool.execute('delete_directory', { path: testDirPath });
        
        expect(result).toEqual({ success: false });
      });
    });

    describe('list_directory', () => {
      it('should list directory contents successfully', async () => {
        const mockItems = [
          { name: 'file1.txt', isDirectory: () => false },
          { name: 'file2.txt', isDirectory: () => false },
          { name: 'dir1', isDirectory: () => true },
          { name: '.hidden', isDirectory: () => false }, // Should be skipped
        ];
        fs.readdir.mockResolvedValueOnce(mockItems);
        
        jest.spyOn(path, 'relative').mockImplementation((from, to) => {
          return to.replace(`${from}/`, '');
        });
        
        const result = await cliTool.execute('list_directory', { path: '.' });
        
        const expectedEntries = [
          { name: 'file1.txt', type: 'file' },
          { name: 'file2.txt', type: 'file' },
          { name: 'dir1', type: 'directory' }
        ];
        
        expect(result.entries).toEqual(expect.arrayContaining(expectedEntries));
        expect(result.entries.length).toBe(3);
        expect(fs.readdir).toHaveBeenCalledWith(testBasePath, { withFileTypes: true });
      });
    });

    describe('search_codebase', () => {
      it('should search codebase and find matches', async () => {
        // Mock directory structure
        const mockItems = [
          { name: 'file1.txt', isDirectory: () => false },
          { name: 'subdir', isDirectory: () => true }
        ];
        const mockSubdirItems = [
          { name: 'file2.txt', isDirectory: () => false }
        ];
        
        fs.readdir
          .mockResolvedValueOnce(mockItems)
          .mockResolvedValueOnce(mockSubdirItems);
        
        const file1Content = 'This is a test\nwith a match\nin multiple lines';
        const file2Content = 'Another test with match';
        
        fs.readFile
          .mockResolvedValueOnce(file1Content)
          .mockResolvedValueOnce(file2Content);
        
        jest.spyOn(path, 'relative')
          .mockReturnValueOnce('file1.txt')
          .mockReturnValueOnce('subdir/file2.txt');
        
        const result = await cliTool.execute('search_codebase', { 
          query: 'match',
          recursive: true
        });
        
        expect(result.results.length).toBe(2);
        expect(result.results[0]).toEqual({
          file: 'file1.txt',
          line_number: 2,
          line_content: 'with a match'
        });
        expect(result.results[1]).toEqual({
          file: 'subdir/file2.txt',
          line_number: 1,
          line_content: 'Another test with match'
        });
      });
    });

    describe('find_files', () => {
      it('should find files matching pattern', async () => {
        // Mock directory structure
        const mockItems = [
          { name: 'file1.txt', isDirectory: () => false },
          { name: 'file2.js', isDirectory: () => false },
          { name: 'subdir', isDirectory: () => true }
        ];
        const mockSubdirItems = [
          { name: 'file3.txt', isDirectory: () => false },
          { name: 'file4.js', isDirectory: () => false }
        ];
        
        fs.readdir
          .mockResolvedValueOnce(mockItems)
          .mockResolvedValueOnce(mockSubdirItems);
        
        // Mock Minimatch to handle pattern matching
        const { Minimatch } = require('minimatch');
        Minimatch.mockImplementation(() => ({
          match: jest.fn()
            .mockReturnValueOnce(true)   // file1.txt matches
            .mockReturnValueOnce(false)  // file2.js doesn't match
            .mockReturnValueOnce(true)   // file3.txt matches
            .mockReturnValueOnce(false)  // file4.js doesn't match
        }));
        
        jest.spyOn(path, 'relative')
          .mockReturnValueOnce('file1.txt')
          .mockReturnValueOnce('subdir/file3.txt');
        
        const result = await cliTool.execute('find_files', { 
          pattern: '*.txt',
          recursive: true
        });
        
        expect(result.files).toEqual(['file1.txt', 'subdir/file3.txt']);
        expect(result.files.length).toBe(2);
      });
    });
  });
});