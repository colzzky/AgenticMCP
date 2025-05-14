/**
 * Unit tests for FileContextManager
 * Tests the context loading and management functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FileContextManager } from '../../src/context/contextManager.js';
import type { 
  ContextSource, 
  ContextItem, 
  ContextProcessor 
} from '../../src/core/types/context.types.js';
import type { PathDI, FileSystemDI } from '../../src/global.types.js';

// Mock the minimatch dependency
jest.mock('minimatch', () => {
  return {
    Minimatch: class MockMinimatch {
      pattern: string;
      constructor(pattern: string) {
        this.pattern = pattern;
      }
      match(filename: string): boolean {
        // Simple pattern matching for test purposes
        if (this.pattern === '**/*') return true;
        if (this.pattern === '*.md' && filename.endsWith('.md')) return true;
        if (this.pattern === '*.json' && filename.endsWith('.json')) return true;
        return false;
      }
    }
  };
});

describe('FileContextManager', () => {
  // Mock dependencies
  const mockPathDI: PathDI = {
    join: jest.fn((dir, file) => `${dir}/${file}`),
    extname: jest.fn((path) => {
      if (path.endsWith('.md')) return '.md';
      if (path.endsWith('.json')) return '.json';
      if (path.endsWith('.txt')) return '.txt';
      return '';
    }),
    // Add any other path methods needed by tests
    dirname: jest.fn(),
    basename: jest.fn(),
    resolve: jest.fn(),
    parse: jest.fn(),
  } as unknown as PathDI;

  // Mock dirent objects for directory entries
  const createMockDirent = (name: string, isDir: boolean) => ({
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
  });

  // Mock file system operations
  const mockFileSystemDI: FileSystemDI = {
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    // Other FS methods as needed
  } as unknown as FileSystemDI;

  // Test data
  const mockFileContent = 'This is some test content';
  const mockFilePath = '/test/file.md';
  const mockDirPath = '/test/dir';
  const mockJsonFilePath = '/test/file.json';
  const mockTxtFilePath = '/test/file.txt';
  const mockUnknownFilePath = '/test/file.xyz';

  let contextManager: FileContextManager;

  beforeEach(() => {
    jest.clearAllMocks();
    contextManager = new FileContextManager(mockPathDI, mockFileSystemDI);

    // Default mock implementations
    (mockFileSystemDI.stat as jest.Mock).mockImplementation((path) => {
      if (path === mockDirPath) {
        return Promise.resolve({ isDirectory: () => true });
      }
      return Promise.resolve({
        isDirectory: () => false,
        size: 100
      });
    });

    (mockFileSystemDI.readFile as jest.Mock).mockResolvedValue(mockFileContent);
  });

  describe('Constructor', () => {
    it('should initialize with dependencies', () => {
      expect(contextManager.pathDI).toBe(mockPathDI);
      expect(contextManager.fileSystemDI).toBe(mockFileSystemDI);
    });
  });

  describe('addSource', () => {
    it('should add a file source and load its content', async () => {
      const source: ContextSource = {
        type: 'file',
        path: mockFilePath
      };

      await contextManager.addSource(source);

      expect(mockFileSystemDI.stat).toHaveBeenCalledWith(mockFilePath);
      expect(mockFileSystemDI.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
      
      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(mockFilePath);
      expect(items[0].content).toBe(mockFileContent);
      expect(items[0].type).toBe('markdown');
    });

    it('should add a directory source and load its contents', async () => {
      const source: ContextSource = {
        type: 'directory',
        path: mockDirPath,
        recursive: true
      };

      // Mock directory structure
      (mockFileSystemDI.readdir as jest.Mock).mockResolvedValueOnce([
        createMockDirent('file1.md', false),
        createMockDirent('file2.json', false),
        createMockDirent('subdir', true)
      ]);

      // Mock subdir contents
      (mockFileSystemDI.readdir as jest.Mock).mockResolvedValueOnce([
        createMockDirent('file3.txt', false)
      ]);

      await contextManager.addSource(source);

      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(mockDirPath, { withFileTypes: true });
      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(`${mockDirPath}/subdir`, { withFileTypes: true });
      
      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(3); // 2 files in root dir + 1 in subdir
    });

    it('should respect non-recursive flag for directory sources', async () => {
      const source: ContextSource = {
        type: 'directory',
        path: mockDirPath,
        recursive: false
      };

      // Mock directory structure
      (mockFileSystemDI.readdir as jest.Mock).mockResolvedValueOnce([
        createMockDirent('file1.md', false),
        createMockDirent('subdir', true)
      ]);

      await contextManager.addSource(source);

      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(mockDirPath, { withFileTypes: true });
      expect(mockFileSystemDI.readdir).not.toHaveBeenCalledWith(`${mockDirPath}/subdir`, { withFileTypes: true });
      
      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(1); // Only the file in the root dir
    });

    it('should respect maxDepth for recursive directory sources', async () => {
      const source: ContextSource = {
        type: 'directory',
        path: mockDirPath,
        recursive: true,
        maxDepth: 1
      };

      // Mock directory structure
      (mockFileSystemDI.readdir as jest.Mock).mockResolvedValueOnce([
        createMockDirent('file1.md', false),
        createMockDirent('subdir', true)
      ]);

      // Mock subdir contents
      (mockFileSystemDI.readdir as jest.Mock).mockResolvedValueOnce([
        createMockDirent('file2.md', false),
        createMockDirent('subsubdir', true)
      ]);

      await contextManager.addSource(source);

      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(mockDirPath, { withFileTypes: true });
      expect(mockFileSystemDI.readdir).toHaveBeenCalledWith(`${mockDirPath}/subdir`, { withFileTypes: true });
      expect(mockFileSystemDI.readdir).not.toHaveBeenCalledWith(`${mockDirPath}/subdir/subsubdir`, { withFileTypes: true });
      
      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(2); // 1 in root, 1 in subdir, none in subsubdir
    });

    it('should respect glob patterns for file filtering', async () => {
      const source: ContextSource = {
        type: 'directory',
        path: mockDirPath,
        globPatterns: ['*.md']
      };

      // Mock directory structure
      (mockFileSystemDI.readdir as jest.Mock).mockResolvedValueOnce([
        createMockDirent('file1.md', false),
        createMockDirent('file2.json', false),
        createMockDirent('file3.txt', false)
      ]);

      await contextManager.addSource(source);

      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(1); // Only the .md file
      expect(items[0].id).toBe(`${mockDirPath}/file1.md`);
    });
  });

  describe('addProcessor', () => {
    it('should add a processor to the pipeline', async () => {
      // Create a mock processor that adds a token count
      const mockProcessor: ContextProcessor = {
        process: jest.fn().mockImplementation(async (item: ContextItem) => {
          return { 
            ...item, 
            tokens: item.content.split(/\s+/).length,
            metadata: { ...item.metadata, processed: true }
          };
        })
      };

      contextManager.addProcessor(mockProcessor);

      // Add a source to test processing
      const source: ContextSource = {
        type: 'file',
        path: mockFilePath
      };

      await contextManager.addSource(source);
      await contextManager.loadContext();

      expect(mockProcessor.process).toHaveBeenCalled();
      
      const items = await contextManager.getContextItems();
      expect(items[0].tokens).toBeDefined();
      expect(items[0].metadata?.processed).toBe(true);
    });

    it('should handle processors that return multiple items', async () => {
      // Create a mock processor that splits one item into two
      const mockProcessor: ContextProcessor = {
        process: jest.fn().mockImplementation(async (item: ContextItem) => {
          const item1 = { ...item, id: `${item.id}-1` };
          const item2 = { ...item, id: `${item.id}-2` };
          return [item1, item2];
        })
      };

      contextManager.addProcessor(mockProcessor);

      // Add a source
      const source: ContextSource = {
        type: 'file',
        path: mockFilePath
      };

      await contextManager.addSource(source);
      await contextManager.loadContext();

      expect(mockProcessor.process).toHaveBeenCalled();
      
      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe(`${mockFilePath}-1`);
      expect(items[1].id).toBe(`${mockFilePath}-2`);
    });
  });

  describe('loadContext', () => {
    it('should reload all sources and apply processors', async () => {
      // Reset call counts before this test
      jest.clearAllMocks();
      
      // Add a source
      const source: ContextSource = {
        type: 'file',
        path: mockFilePath
      };
      await contextManager.addSource(source);

      // Add a processor
      const mockProcessor: ContextProcessor = {
        process: jest.fn().mockImplementation(async (item: ContextItem) => {
          return { ...item, tokens: 5 };
        })
      };
      contextManager.addProcessor(mockProcessor);

      // Clear mocks after setup to track only loadContext calls
      jest.clearAllMocks();
      
      // Load context
      await contextManager.loadContext();

      // Check that stat was called once during loadContext
      expect(mockFileSystemDI.stat).toHaveBeenCalledWith(mockFilePath);
      expect(mockProcessor.process).toHaveBeenCalled();
      
      const items = await contextManager.getContextItems();
      expect(items[0].tokens).toBe(5);
    });

    it('should handle multiple sources and processors', async () => {
      // Add multiple sources
      const source1: ContextSource = {
        type: 'file',
        path: mockFilePath
      };
      const source2: ContextSource = {
        type: 'file',
        path: mockJsonFilePath
      };
      
      await contextManager.addSource(source1);
      await contextManager.addSource(source2);

      // Add multiple processors
      const processor1: ContextProcessor = {
        process: jest.fn().mockImplementation(async (item: ContextItem) => {
          return { ...item, metadata: { ...item.metadata, processor1: true } };
        })
      };
      const processor2: ContextProcessor = {
        process: jest.fn().mockImplementation(async (item: ContextItem) => {
          return { ...item, metadata: { ...item.metadata, processor2: true } };
        })
      };
      
      contextManager.addProcessor(processor1);
      contextManager.addProcessor(processor2);

      // Load context
      await contextManager.loadContext();

      expect(processor1.process).toHaveBeenCalledTimes(2); // Called for each item
      expect(processor2.process).toHaveBeenCalledTimes(2);
      
      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(2);
      expect(items[0].metadata?.processor1).toBe(true);
      expect(items[0].metadata?.processor2).toBe(true);
      expect(items[1].metadata?.processor1).toBe(true);
      expect(items[1].metadata?.processor2).toBe(true);
    });
  });

  describe('getContextItems', () => {
    it('should return all loaded context items', async () => {
      // Add multiple sources
      const source1: ContextSource = {
        type: 'file',
        path: mockFilePath
      };
      const source2: ContextSource = {
        type: 'file',
        path: mockJsonFilePath
      };
      
      await contextManager.addSource(source1);
      await contextManager.addSource(source2);

      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe(mockFilePath);
      expect(items[1].id).toBe(mockJsonFilePath);
    });

    it('should return an empty array when no items are loaded', async () => {
      const items = await contextManager.getContextItems();
      expect(items).toHaveLength(0);
    });
  });

  describe('getContextItemById', () => {
    it('should return a specific context item by ID', async () => {
      // Add multiple sources
      const source1: ContextSource = {
        type: 'file',
        path: mockFilePath
      };
      const source2: ContextSource = {
        type: 'file',
        path: mockJsonFilePath
      };
      
      await contextManager.addSource(source1);
      await contextManager.addSource(source2);

      const item = await contextManager.getContextItemById(mockJsonFilePath);
      expect(item).toBeDefined();
      expect(item?.id).toBe(mockJsonFilePath);
    });

    it('should return undefined for non-existent ID', async () => {
      const item = await contextManager.getContextItemById('non-existent');
      expect(item).toBeUndefined();
    });
  });

  describe('clearContext', () => {
    it('should clear all sources and items', async () => {
      // Add sources and processors
      const source: ContextSource = {
        type: 'file',
        path: mockFilePath
      };
      await contextManager.addSource(source);

      const processor: ContextProcessor = {
        process: jest.fn()
      };
      contextManager.addProcessor(processor);

      // Verify sources and items are added
      expect(await contextManager.getContextItems()).toHaveLength(1);

      // Clear context
      await contextManager.clearContext();

      // Verify everything is cleared
      expect(await contextManager.getContextItems()).toHaveLength(0);
    });
  });

  describe('getTotalTokens', () => {
    it('should calculate total tokens from all items', async () => {
      // Add items with token counts
      const mockItem1: ContextItem = {
        id: 'item1',
        type: 'markdown',
        content: 'test content',
        tokens: 10
      };
      const mockItem2: ContextItem = {
        id: 'item2',
        type: 'json',
        content: '{}',
        tokens: 5
      };

      // Set items directly using internal property access
      (contextManager as any).items = [mockItem1, mockItem2];

      const totalTokens = await contextManager.getTotalTokens();
      expect(totalTokens).toBe(15);
    });

    it('should handle items without token counts', async () => {
      // Add items with and without token counts
      const mockItem1: ContextItem = {
        id: 'item1',
        type: 'markdown',
        content: 'test content',
        tokens: 10
      };
      const mockItem2: ContextItem = {
        id: 'item2',
        type: 'json',
        content: '{}'
      };

      // Set items directly using internal property access
      (contextManager as any).items = [mockItem1, mockItem2];

      const totalTokens = await contextManager.getTotalTokens();
      expect(totalTokens).toBe(10);
    });

    it('should return 0 when no items are loaded', async () => {
      const totalTokens = await contextManager.getTotalTokens();
      expect(totalTokens).toBe(0);
    });
  });

  describe('detectType', () => {
    it('should detect markdown files', async () => {
      const source: ContextSource = {
        type: 'file',
        path: mockFilePath // .md file
      };
      await contextManager.addSource(source);
      
      const items = await contextManager.getContextItems();
      expect(items[0].type).toBe('markdown');
    });

    it('should detect JSON files', async () => {
      const source: ContextSource = {
        type: 'file',
        path: mockJsonFilePath // .json file
      };
      await contextManager.addSource(source);
      
      const items = await contextManager.getContextItems();
      expect(items[0].type).toBe('json');
    });

    it('should detect text files', async () => {
      const source: ContextSource = {
        type: 'file',
        path: mockTxtFilePath // .txt file
      };
      await contextManager.addSource(source);
      
      const items = await contextManager.getContextItems();
      expect(items[0].type).toBe('text');
    });

    it('should mark unknown file types', async () => {
      const source: ContextSource = {
        type: 'file',
        path: mockUnknownFilePath // .xyz file
      };
      await contextManager.addSource(source);
      
      const items = await contextManager.getContextItems();
      expect(items[0].type).toBe('unknown');
    });
  });
});