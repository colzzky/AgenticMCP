/**
 * Tests for BaseCommand abstract class
 * Tests the core functionality provided by the BaseCommand
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BaseCommand, DefaultFilePathProcessorFactory, type FilePathProcessorFactory } from '../../../src/core/commands/baseCommand.js';
import { mock, MockProxy, mockReset } from 'jest-mock-extended';
import type { CommandContext, CommandOutput } from '../../../src/core/types/command.types.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { PathDI, FileSystemDI } from '../../../src/global.types.js';
import type { IFileSystem } from '../../../src/core/interfaces/file-system.interface.js';

// Create a concrete implementation of BaseCommand for testing
class TestCommand extends BaseCommand {
  name = 'test-command';
  description = 'Test command for unit tests';
  aliases = ['test', 'tc'];
  options = [
    {
      flags: '-f, --flag',
      description: 'Test flag'
    }
  ];

  // Expose protected method for testing
  public async testProcessFileArgs(args: unknown[]): Promise<{ context: string; remainingArgs: string[] }> {
    return this.processFileArgs(args);
  }

  // Implement abstract methods
  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    return {
      success: true,
      message: 'Test executed successfully',
      data: { args }
    };
  }

  getHelp(): string {
    return 'Test command help text';
  }
}

describe('BaseCommand', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  // Mock the FilePathProcessor class and factory
  let mockProcessor: MockProxy<FilePathProcessor>;
  let mockFactory: MockProxy<FilePathProcessorFactory>;
  let command: TestCommand;

  beforeEach(() => {
    mockProcessor = mock<FilePathProcessor>();
    mockProcessor.processArgs.mockReturnValue({ context: 'mockContext', remainingArgs: [] });
    mockFactory = mock<FilePathProcessorFactory>();
    mockFactory.create.mockReturnValue(mockProcessor);
    command = new TestCommand(mockLogger, mockFactory);
    jest.clearAllMocks();
  });

  describe('processFileArgs', () => {
    it('should filter out non-string arguments', async () => {
      mockProcessor.processArgs.mockReturnValue({ context: 'filtered', remainingArgs: ['file.txt'] });
      const result = await command.testProcessFileArgs(['file.txt', 123, null]);
      expect(result.context).toBe('filtered');
      expect(result.remainingArgs).toEqual(['file.txt']);
    });

    it('should handle empty arguments list', async () => {
      mockProcessor.processArgs.mockReturnValue({ context: 'empty', remainingArgs: [] });
      const result = await command.testProcessFileArgs([]);
      expect(result.context).toBe('empty');
      expect(result.remainingArgs).toEqual([]);
    });

    it('should handle processor errors gracefully', async () => {
      const testError = new Error('Test error');
      mockProcessor.processArgs.mockImplementation(() => { throw testError; });
      await expect(command.testProcessFileArgs(['file.txt'])).rejects.toThrow(testError);
    });
  });

  describe('constructor', () => {
    it('should properly initialize with dependencies', () => {
      expect(command).toBeInstanceOf(BaseCommand);
      expect(command.name).toBe('test-command');
      expect(command.description).toBe('Test command for unit tests');
      expect(command.aliases).toEqual(['test', 'tc']);
      expect(command.options).toHaveLength(1);
      expect(command.options?.[0].flags).toBe('-f, --flag');
    });
  });

  describe('execute', () => {
    it('should return a successful command output', async () => {
      const context: CommandContext = {
        rawArgs: ['test-command', 'arg1'],
        options: { flag: true }
      };
      const result = await command.execute(context, 'arg1', 'arg2');
      expect(result).toEqual({
        success: true,
        message: 'Test executed successfully',
        data: { args: ['arg1', 'arg2'] }
      });
    });
  });

  describe('getHelp', () => {
    it('should return help text', () => {
      const result = command.getHelp();
      expect(result).toBe('Test command help text');
    });
  });
});

describe('DefaultFilePathProcessorFactory', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockPathDI: PathDI = {
    join: jest.fn(),
    resolve: jest.fn(),
    dirname: jest.fn(),
    basename: jest.fn(),
    extname: jest.fn(),
    isAbsolute: jest.fn(),
    relative: jest.fn(),
    sep: '/'
  };

  const mockFileSystem: IFileSystem = {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn(),
    pathDI: mockPathDI,
    fileSystemDI: {} as any
  };

  const mockFileSystemDI: FileSystemDI = {
    promises: {
      access: jest.fn(),
      stat: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      mkdir: jest.fn(),
      readdir: jest.fn()
    },
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn()
  };

  const mockProcessDI = {
    cwd: jest.fn()
  } as unknown as NodeJS.Process;

  const MockFilePathProcessor = (jest.fn() as any).mockImplementation(() => ({
    processArgs: jest.fn()
  }));

  let factory: DefaultFilePathProcessorFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new DefaultFilePathProcessorFactory(
      mockPathDI,
      mockFileSystem,
      mockFileSystemDI,
      mockProcessDI,
      MockFilePathProcessor as any
    );
  });

  describe('constructor', () => {
    it('should properly initialize with dependencies', () => {
      expect(factory.pathDI).toBe(mockPathDI);
      expect(factory.fileSystem).toBe(mockFileSystem);
      expect(factory.fileSystemDI).toBe(mockFileSystemDI);
      expect(factory.processDi).toBe(mockProcessDI);
      expect(factory.factory).toBe(MockFilePathProcessor);
    });
  });

  describe('create', () => {
    it('should create a FilePathProcessor instance with correct dependencies', () => {
      const processor = factory.create(mockLogger);
      expect(MockFilePathProcessor).toHaveBeenCalledWith(
        mockLogger,
        mockFileSystem,
        mockPathDI,
        mockFileSystemDI,
        mockProcessDI,
        {}
      );
      expect(processor).toBeDefined();
    });
  });
});