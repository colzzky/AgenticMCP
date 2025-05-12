/**
 * @file Tests for BaseCommand using jest-mock-extended following our testing standards
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { mock, mockDeep, MockProxy } from 'jest-mock-extended';
import { BaseCommand, FilePathProcessorFactory } from '../../../src/core/commands/baseCommand';

// Import types from their defined locations
import type { CommandContext, CommandOutput } from '../../../src/core/types/command.types';
import type { Logger } from '../../../src/core/types/logger.types';
import type { FilePathProcessor } from '../../../src/context/filePathProcessor';

/**
 * Test implementation of BaseCommand with proper dependency injection
 * for verifying the base functionality
 */
/**
 * BaseCommand implementation that properly supports DI
 * and provides test-specific functionality
 */
class TestCommand extends BaseCommand {
  public name = 'test';
  public description = 'Test command';
  
  // Properties for test verification
  public processedContext = '';
  public processedArgs: string[] = [];
  
  constructor(
    logger: Logger,
    protected filePathProcessorFactory: FilePathProcessorFactory
  ) {
    super(logger, filePathProcessorFactory);
  }
  
  public getHelp(): string {
    return 'Test command help';
  }
  
  public async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    // Process file paths from arguments
    const result = await this.processFileArgs(args as string[]);
    
    // Store for test verification
    this.processedContext = result.context;
    this.processedArgs = result.remainingArgs;
    
    // Return success output
    return {
      success: true,
      message: 'Command executed',
      data: {
        context: result.context,
        args: result.remainingArgs
      }
    };
  }
}

describe('BaseCommand', () => {
  // Strongly typed mock proxies using jest-mock-extended
  let mockLogger: MockProxy<Logger>;
  let mockFileProcessor: MockProxy<FilePathProcessor>;
  let mockFileProcessorFactory: MockProxy<FilePathProcessorFactory>;
  let command: TestCommand;

  beforeEach(() => {
    // Reset modules and mocks for each test to ensure isolation
    jest.resetModules();
    jest.clearAllMocks();
    
    // Create fresh mocks using jest-mock-extended for type-safety
    mockLogger = mock<Logger>();
    mockFileProcessor = mock<FilePathProcessor>();
    mockFileProcessorFactory = mock<FilePathProcessorFactory>();
    
    // Configure the factory mock to return our file processor mock
    // This properly follows DI principles without using jest.mock
    mockFileProcessorFactory.create.mockReturnValue(mockFileProcessor);
    
    // Create the command with our mocks injected via constructor
    command = new TestCommand(mockLogger, mockFileProcessorFactory);
    
    // Reset test properties to initial state
    command.processedArgs = [];
    command.processedContext = '';
  });

  describe('processFileArgs', () => {
    it('should process file paths in arguments', async () => {
      // Setup mock behavior using jest-mock-extended
      mockFileProcessor.processArgs.mockResolvedValueOnce({
        context: 'Content from files: file.txt, document.md',
        remainingArgs: ['arg1', 'arg2']
      });
      
      // Execute command with file paths
      const result = await command.execute(
        { options: {} },
        'arg1',
        'file.txt',
        'arg2',
        'document.md'
      );
      
      // Verify the command results
      expect(result.success).toBe(true);
      expect(result.message).toBe('Command executed');
      
      // Verify our mock was called with the expected arguments
      expect(mockFileProcessor.processArgs).toHaveBeenCalledWith(
        ['arg1', 'file.txt', 'arg2', 'document.md']
      );
      
      // Verify the context was processed correctly
      expect(command.processedContext).toBe('Content from files: file.txt, document.md');
      expect(command.processedArgs).toEqual(['arg1', 'arg2']);
    });
    
    it('should handle arguments with no file paths', async () => {
      // Setup mock behavior for this test case
      mockFileProcessor.processArgs.mockResolvedValueOnce({
        context: '',
        remainingArgs: ['arg1', 'arg2', 'arg3']
      });
      
      // Execute command with no file paths
      const result = await command.execute(
        { options: {} },
        'arg1',
        'arg2',
        'arg3'
      );
      
      // Verify the mock was called with the expected arguments
      expect(mockFileProcessor.processArgs).toHaveBeenCalledWith(['arg1', 'arg2', 'arg3']);
      
      // Verify the result
      expect(result.success).toBe(true);
      expect(command.processedContext).toBe('');
      expect(command.processedArgs).toEqual(['arg1', 'arg2', 'arg3']);
    });

    it('should handle non-string arguments', async () => {
      // Setup mock behavior for this specific test case
      mockFileProcessor.processArgs.mockResolvedValueOnce({
        context: '',
        remainingArgs: ['arg1']
      });
      
      // Execute with mixed argument types
      const result = await command.execute(
        { options: {} },
        'arg1',
        123,
        true,
        { key: 'value' }
      );
      
      // Verify the mock was called with only the string arguments
      expect(mockFileProcessor.processArgs).toHaveBeenCalledWith(['arg1']);
      
      // Verify the result
      expect(result.success).toBe(true);
      expect(command.processedContext).toBe('');
      expect(command.processedArgs).toEqual(['arg1']);
    });
  });
});