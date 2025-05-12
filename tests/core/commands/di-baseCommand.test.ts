/**
 * @file Tests for DIBaseCommand with dependency injection
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { DIBaseCommand } from '../../../src/core/commands/di-base-command';
import { DIFilePathProcessor } from '../../../src/context/di-file-path-processor';
import { DI_TOKENS } from '../../../src/core/di/tokens';
import { DIContainer } from '../../../src/core/di/container';
import type { CommandContext, CommandOutput } from '../../../src/core/types/command.types';
import type { Logger } from '../../../src/core/types/logger.types';

/**
 * Test implementation of DIBaseCommand
 */
class TestDICommand extends DIBaseCommand {
  name = 'test';
  description = 'Test command with DI';

  processedContext = '';
  processedArgs: string[] = [];

  constructor(logger: Logger, container?: DIContainer) {
    super(logger, container);
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

describe('DIBaseCommand', () => {
  // Create mocks for dependencies
  let mockLogger: Logger;
  let mockFilePathProcessor: DIFilePathProcessor;
  let mockContainer: DIContainer;
  let command: TestDICommand;

  beforeEach(() => {
    // Reset modules between tests
    jest.resetModules();
    
    // Create fresh mocks for each test
    mockLogger = mock<Logger>();
    mockFilePathProcessor = mock<DIFilePathProcessor>();
    mockContainer = mock<DIContainer>();
    
    // Setup the container to return the mockFilePathProcessor
    (mockContainer.get as jest.Mock).mockImplementation((token: string) => {
      if (token === DI_TOKENS.FILE_PATH_PROCESSOR) {
        return mockFilePathProcessor;
      }
      return undefined;
    });
    
    // Create command with mocks
    command = new TestDICommand(mockLogger, mockContainer);
    
    // Reset test state
    command.processedContext = '';
    command.processedArgs = [];
  });
  
  it('should create a command instance', () => {
    expect(command).toBeInstanceOf(DIBaseCommand);
    expect(command.name).toBe('test');
    expect(command.description).toBe('Test command with DI');
  });
  
  it('should process file arguments and extract context', async () => {
    // Mock the file processor to return predefined content
    const mockFileContent = `--- file1.txt ---
This is file 1 content

--- file2.md ---
# File 2 Markdown Content`;
    
    (mockFilePathProcessor.processArgs as jest.Mock).mockResolvedValue({
      context: mockFileContent,
      remainingArgs: ['some', 'regular', 'args']
    });
    
    // Create arguments with file paths and regular arguments
    const args = ['/test/file1.txt', 'some', 'regular', 'args', '/test/file2.md'];
    
    // Execute the command
    const result = await command.execute({}, ...args);
    
    // Verify processArgs was called with the correct arguments
    expect(mockFilePathProcessor.processArgs).toHaveBeenCalledWith(args);
    
    // Verify file context was processed and contains expected file contents
    expect(result.success).toBe(true);
    expect(command.processedContext).toContain('file1.txt');
    expect(command.processedContext).toContain('This is file 1 content');
    expect(command.processedContext).toContain('file2.md');
    expect(command.processedContext).toContain('# File 2 Markdown Content');
    
    // Verify remaining arguments were correctly identified
    expect(command.processedArgs).toEqual(['some', 'regular', 'args']);
  });
  
  it('should handle no file arguments', async () => {
    // Mock processor to return empty context
    (mockFilePathProcessor.processArgs as jest.Mock).mockResolvedValue({
      context: '',
      remainingArgs: ['arg1']
    });
    
    // Execute with non-file arguments
    const result = await command.execute({}, 'arg1');
    
    // Should succeed with empty context
    expect(result.success).toBe(true);
    expect(command.processedContext).toBe('');
    
    // Only string arguments should remain
    expect(command.processedArgs).toEqual(['arg1']);
  });
  
  it('should handle non-string arguments', async () => {
    // Mock processor to return empty context
    (mockFilePathProcessor.processArgs as jest.Mock).mockResolvedValue({
      context: '',
      remainingArgs: ['arg1']
    });
    
    // Execute with mixed argument types
    const result = await command.execute({}, 'arg1', 123, true, { key: 'value' });
    
    // Should succeed with empty context
    expect(result.success).toBe(true);
    expect(command.processedContext).toBe('');
    
    // Only string arguments should remain
    expect(command.processedArgs).toEqual(['arg1']);
  });
  
  it('should use the FilePathProcessor from the DI container', async () => {
    // Mock the processor to return specific values
    (mockFilePathProcessor.processArgs as jest.Mock).mockResolvedValue({
      context: 'Mocked context',
      remainingArgs: ['mocked', 'args']
    });
    
    // Execute with arguments
    const result = await command.execute({}, 'arg1', 'arg2');
    
    // Verify the process args method was called
    expect(mockFilePathProcessor.processArgs).toHaveBeenCalledWith(['arg1', 'arg2']);
    
    // Verify results were used
    expect(result.success).toBe(true);
    expect(command.processedContext).toBe('Mocked context');
    expect(command.processedArgs).toEqual(['mocked', 'args']);
  });
});
