/**
 * Unit tests for processFileOperations function from roleHandlers module
 * Tests the file operation processing functionality only
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { processFileOperations } from '../../../src/mcp/tools/roleHandlers.js';
import type { Logger } from '../../../src/core/types/logger.types.js';

describe('processFileOperations', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn()
  };

  // Mock execute function for the localCliTool
  const mockExecFunction = jest.fn();
  
  // Mock the localCliTool with our execute function
  const mockLocalCliTool = {
    execute: mockExecFunction
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default implementation for the execute function that returns appropriate results
    // based on the command
    mockExecFunction.mockImplementation((command, args) => {
      if (command === 'read_file') {
        return Promise.resolve({ success: true, content: 'Mock file content' });
      }
      if (command === 'write_file') {
        return Promise.resolve({ success: true, path: args.path });
      }
      if (command === 'list_directory') {
        return Promise.resolve({ success: true, files: ['file1.txt', 'file2.txt'] });
      }
      if (command === 'search_codebase') {
        return Promise.resolve({ success: true, matches: ['match1', 'match2'] });
      }
      if (command === 'find_files') {
        return Promise.resolve({ success: true, files: ['file1.txt', 'file2.txt'] });
      }
      return Promise.resolve({ success: true });
    });
  });

  it('should process read_file operations', async () => {
    const response = `
      Here's a file operation:
      <file_operation>
      command: read_file
      path: /path/to/file.txt
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(mockExecFunction).toHaveBeenCalledWith('read_file', { path: '/path/to/file.txt' });
    expect(result).toContain('<file_operation_result command="read_file" path="/path/to/file.txt">');
    expect(result).toContain('Mock file content');
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Executing file operation: read_file'));
  });

  it('should process write_file operations', async () => {
    const response = `
      Let's write a file:
      <file_operation>
      command: write_file
      path: /path/to/newfile.txt
      content: This is new content to write
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(mockExecFunction).toHaveBeenCalledWith('write_file', {
      path: '/path/to/newfile.txt',
      content: 'This is new content to write',
      allowOverwrite: false
    });
    expect(result).toContain('<file_operation_result command="write_file" path="/path/to/newfile.txt">');
  });

  it('should respect allowOverwrite parameter for write_file operations', async () => {
    // This is a challenging regex pattern to match correctly - let's test the key regex components
    const fileOpContent = `
    command: write_file
    path: /path/to/existingfile.txt
    content: This will overwrite existing content
    allowoverwrite: true
    `;
    
    // Extract key pieces using the same regex patterns from the function
    const commandMatch = /command:\s*(\w+)/i.exec(fileOpContent);
    const pathMatch = /path:\s*([^\n]+)/i.exec(fileOpContent);
    const contentMatch = /content:\s*([^]*?)$/i.exec(fileOpContent); // simplified for this test
    const allowOverwriteMatch = /allowoverwrite:\s*(true|false)/i.exec(fileOpContent);
    
    // Make manual assertions about regex matching
    expect(commandMatch?.[1]).toBe('write_file');
    expect(pathMatch?.[1].trim()).toBe('/path/to/existingfile.txt');
    expect(contentMatch?.[1].trim()).toContain('This will overwrite existing content');
    expect(allowOverwriteMatch?.[1]).toBe('true');
    
    // Now test the actual function
    const response = `
      <file_operation>
      command: write_file
      path: /path/to/existingfile.txt
      content: Simple content
      allowoverwrite: true
      </file_operation>
    `;
    
    await processFileOperations(response, mockLocalCliTool, mockLogger);
    
    expect(mockExecFunction).toHaveBeenCalledWith('write_file', expect.objectContaining({
      allowOverwrite: true
    }));
  });

  it('should handle multiple file operations', async () => {
    const response = `
      Let's perform multiple operations:
      <file_operation>
      command: read_file
      path: /path/to/file1.txt
      </file_operation>

      <file_operation>
      command: write_file
      path: /path/to/file2.txt
      content: New content
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(mockExecFunction).toHaveBeenCalledTimes(2);
    expect(result).toContain('<file_operation_result command="read_file" path="/path/to/file1.txt">');
    expect(result).toContain('<file_operation_result command="write_file" path="/path/to/file2.txt">');
  });

  it('should handle list_directory operations', async () => {
    const response = `
      Let's list a directory:
      <file_operation>
      command: list_directory
      path: /path/to/directory
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(mockExecFunction).toHaveBeenCalledWith('list_directory', { path: '/path/to/directory' });
    expect(result).toContain('<file_operation_result command="list_directory" path="/path/to/directory">');
    expect(result).toContain('file1.txt');
    expect(result).toContain('file2.txt');
  });

  it('should handle search_codebase operations', async () => {
    const response = `
      Let's search the codebase:
      <file_operation>
      command: search_codebase
      path: function findUsers
      content: findUsers
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(mockExecFunction).toHaveBeenCalledWith('search_codebase', { 
      query: 'findUsers', 
      recursive: true 
    });
    expect(result).toContain('<file_operation_result command="search_codebase" path="function findUsers">');
  });

  it('should handle find_files operations', async () => {
    const response = `
      Let's find files:
      <file_operation>
      command: find_files
      path: *.js
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(mockExecFunction).toHaveBeenCalledWith('find_files', { 
      pattern: '*.js', 
      recursive: true 
    });
    expect(result).toContain('<file_operation_result command="find_files" path="*.js">');
  });

  it('should handle errors in file operations', async () => {
    mockExecFunction.mockRejectedValueOnce(new Error('File not found'));

    const response = `
      Let's read a non-existent file:
      <file_operation>
      command: read_file
      path: /path/to/nonexistent.txt
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(result).toContain('<file_operation_error>');
    expect(result).toContain('Error: File not found');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should handle invalid file operation format', async () => {
    const response = `
      <file_operation>
      invalid format
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(result).toContain('<file_operation_error>');
    expect(result).toContain('Invalid file operation format');
  });

  it('should handle unknown command errors', async () => {
    const response = `
      <file_operation>
      command: unknown_command
      path: /some/path
      </file_operation>
    `;

    const result = await processFileOperations(response, mockLocalCliTool, mockLogger);

    expect(result).toContain('<file_operation_error>');
    expect(result).toContain('Unknown file operation command');
  });
});