/**
 * @file Tests for DILocalCliTool using dependency injection and in-memory filesystem
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'node:path';
import { DILocalCliTool } from '../../src/tools/di-local-cli-tool';
import { InMemoryFileSystem } from '../utils/in-memory-filesystem';

// Define test base paths
const TEST_BASE_DIR = '/test/base/dir';

describe('DILocalCliTool with In-Memory Filesystem', () => {
  // Test variables
  let mockLogger;
  let mockFs;
  let cliTool;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    
    // Create a new in-memory filesystem for each test
    mockFs = new InMemoryFileSystem();
    
    // Set up base directory
    mockFs.createDirectory(TEST_BASE_DIR);
    
    // Create some test files and directories
    mockFs.createFile(path.join(TEST_BASE_DIR, 'file1.txt'), 'Sample file content 1');
    mockFs.createFile(path.join(TEST_BASE_DIR, 'file2.txt'), 'Sample file content 2');
    mockFs.createDirectory(path.join(TEST_BASE_DIR, 'subdir'));
    mockFs.createFile(path.join(TEST_BASE_DIR, 'subdir', 'nested.txt'), 'Nested file content');
    
    // Create config
    const config = {
      baseDir: TEST_BASE_DIR,
      allowedCommands: ['ls', 'cat'],
    };
    
    // Create LocalCliTool instance with DI
    cliTool = new DILocalCliTool(config, mockLogger, mockFs);
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(cliTool).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error if baseDir is not provided', () => {
      expect(() => {
        new DILocalCliTool({ baseDir: '' }, mockLogger, mockFs);
      }).toThrow("'baseDir' must be specified");
    });

    it('should throw error if baseDir is not absolute', () => {
      expect(() => {
        new DILocalCliTool({ baseDir: 'relative/path' }, mockLogger, mockFs);
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
      expect(sampleDef?.type).toBe('function');
      expect(sampleDef?.function).toHaveProperty('description');
      expect(sampleDef?.function).toHaveProperty('parameters');
      
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
      const result = await cliTool.execute('read_file', { path: 'file1.txt' });
      
      expect(result).toEqual({ content: 'Sample file content 1' });
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle file operation errors gracefully', async () => {
      const result = await cliTool.execute('read_file', { path: 'nonexistent.txt' });
      expect(result).toEqual({ content: '' });
    });
  });

  describe('file operations', () => {
    describe('create_directory', () => {
      it('should create directory successfully', async () => {
        const result = await cliTool.execute('create_directory', { path: 'new_dir' });
        
        expect(result).toEqual({ success: true });
        
        // Verify directory was created
        const dirs = await mockFs.readdir(TEST_BASE_DIR);
        expect(dirs).toContain('new_dir');
      });

      it('should handle directory creation failure', async () => {
        // Mock failure by making the directory path a file
        mockFs.createFile(path.join(TEST_BASE_DIR, 'existing_file'), 'content');
        
        // Try to create a directory with the same name as an existing file
        const result = await cliTool.execute('create_directory', { path: 'existing_file/subdir' });
        
        expect(result).toEqual({ success: false });
      });
    });

    describe('write_file', () => {
      it('should write file successfully', async () => {
        const content = 'New file content';
        const result = await cliTool.execute('write_file', { 
          path: 'new_file.txt', 
          content 
        });
        
        expect(result).toEqual({ success: true });
        
        // Verify file was created with correct content
        const fileContent = await mockFs.readFile(path.join(TEST_BASE_DIR, 'new_file.txt'), 'utf8');
        expect(fileContent).toBe(content);
      });

      it('should prevent overwriting files without permission', async () => {
        const existingPath = 'file1.txt';
        const newContent = 'Updated content';
        
        const result = await cliTool.execute('write_file', { 
          path: existingPath, 
          content: newContent
        });
        
        expect(result.success).toBe(false);
        expect(result.fileExists).toBe(true);
        expect(result.existingContent).toBe('Sample file content 1');
        
        // Verify file was not overwritten
        const fileContent = await mockFs.readFile(path.join(TEST_BASE_DIR, existingPath), 'utf8');
        expect(fileContent).toBe('Sample file content 1');
      });
      
      it('should allow overwriting files with allowOverwrite=true', async () => {
        const existingPath = 'file1.txt';
        const newContent = 'Updated content';
        
        const result = await cliTool.execute('write_file', { 
          path: existingPath, 
          content: newContent,
          allowOverwrite: true
        });
        
        expect(result.success).toBe(true);
        
        // Verify file was overwritten
        const fileContent = await mockFs.readFile(path.join(TEST_BASE_DIR, existingPath), 'utf8');
        expect(fileContent).toBe(newContent);
      });
    });

    describe('read_file', () => {
      it('should read file successfully', async () => {
        const result = await cliTool.execute('read_file', { path: 'file1.txt' });
        
        expect(result).toEqual({ content: 'Sample file content 1' });
      });

      it('should handle file read failure', async () => {
        const result = await cliTool.execute('read_file', { path: 'nonexistent.txt' });
        
        expect(result).toEqual({ content: '' });
      });
    });

    describe('delete_file', () => {
      it('should delete file successfully', async () => {
        const result = await cliTool.execute('delete_file', { path: 'file1.txt' });
        
        expect(result).toEqual({ success: true });
        
        // Verify file was deleted
        const files = await mockFs.readdir(TEST_BASE_DIR);
        expect(files).not.toContain('file1.txt');
      });

      it('should handle file deletion failure', async () => {
        const result = await cliTool.execute('delete_file', { path: 'nonexistent.txt' });
        
        expect(result).toEqual({ success: false });
      });
    });

    describe('delete_directory', () => {
      it('should delete directory successfully', async () => {
        const result = await cliTool.execute('delete_directory', { path: 'subdir' });
        
        expect(result).toEqual({ success: true });
        
        // Verify directory was deleted
        const dirs = await mockFs.readdir(TEST_BASE_DIR);
        expect(dirs).not.toContain('subdir');
      });

      it('should handle directory deletion failure', async () => {
        const result = await cliTool.execute('delete_directory', { path: 'nonexistent_dir' });
        
        expect(result).toEqual({ success: false });
      });
    });

    describe('list_directory', () => {
      it('should list directory contents successfully', async () => {
        const result = await cliTool.execute('list_directory', { path: '.' });
        
        expect(result.entries.length).toBe(3); // file1.txt, file2.txt, subdir
        expect(result.entries).toContainEqual({ name: 'file1.txt', type: 'file' });
        expect(result.entries).toContainEqual({ name: 'file2.txt', type: 'file' });
        expect(result.entries).toContainEqual({ name: 'subdir', type: 'directory' });
      });
      
      it('should list nested directory contents', async () => {
        const result = await cliTool.execute('list_directory', { path: 'subdir' });
        
        expect(result.entries.length).toBe(1);
        expect(result.entries).toContainEqual({ name: 'subdir/nested.txt', type: 'file' });
      });
    });

    describe('search_codebase', () => {
      it('should find matching content in files', async () => {
        // Create a file with more content to search
        mockFs.createFile(
          path.join(TEST_BASE_DIR, 'code.js'), 
          'function searchTest() {\n  // Sample code\n  const result = "Found the search term";\n  return result;\n}'
        );
        
        const result = await cliTool.execute('search_codebase', { 
          query: 'search',
          recursive: true
        });
        
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.results[0]).toHaveProperty('file');
        expect(result.results[0]).toHaveProperty('line_number');
        expect(result.results[0]).toHaveProperty('line_content');
        expect(result.results[0].line_content).toContain('search');
      });
      
      it('should search recursively when specified', async () => {
        // Create files with specific content for searching
        mockFs.createFile(
          path.join(TEST_BASE_DIR, 'root.txt'), 
          'This file contains the SEARCHTERM at root level'
        );
        mockFs.createFile(
          path.join(TEST_BASE_DIR, 'subdir', 'nested.txt'), 
          'This file contains the SEARCHTERM in a subdirectory'
        );
        
        const result = await cliTool.execute('search_codebase', { 
          query: 'SEARCHTERM',
          recursive: true
        });
        
        // Should find matches in both root and nested files
        expect(result.results.length).toBe(2);
        
        // Check file paths to verify one is in root and one is in subdir
        const filePaths = result.results.map(r => r.file);
        expect(filePaths).toContain('root.txt');
        expect(filePaths).toContain('subdir/nested.txt');
      });
    });

    describe('find_files', () => {
      it('should find files matching pattern', async () => {
        const result = await cliTool.execute('find_files', { 
          pattern: '*.txt',
          recursive: true
        });
        
        expect(result.files).toContain('file1.txt');
        expect(result.files).toContain('file2.txt');
        expect(result.files).toContain('subdir/nested.txt');
      });
      
      it('should respect non-recursive mode', async () => {
        const result = await cliTool.execute('find_files', { 
          pattern: '*.txt',
          recursive: false
        });
        
        // Should only include files in the root directory
        expect(result.files).toContain('file1.txt');
        expect(result.files).toContain('file2.txt');
        expect(result.files).not.toContain('subdir/nested.txt');
      });
    });
  });
});