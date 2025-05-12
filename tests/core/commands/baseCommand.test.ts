/**
 * @file Tests for BaseCommand
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { BaseCommand } from '../../../src/core/commands/baseCommand';
import { FilePathProcessor } from '../../../src/context/filePathProcessor';
import type { CommandContext, CommandOutput } from '../../../src/core/types/command.types';

// Create mock for FilePathProcessor
jest.mock('../../../src/context/filePathProcessor', () => {
  return {
    FilePathProcessor: jest.fn().mockImplementation(() => {
      return {
        processArgs: jest.fn<(args: string[]) => Promise<{ context: string; remainingArgs: string[] }>>().mockImplementation(async (args) => {
          // Simple mock implementation for testing
          const fileArgs = args.filter((arg: string) => arg.includes('.txt') || arg.includes('.md'));
          const remainingArgs = args.filter((arg: string) => !fileArgs.includes(arg));

          const context = fileArgs.length > 0 ?
            `Content from files: ${fileArgs.join(', ')}` :
            '';

          return { context, remainingArgs };
        })
      };
    }) as unknown as jest.MockedClass<typeof FilePathProcessor>
  };
});

// Mock logger
jest.mock('../../../src/core/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Create test implementation of BaseCommand
class TestCommand extends BaseCommand {
  name = 'test';
  description = 'Test command';

  processedContext = '';
  processedArgs: string[] = [];

  constructor(logger: any) {
    super(logger);
  }

  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    const { context: fileContext, remainingArgs } = await this.processFileArgs(args);

    this.processedContext = fileContext;
    this.processedArgs = remainingArgs;

    return {
      success: true,
      message: 'Command executed',
      data: { fileContext, remainingArgs }
    };
  }

  getHelp(): string {
    return 'Test command help';
  }
}

describe('BaseCommand', () => {
  let command: TestCommand;
  let mockLogger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Create command instance
    command = new TestCommand(mockLogger);

    // Mock FilePathProcessor implementation
    (FilePathProcessor.prototype.processArgs as jest.MockedFunction<(args: string[]) => Promise<{ context: string; remainingArgs: string[] }>>).mockImplementation(async (args) => {
      // Simple mock implementation for testing
      const fileArgs = args.filter((arg: string) => arg.includes('.txt') || arg.includes('.md'));
      const remainingArgs = args.filter((arg: string) => !fileArgs.includes(arg));

      const context = fileArgs.length > 0 ?
        `Content from files: ${fileArgs.join(', ')}` :
        '';

      return { context, remainingArgs };
    });
  });

  describe('processFileArgs', () => {
    it('should process file paths in arguments', async () => {
      // Execute command with file paths
      const result = await command.execute(
        { options: {} },
        'arg1',
        'file.txt',
        'arg2',
        'document.md'
      );

      // Verify that FilePathProcessor was instantiated
      expect(FilePathProcessor).toHaveBeenCalledWith(mockLogger);

      // Verify that processArgs was called with string arguments
      expect(FilePathProcessor.prototype.processArgs).toHaveBeenCalledWith([
        'arg1', 'file.txt', 'arg2', 'document.md'
      ]);

      // Verify processed context and remaining args
      expect(command.processedContext).toContain('file.txt');
      expect(command.processedContext).toContain('document.md');
      expect(command.processedArgs).toEqual(['arg1', 'arg2']);

      // Verify command output
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        fileContext: expect.stringContaining('Content from files'),
        remainingArgs: ['arg1', 'arg2']
      });
    });

    it('should handle arguments with no file paths', async () => {
      // Execute command with no file paths
      const result = await command.execute(
        { options: {} },
        'arg1',
        'arg2',
        'arg3'
      );

      // Verify processed context and remaining args
      expect(command.processedContext).toBe('');
      expect(command.processedArgs).toEqual(['arg1', 'arg2', 'arg3']);

      // Verify command output
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        fileContext: '',
        remainingArgs: ['arg1', 'arg2', 'arg3']
      });
    });

    it('should handle non-string arguments', async () => {
      // Execute command with non-string arguments
      const result = await command.execute(
        { options: {} },
        'arg1',
        123,
        true,
        { key: 'value' }
      );

      // Verify that non-string args were filtered
      expect(FilePathProcessor.prototype.processArgs).toHaveBeenCalledWith(['arg1']);

      // Verify command output
      expect(result.success).toBe(true);
    });
  });
});