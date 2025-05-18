import { FileSystemTool } from '../../../src/tools/services/fileSystem/index.js';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { processFileOperations, handleRoleBasedTool, HandleRoleBasedToolHandlers } from '../../../src/mcp/tools/roleHandlers.js';
import { mock } from 'jest-mock-extended';
import { roleEnums } from '../../../src/mcp/tools/roleSchemas.js';

// Import types
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { LLMProvider } from '../../../src/core/types/provider.types.js';

// Mock the imported modules
jest.mock('../../../src/providers/providerUtils', () => ({
  orchestrateToolLoop: jest.fn()
}));

jest.mock('../../../src/mcp/tools/xmlPromptUtils', () => ({
  constructXmlPrompt: jest.fn(),
  selectModelForRole: jest.fn()
}));

describe('roleHandlers', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockFileSystemTool: jest.Mocked<FileSystemTool>;
  let mockLLMProvider: jest.Mocked<LLMProvider>;
  let mockHandlers: jest.Mocked<HandleRoleBasedToolHandlers>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Following the Jest mocking guide from memories

    mockLogger = mock<Logger>();
    mockFileSystemTool = mock<FileSystemTool>({
      execute: jest.fn(),
      setBaseDir: jest.fn(),
      setAllowFileOverwrite: jest.fn()
    });
    mockLLMProvider = mock<LLMProvider>();
    
    // Create mock handlers
    mockHandlers = {
      orchestrateToolLoop: jest.fn().mockResolvedValue({ content: 'mocked response' }),
      constructXmlPrompt: jest.fn().mockReturnValue('mocked xml prompt'),
      selectModelForRole: jest.fn().mockReturnValue('claude-3-haiku-20240307'),
      processFileOperations: jest.fn().mockImplementation(async (response) => response)
    };

    // No need to set up these mocks here as they're already part of mockHandlers
  });

  describe('processFileOperations', () => {
    it('should process read_file operations', async () => {
      const response = `Here's the result <file_operation>
        command: read_file
        path: /test/file.txt
      </file_operation>`;

      mockFileSystemTool.execute.mockResolvedValue({ content: 'file content', success: true });

      const result = await processFileOperations(response, mockFileSystemTool, mockLogger);

      expect(result).toContain('file_operation_result');
      expect(result).toContain('file content');
      expect(mockFileSystemTool.execute).toHaveBeenCalledWith('read_file', { path: '/test/file.txt' });
    });

    it('should process write_file operations with allowOverwrite parameter', async () => {
      const response = `Here's the result <file_operation>
        command: write_file
        path: /test/file.txt
        allowOverwrite: true
        content: test content
      </file_operation>`;

      mockFileSystemTool.execute.mockResolvedValue({ success: true });

      const result = await processFileOperations(response, mockFileSystemTool, mockLogger);

      expect(result).toContain('file_operation_result');
      expect(mockFileSystemTool.execute).toHaveBeenCalledWith('write_file', { 
        path: '/test/file.txt', 
        content: 'test content',
        allowOverwrite: true
      });
    });

    it('should handle file exists error when allowOverwrite is false', async () => {
      const response = `Here's the result <file_operation>
        command: write_file
        path: /test/file.txt
        allowOverwrite: false
        content: test content
      </file_operation>`;

      mockFileSystemTool.execute.mockResolvedValue({ success: false, fileExists: true });

      const result = await processFileOperations(response, mockFileSystemTool, mockLogger);

      expect(result).toContain('file_operation_result');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('File exists'));
    });

    it('should handle errors in file operations', async () => {
      const response = `Here's the result <file_operation>
        command: invalid_command
        path: /test/file.txt
      </file_operation>`;

      const result = await processFileOperations(response, mockFileSystemTool, mockLogger);

      expect(result).toContain('file_operation_error');
      expect(result).toContain('Unknown file operation command');
    });

    it('should skip file op if format is invalid', async () => {
      const response = `<file_operation>
        command:
        path: 
      </file_operation>`;
      const result = await processFileOperations(response, mockFileSystemTool, mockLogger);
      expect(result).toContain('<file_operation_error>');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should process multiple file operations in one response', async () => {
      const response = `<file_operation>
        command: read_file
        path: /test1.txt
      </file_operation>
      <file_operation>
        command: delete_file
        path: /test2.txt
      </file_operation>`;
      mockFileSystemTool.execute.mockImplementation((command: string, opts: any) => {
        if (command === 'read_file') return Promise.resolve({ content: 'a', success: true });
        if (command === 'delete_file') return Promise.resolve({ deleted: true });
      });

      const result = await processFileOperations(response, mockFileSystemTool, mockLogger);
      expect(result).toContain('file_operation_result command="read_file" path="/test1.txt"');
      expect(result).toContain('file_operation_result command="delete_file" path="/test2.txt"');
    });
  });

  describe('handleRoleBasedTool', () => {
    it('should execute the role-based tool with the correct parameters', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER
      };

      const result = await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'mocked response' }]
      });

      expect(mockFileSystemTool.setBaseDir).toHaveBeenCalledWith('/test/path');
      expect(mockFileSystemTool.setAllowFileOverwrite).toHaveBeenCalledWith(false);

      expect(mockHandlers.constructXmlPrompt).toHaveBeenCalledWith(
        roleEnums.CODER,
        'Test prompt',
        'Test context',
        [],
        args
      );

      expect(mockHandlers.orchestrateToolLoop).toHaveBeenCalledWith(
        mockLLMProvider,
        {
          messages: [
            { role: 'system', content: 'mocked xml prompt' },
            { role: 'user', content: 'Test prompt' }
          ],
          maxTokens: 10000,
          temperature: 0.2,
          model: 'claude-3-haiku-20240307'
        },
        mockLogger
      );
    });

    it('should process file operations in the LLM response', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER,
        related_files: ['/test/related.txt']
      };

      mockFileSystemTool.execute.mockResolvedValueOnce({ content: 'related file content', success: true });
      mockHandlers.orchestrateToolLoop.mockResolvedValueOnce({ 
        content: `Here's the result <file_operation>
          command: read_file
          path: /test/result.txt
        </file_operation>` 
      });

      const result = await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      expect(mockFileSystemTool.execute).toHaveBeenCalledWith('read_file', { path: '/test/related.txt' });
      expect(mockHandlers.processFileOperations).toHaveBeenCalled();
    });

    it('should handle errors during tool execution', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER
      };

      mockHandlers.orchestrateToolLoop.mockRejectedValueOnce(new Error('LLM API error'));

      await expect(handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      })).rejects.toThrow('LLM API error');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle allow_file_overwrite parameter', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER,
        allow_file_overwrite: true
      };

      await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      expect(mockFileSystemTool.setAllowFileOverwrite).toHaveBeenCalledWith(true);
    });

    it('should read related files when provided', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER,
        related_files: ['file1.ts', 'file2.ts']
      };

      mockFileSystemTool.execute.mockImplementation((command: string, opts: any) => {
        if (command === 'read_file' && opts.path === 'file1.ts') {
          return Promise.resolve({ content: 'content of file1', success: true });
        }
        if (command === 'read_file' && opts.path === 'file2.ts') {
          return Promise.resolve({ content: 'content of file2', success: true });
        }
        return Promise.resolve({ success: false });
      });

      await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      expect(mockFileSystemTool.execute).toHaveBeenCalledWith('read_file', { path: 'file1.ts' });
      expect(mockFileSystemTool.execute).toHaveBeenCalledWith('read_file', { path: 'file2.ts' });
      expect(mockHandlers.constructXmlPrompt).toHaveBeenCalledWith(
        roleEnums.CODER,
        'Test prompt',
        'Test context',
        [
          { path: 'file1.ts', content: 'content of file1' },
          { path: 'file2.ts', content: 'content of file2' }
        ],
        args
      );
    });

    it('should handle file read errors gracefully', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER,
        related_files: ['file1.ts', 'nonexistent.ts']
      };

      mockFileSystemTool.execute.mockImplementation((command: string, opts: any) => {
        if (command === 'read_file' && opts.path === 'file1.ts') {
          return Promise.resolve({ content: 'content of file1', success: true });
        }
        if (command === 'read_file' && opts.path === 'nonexistent.ts') {
          throw new Error('File not found');
        }
        return Promise.resolve({ success: false });
      });

      await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to read file nonexistent.ts'));
      expect(mockHandlers.constructXmlPrompt).toHaveBeenCalledWith(
        roleEnums.CODER,
        'Test prompt',
        'Test context',
        [{ path: 'file1.ts', content: 'content of file1' }],
        args
      );
    });

    it('should orchestrate the tool loop with the correct parameters', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER
      };

      mockHandlers.selectModelForRole.mockReturnValue('claude-3-haiku-20240307');

      await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      expect(mockHandlers.orchestrateToolLoop).toHaveBeenCalledWith(
        mockLLMProvider,
        {
          messages: [
            { role: 'system', content: 'mocked xml prompt' },
            { role: 'user', content: 'Test prompt' }
          ],
          maxTokens: 10000,
          temperature: 0.2,
          model: 'claude-3-haiku-20240307'
        },
        mockLogger
      );
    });

    it('should return processed LLM response with file operations', async () => {
      const args = {
        prompt: 'Test prompt',
        base_path: '/test/path',
        context: 'Test context',
        role: roleEnums.CODER
      };

      mockHandlers.orchestrateToolLoop.mockResolvedValueOnce({ 
        content: `Here's the result <file_operation>
          command: read_file
          path: /test/result.txt
        </file_operation>` 
      });
      
      // Override the default implementation for this test
      mockHandlers.processFileOperations.mockResolvedValueOnce(
        `Here's the result <file_operation_result command="read_file" path="/test/result.txt">
{"content":"file content","success":true}
</file_operation_result>`
      );

      const result = await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      expect(result.content[0].text).toContain('file_operation_result');
      expect(mockHandlers.processFileOperations).toHaveBeenCalledWith(
        `Here's the result <file_operation>
          command: read_file
          path: /test/result.txt
        </file_operation>`,
        mockFileSystemTool,
        mockLogger
      );
    });

    it('should process write_file operations with README.md modification', async () => {
      // Test case with the provided args
      const args = {
        prompt: 'Write "hello world" to the README.md file. Keep all the existing content but add "hello world" at the top of the file.',
        context: 'The user wants to modify the README.md file to add "hello world" at the top while preserving all existing content. The file should be overwritten.',
        language: 'markdown',
        base_path: '/Users/colinmarcelino/Documents/AgenticMCP.Typescript',
        related_files: [
          '/Users/colinmarcelino/Documents/AgenticMCP.Typescript/README.md'
        ],
        allow_file_overwrite: true,
        role: roleEnums.CODER
      };

      // Mock file system tool to return README.md content
      mockFileSystemTool.execute.mockImplementation((command, params) => {
        if (command === 'read_file' && params.path === '/Users/colinmarcelino/Documents/AgenticMCP.Typescript/README.md') {
          return Promise.resolve({ 
            content: '# AgenticMCP CLI\n\n[![Open Source](https://img.shields.io/badge/Open%20Source-MIT-green.svg)](LICENSE)\n\n## Overview\n\nAgenticMCP...',
            success: true 
          });
        }
        return Promise.resolve({ success: true });
      });

      // Mock the LLM response with file operation to write to README.md
      mockHandlers.orchestrateToolLoop.mockResolvedValueOnce({ 
        content: `I'll add "hello world" to the top of the README.md file while preserving the existing content.

<file_operation>
command: write_file
path: /Users/colinmarcelino/Documents/AgenticMCP.Typescript/README.md
allowoverwrite: true
content: hello world

# AgenticMCP CLI

[![Open Source](https://img.shields.io/badge/Open%20Source-MIT-green.svg)](LICENSE)

## Overview

AgenticMCP...
</file_operation>` 
      });
      
      // Mock the file operation processing
      mockHandlers.processFileOperations.mockImplementation(async (response) => {
        return response.replace(
          /<file_operation>[\s\S]*?<\/file_operation>/g,
          `<file_operation_result command="write_file" path="/Users/colinmarcelino/Documents/AgenticMCP.Typescript/README.md">
{"success":true}
</file_operation_result>`
        );
      });

      const result = await handleRoleBasedTool({
        args,
        role: roleEnums.CODER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        fileSystemTool: mockFileSystemTool,
        handlers: mockHandlers
      });

      // Verify the result contains the file operation result
      expect(result.content[0].text).toContain('file_operation_result');
      
      // Verify the file system tool was set up correctly
      expect(mockFileSystemTool.setBaseDir).toHaveBeenCalledWith('/Users/colinmarcelino/Documents/AgenticMCP.Typescript');
      expect(mockFileSystemTool.setAllowFileOverwrite).toHaveBeenCalledWith(true);
      
      // Verify the related file was read
      expect(mockFileSystemTool.execute).toHaveBeenCalledWith('read_file', {
        path: '/Users/colinmarcelino/Documents/AgenticMCP.Typescript/README.md'
      });
      
      // Verify the XML prompt was constructed with the correct arguments
      expect(mockHandlers.constructXmlPrompt).toHaveBeenCalledWith(
        roleEnums.CODER,
        'Write "hello world" to the README.md file. Keep all the existing content but add "hello world" at the top of the file.',
        'The user wants to modify the README.md file to add "hello world" at the top while preserving all existing content. The file should be overwritten.',
        expect.arrayContaining([{
          path: '/Users/colinmarcelino/Documents/AgenticMCP.Typescript/README.md',
          content: expect.any(String)
        }]),
        args
      );
    });
  });
});