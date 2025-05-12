/**
 * @file Tests for DI-enabled FilePathProcessor
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { IFileSystem } from '../../src/core/interfaces/file-system.interface';
import { Logger } from '../../src/core/types/logger.types';
import { TestFilePathProcessor } from '../utils/test-processor';

describe('DIFilePathProcessor', () => {
  let mockFs = mock<IFileSystem>();
  let mockLogger = mock<Logger>();
  let processor: TestFilePathProcessor;
  
  beforeEach(() => {
    // Reset modules between tests
    jest.resetModules();
    
    // Create fresh mocks with jest-mock-extended
    mockLogger = mock<Logger>();
    mockFs = mock<IFileSystem>();
    
    // Create processor with test implementation
    processor = new TestFilePathProcessor(mockLogger, mockFs);
    
    // Add test files
    processor.addFile('/test/file1.txt', 'This is test file 1');
    processor.addFile('/test/file2.md', '# Test markdown file');
    processor.addFile('/test/code.js', 'function test() { return 42; }');
    processor.addFile('/test/subdir/nested.txt', 'Nested file content');
  });
  
  it('should process file paths from arguments', async () => {
    const args = ['/test/file1.txt', 'some', 'regular', 'args', '/test/file2.md'];
    
    const result = await processor.processArgs(args);
    
    // Verify context contains file contents
    expect(result.context).toContain('This is test file 1');
    expect(result.context).toContain('# Test markdown file');
    expect(result.context).toContain('file1.txt');
    expect(result.context).toContain('file2.md');
    
    // Verify non-file arguments are returned separately
    expect(result.remainingArgs).toEqual(['some', 'regular', 'args']);
  });
  
  it('should handle no file paths', async () => {
    const args = ['arg1', 'arg2', 'arg3'];
    
    const result = await processor.processArgs(args);
    
    // Verify empty context and all args remain
    expect(result.context).toBe('');
    expect(result.remainingArgs).toEqual(['arg1', 'arg2', 'arg3']);
  });
  
  it('should handle non-existent paths', async () => {
    const args = ['/test/nonexistent.txt', 'arg1', '/test/file1.txt'];
    
    const result = await processor.processArgs(args);
    
    // Context should contain only the existing file content
    expect(result.context).toContain('This is test file 1');
    expect(result.context).toContain('file1.txt');
    expect(result.context).not.toContain('nonexistent.txt');
    
    // Non-existent file path and regular arg should be in remainingArgs
    expect(result.remainingArgs).toEqual(['/test/nonexistent.txt', 'arg1']);
  });
  
  it('should process directories recursively', async () => {
    const args = ['/test'];
    
    const result = await processor.processArgs(args);
    
    // Context should contain all files in the directory
    expect(result.context).toContain('This is test file 1');
    expect(result.context).toContain('# Test markdown file');
    expect(result.context).toContain('function test() { return 42; }');
    expect(result.context).toContain('Nested file content');
    
    // File name markers should be included
    expect(result.context).toContain('file1.txt');
    expect(result.context).toContain('file2.md');
    expect(result.context).toContain('code.js');
    expect(result.context).toContain('nested.txt');
    
    // No remaining args
    expect(result.remainingArgs).toEqual([]);
  });
  
  it('should log debug information during processing', async () => {
    const args = ['/test/file1.txt'];
    
    await processor.processArgs(args);
    
    // Verify logging
    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
