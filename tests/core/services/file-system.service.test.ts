/**
 * @file Unit tests for FileSystemService
 * Tests the file system service implementation with mocked dependencies
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FileSystemService } from '../../../src/core/services/file-system.service.js';
import type { PathDI, FileSystemDI } from '../../../src/global.types.js';
import type { DirectoryEntry } from '../../../src/core/interfaces/file-system.interface.js';

describe('FileSystemService', () => {
  // Mock dependencies
  const mockPathDI: PathDI = {
    join: jest.fn().mockImplementation((...paths) => paths.join('/')),
    resolve: jest.fn().mockImplementation((...paths) => paths.join('/')),
    dirname: jest.fn().mockImplementation((path) => {
      const parts = path.split('/');
      parts.pop();
      return parts.join('/') || '.';
    }),
    basename: jest.fn().mockImplementation((path) => path.split('/').pop() || ''),
    extname: jest.fn().mockImplementation((path) => {
      const parts = path.split('.');
      return parts.length > 1 ? `.${parts.pop()}` : '';
    }),
    isAbsolute: jest.fn().mockImplementation((path) => path.startsWith('/')),
    relative: jest.fn().mockImplementation((from, to) => to.replace(from, '')),
    sep: '/'
  };

  const mockFileSystemDI: FileSystemDI = {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    rm: jest.fn()
  };

  let fileSystem: FileSystemService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    fileSystem = new FileSystemService(mockPathDI, mockFileSystemDI);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  
  describe('access method', () => {
    it('should call fs.access with the correct path', async () => {
      const path = '/test/path';
      mockFileSystemDI.access.mockResolvedValue(undefined);
      
      await fileSystem.access(path);
      
      expect(mockFileSystemDI.access).toHaveBeenCalledWith(path);
    });
    
    it('should propagate errors from fs.access', async () => {
      const path = '/test/path';
      const error = new Error('Access denied');
      mockFileSystemDI.access.mockRejectedValue(error);
      
      await expect(fileSystem.access(path)).rejects.toThrow('Access denied');
      expect(mockFileSystemDI.access).toHaveBeenCalledWith(path);
    });
  });
  
  describe('stat method', () => {
    it('should return isDirectory and size information', async () => {
      const path = '/test/path';
      mockFileSystemDI.stat.mockResolvedValue({
        isDirectory: () => true,
        size: 1024
      });
      
      const result = await fileSystem.stat(path);
      
      expect(mockFileSystemDI.stat).toHaveBeenCalledWith(path);
      expect(result.isDirectory()).toBe(true);
      expect(result.size).toBe(1024);
    });
    
    it('should propagate errors from fs.stat', async () => {
      const path = '/test/path';
      const error = new Error('Stat failed');
      mockFileSystemDI.stat.mockRejectedValue(error);
      
      await expect(fileSystem.stat(path)).rejects.toThrow('Stat failed');
      expect(mockFileSystemDI.stat).toHaveBeenCalledWith(path);
    });
  });
  
  describe('readFile method', () => {
    it('should read file contents with default encoding', async () => {
      const path = '/test/file.txt';
      const fileContents = 'file contents';
      mockFileSystemDI.readFile.mockResolvedValue(fileContents);
      
      const result = await fileSystem.readFile(path);
      
      expect(mockFileSystemDI.readFile).toHaveBeenCalledWith(path, 'utf-8');
      expect(result).toBe(fileContents);
    });
    
    it('should read file contents with specified encoding', async () => {
      const path = '/test/file.txt';
      const fileContents = 'file contents';
      mockFileSystemDI.readFile.mockResolvedValue(fileContents);
      
      const result = await fileSystem.readFile(path, 'ascii');
      
      expect(mockFileSystemDI.readFile).toHaveBeenCalledWith(path, 'ascii');
      expect(result).toBe(fileContents);
    });
    
    it('should propagate errors from fs.readFile', async () => {
      const path = '/test/file.txt';
      const error = new Error('Read failed');
      mockFileSystemDI.readFile.mockRejectedValue(error);
      
      await expect(fileSystem.readFile(path)).rejects.toThrow('Read failed');
      expect(mockFileSystemDI.readFile).toHaveBeenCalledWith(path, 'utf-8');
    });
  });
  
  describe('readdir method', () => {
    it('should return directory names', async () => {
      const path = '/test/dir';
      const entries = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'dir1', isDirectory: () => true }
      ];
      mockFileSystemDI.readdir.mockResolvedValue(entries);
      
      const result = await fileSystem.readdir(path);
      
      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(path, { withFileTypes: true });
      expect(result).toEqual(['file1.txt', 'dir1']);
    });
    
    it('should propagate errors from fs.readdir', async () => {
      const path = '/test/dir';
      const error = new Error('Readdir failed');
      mockFileSystemDI.readdir.mockRejectedValue(error);
      
      await expect(fileSystem.readdir(path)).rejects.toThrow('Readdir failed');
      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(path, { withFileTypes: true });
    });
  });
  
  describe('writeFile method', () => {
    it('should create parent directory and write file contents', async () => {
      const path = '/test/dir/file.txt';
      const content = 'file contents';
      mockFileSystemDI.writeFile.mockResolvedValue(undefined);
      mockFileSystemDI.mkdir.mockResolvedValue(undefined);
      mockPathDI.dirname.mockReturnValue('/test/dir');
      
      await fileSystem.writeFile(path, content);
      
      expect(mockPathDI.dirname).toHaveBeenCalledWith(path);
      expect(mockFileSystemDI.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(mockFileSystemDI.writeFile).toHaveBeenCalledWith(path, content, 'utf-8');
    });
    
    it('should propagate errors from fs.writeFile', async () => {
      const path = '/test/dir/file.txt';
      const content = 'file contents';
      const error = new Error('Write failed');
      mockFileSystemDI.writeFile.mockRejectedValue(error);
      mockFileSystemDI.mkdir.mockResolvedValue(undefined);
      mockPathDI.dirname.mockReturnValue('/test/dir');
      
      await expect(fileSystem.writeFile(path, content)).rejects.toThrow('Write failed');
      expect(mockFileSystemDI.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(mockFileSystemDI.writeFile).toHaveBeenCalledWith(path, content, 'utf-8');
    });
    
    it('should propagate errors from mkdir', async () => {
      const path = '/test/dir/file.txt';
      const content = 'file contents';
      const error = new Error('Mkdir failed');
      mockFileSystemDI.mkdir.mockRejectedValue(error);
      mockPathDI.dirname.mockReturnValue('/test/dir');
      
      await expect(fileSystem.writeFile(path, content)).rejects.toThrow('Mkdir failed');
      expect(mockFileSystemDI.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(mockFileSystemDI.writeFile).not.toHaveBeenCalled();
    });
  });
  
  describe('unlink method', () => {
    it('should call fs.unlink with the correct path', async () => {
      const path = '/test/file.txt';
      mockFileSystemDI.unlink.mockResolvedValue(undefined);
      
      await fileSystem.unlink(path);
      
      expect(mockFileSystemDI.unlink).toHaveBeenCalledWith(path);
    });
    
    it('should propagate errors from fs.unlink', async () => {
      const path = '/test/file.txt';
      const error = new Error('Unlink failed');
      mockFileSystemDI.unlink.mockRejectedValue(error);
      
      await expect(fileSystem.unlink(path)).rejects.toThrow('Unlink failed');
      expect(mockFileSystemDI.unlink).toHaveBeenCalledWith(path);
    });
  });
  
  describe('mkdir method', () => {
    it('should call fs.mkdir with recursive option by default', async () => {
      const path = '/test/dir';
      mockFileSystemDI.mkdir.mockResolvedValue(undefined);
      
      await fileSystem.mkdir(path);
      
      expect(mockFileSystemDI.mkdir).toHaveBeenCalledWith(path, { recursive: true });
    });
    
    it('should propagate errors from fs.mkdir', async () => {
      const path = '/test/dir';
      const error = new Error('Mkdir failed');
      mockFileSystemDI.mkdir.mockRejectedValue(error);
      
      await expect(fileSystem.mkdir(path)).rejects.toThrow('Mkdir failed');
      expect(mockFileSystemDI.mkdir).toHaveBeenCalledWith(path, { recursive: true });
    });
  });
  
  describe('rmdir method', () => {
    it('should call fs.rm with the correct path', async () => {
      const path = '/test/dir';
      mockFileSystemDI.rm.mockResolvedValue(undefined);
      
      await fileSystem.rmdir(path);
      
      expect(mockFileSystemDI.rm).toHaveBeenCalledWith(path, undefined);
    });
    
    it('should call fs.rm with recursive option', async () => {
      const path = '/test/dir';
      const options = { recursive: true };
      mockFileSystemDI.rm.mockResolvedValue(undefined);
      
      await fileSystem.rmdir(path, options);
      
      expect(mockFileSystemDI.rm).toHaveBeenCalledWith(path, options);
    });
    
    it('should propagate errors from fs.rm', async () => {
      const path = '/test/dir';
      const options = { recursive: true, force: true };
      const error = new Error('Rmdir failed');
      mockFileSystemDI.rm.mockRejectedValue(error);
      
      await expect(fileSystem.rmdir(path, options)).rejects.toThrow('Rmdir failed');
      expect(mockFileSystemDI.rm).toHaveBeenCalledWith(path, options);
    });
  });
  
  describe('pathExistsInternal method', () => {
    it('should return true when path exists', async () => {
      const path = '/test/path';
      mockFileSystemDI.access.mockResolvedValue(undefined);
      
      const result = await (fileSystem as any).pathExistsInternal(path);
      
      expect(mockFileSystemDI.access).toHaveBeenCalledWith(path);
      expect(result).toBe(true);
    });
    
    it('should return false when path does not exist', async () => {
      const path = '/test/nonexistent';
      mockFileSystemDI.access.mockRejectedValue(new Error('Path does not exist'));
      
      const result = await (fileSystem as any).pathExistsInternal(path);
      
      expect(mockFileSystemDI.access).toHaveBeenCalledWith(path);
      expect(result).toBe(false);
    });
  });
  
  describe('isDirectoryInternal method', () => {
    it('should return true for directories', async () => {
      const path = '/test/dir';
      mockFileSystemDI.stat.mockResolvedValue({
        isDirectory: () => true
      });
      
      const result = await (fileSystem as any).isDirectoryInternal(path);
      
      expect(mockFileSystemDI.stat).toHaveBeenCalledWith(path);
      expect(result).toBe(true);
    });
    
    it('should return false for files', async () => {
      const path = '/test/file.txt';
      mockFileSystemDI.stat.mockResolvedValue({
        isDirectory: () => false
      });
      
      const result = await (fileSystem as any).isDirectoryInternal(path);
      
      expect(mockFileSystemDI.stat).toHaveBeenCalledWith(path);
      expect(result).toBe(false);
    });
    
    it('should return false for nonexistent paths', async () => {
      const path = '/test/nonexistent';
      mockFileSystemDI.stat.mockRejectedValue(new Error('Path does not exist'));
      
      const result = await (fileSystem as any).isDirectoryInternal(path);
      
      expect(mockFileSystemDI.stat).toHaveBeenCalledWith(path);
      expect(result).toBe(false);
    });
  });
  
  describe('listDirectoryInternal method', () => {
    it('should return formatted directory entries', async () => {
      const path = '/test/dir';
      const fileEntries = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'dir1', isDirectory: () => true }
      ];
      
      mockFileSystemDI.readdir.mockResolvedValue(fileEntries);
      mockFileSystemDI.stat.mockImplementation((filePath) => {
        const isDir = filePath.endsWith('dir1');
        return Promise.resolve({
          isDirectory: () => isDir,
          size: isDir ? 0 : 1024
        });
      });
      mockPathDI.join.mockImplementation((dir, file) => `${dir}/${file}`);
      
      const result = await (fileSystem as any).listDirectoryInternal(path);
      
      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(path, { withFileTypes: true });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'file1.txt',
        path: '/test/dir/file1.txt',
        type: 'file',
        size: 1024
      });
      expect(result[1]).toEqual({
        name: 'dir1',
        path: '/test/dir/dir1',
        type: 'directory',
        size: 0
      });
    });
    
    it('should filter out entries with stat errors', async () => {
      const path = '/test/dir';
      const fileEntries = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'problematic', isDirectory: () => false }
      ];
      
      mockFileSystemDI.readdir.mockResolvedValue(fileEntries);
      mockFileSystemDI.stat.mockImplementation((filePath) => {
        if (filePath.includes('problematic')) {
          return Promise.reject(new Error('Stat error'));
        }
        return Promise.resolve({
          isDirectory: () => false,
          size: 1024
        });
      });
      mockPathDI.join.mockImplementation((dir, file) => `${dir}/${file}`);
      
      const result = await (fileSystem as any).listDirectoryInternal(path);
      
      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(path, { withFileTypes: true });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'file1.txt',
        path: '/test/dir/file1.txt',
        type: 'file',
        size: 1024
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('should propagate errors from fs.readdir', async () => {
      const path = '/test/dir';
      const error = new Error('Readdir failed');
      mockFileSystemDI.readdir.mockRejectedValue(error);
      
      await expect((fileSystem as any).listDirectoryInternal(path)).rejects.toThrow('Readdir failed');
      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(path, { withFileTypes: true });
    });
  });
  
  describe('searchFiles method', () => {
    it('should warn that searchFiles is not implemented', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await fileSystem.searchFiles('/test/dir', '*.txt');
      
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not yet implemented')
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
});