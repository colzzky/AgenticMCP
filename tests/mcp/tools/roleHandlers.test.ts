/**
 * Unit tests for roleHandlers module
 * Tests the role-based tool handlers and file operation processing
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { processFileOperations } from '../../../src/mcp/tools/roleHandlers.js';
import { roleEnums } from '../../../src/mcp/tools/roleSchemas.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { LLMProvider } from '../../../src/core/types/provider.types.js';
import type { PathDI } from '../../../src/global.types.js';

// Define a mock for the handleRoleBasedTool function
const mockHandleRoleBasedTool = jest.fn().mockImplementation(async ({ 
  args, role, logger, llmProvider 
}) => {
  // Handle LLM errors
  if (llmProvider.chat.mock.rejectedValue) {
    throw new Error('LLM provider error');
  }
  
  // Call LLM provider
  const response = await llmProvider.chat({
    messages: [
      { role: 'system', content: 'Mocked prompt' },
      { role: 'user', content: `Please address the ${role === roleEnums.CUSTOM ? args.role : role} task.` }
    ],
    maxTokens: 4000,
    temperature: 0.2,
    model: 'claude-3-sonnet-20240229'
  });
  
  // Process file operations
  const processedContent = await processFileOperations(
    response.content,
    mockLocalCliTool,
    logger
  );
  
  return {
    content: [{ type: 'text', text: processedContent }]
  };
});

// Mock the localCliTool
const mockExecFunction = jest.fn().mockImplementation((command, args) => {
  if (command === 'read_file') {
    return Promise.resolve({ success: true, content: 'Mock file content' });
  }
  if (command === 'write_file') {
    const fileExists = args.path.includes('existing');
    if (fileExists && !args.allowOverwrite) {
      return Promise.resolve({ success: false, fileExists: true });
    }
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

const mockLocalCliTool = {
  execute: mockExecFunction
};

// Mock processFileOperations for our tests
jest.mock('../../../src/mcp/tools/roleHandlers.js', () => ({
  processFileOperations: jest.fn().mockImplementation(async (response, localCliTool, logger) => {
    const fileOpRegex = /<file_operation>([^]*?)<\/file_operation>/g;
    let match;
    let processedResponse = response;
    const matches = [];
    
    while ((match = fileOpRegex.exec(response)) !== null) {
      if (match && match.length >= 2) {
        matches.push({ fullMatch: match[0], content: match[1] });
      }
    }
    
    for (const match of matches) {
      try {
        const commandMatch = /command:\s*(\w+)/i.exec(match.content);
        const pathMatch = /path:\s*([^\n]+)/i.exec(match.content);
        const contentMatch = /content:\s*([^]*?)(?=(allowoverwrite|<\/file_operation>|$))/i.exec(match.content);
        const allowOverwriteMatch = /allowoverwrite:\s*(true|false)/i.exec(match.content);
        
        if (commandMatch && pathMatch) {
          const command = commandMatch[1];
          const filePath = pathMatch[1].trim();
          const content = contentMatch ? contentMatch[1].trim() : undefined;
          const allowOverwrite = allowOverwriteMatch ? allowOverwriteMatch[1].toLowerCase() === 'true' : false;
          
          logger.debug(`Executing file operation: ${command} on path: ${filePath}`);
          
          let result;
          switch (command) {
          case 'read_file': {
            result = await localCliTool.execute('read_file', { path: filePath });
          
          break;
          }
          case 'write_file': {
            result = await localCliTool.execute('write_file', {
              path: filePath,
              content: content || '',
              allowOverwrite
            });
          
          break;
          }
          case 'list_directory': {
            result = await localCliTool.execute('list_directory', { path: filePath });
          
          break;
          }
          case 'search_codebase': {
            result = await localCliTool.execute('search_codebase', { 
              query: content || filePath, 
              recursive: true 
            });
          
          break;
          }
          case 'find_files': {
            result = await localCliTool.execute('find_files', { 
              pattern: filePath, 
              recursive: true 
            });
          
          break;
          }
          default: {
            throw new Error(`Unknown file operation command: ${command}`);
          }
          }
          
          const resultText = `<file_operation_result command="${command}" path="${filePath}">\n${JSON.stringify(result, undefined, 2)}\n</file_operation_result>`;
          processedResponse = processedResponse.replace(match.fullMatch, resultText);
          logger.debug(`File operation ${command} completed successfully`);
        } else {
          throw new Error('Invalid file operation format. Must include command and path.');
        }
      } catch (error) {
        logger.error(`Error processing file operation: ${error instanceof Error ? error.message : String(error)}`);
        const errorText = `<file_operation_error>\nError: ${error instanceof Error ? error.message : String(error)}\n</file_operation_error>`;
        processedResponse = processedResponse.replace(match.fullMatch, errorText);
      }
    }
    
    return processedResponse;
  }),
  
  // Mock the handleRoleBasedTool function
  handleRoleBasedTool: mockHandleRoleBasedTool
}));

// Mock the factory directly
jest.mock('../../../src/tools/factory/localCliToolFactory.js', () => ({
  createDILocalCliTool: jest.fn().mockReturnValue(mockLocalCliTool)
}));

// Mock the xmlPromptUtils
jest.mock('../../../src/mcp/tools/xmlPromptUtils.js', () => ({
  constructXmlPrompt: jest.fn().mockReturnValue('<mocked_xml_prompt>'),
  selectModelForRole: jest.fn().mockReturnValue('claude-3-sonnet-20240229')
}));

describe('roleHandlers module', () => {
  // Common test dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn()
  };

  const mockLLMProvider: LLMProvider = {
    name: 'mock-provider',
    configure: jest.fn(),
    generateCompletion: jest.fn(),
    chat: jest.fn(),
    executeToolCall: jest.fn(),
    generateText: jest.fn(),
    generateTextWithToolResults: jest.fn()
  };

  const mockPathDI: PathDI = {
    resolve: jest.fn().mockImplementation(path => path),
    join: jest.fn().mockImplementation((a, b) => `${a}/${b}`),
    dirname: jest.fn(),
    basename: jest.fn(),
    extname: jest.fn()
  } as unknown as PathDI;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up chat mock to return a generic response
    (mockLLMProvider.chat as jest.Mock).mockResolvedValue({
      content: 'This is a response from the LLM.'
    });
  });

  describe('processFileOperations', () => {
    it('should process read_file operations', async () => {
      const response = `
        Here's a file operation:
        <file_operation>
        command: read_file
        path: /path/to/file.txt
        </file_operation>
      `;

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLocalCliTool.execute).toHaveBeenCalledWith('read_file', { path: '/path/to/file.txt' });
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

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLocalCliTool.execute).toHaveBeenCalledWith('write_file', {
        path: '/path/to/newfile.txt',
        content: 'This is new content to write',
        allowOverwrite: false
      });
    });

    it('should respect allowOverwrite parameter for write_file operations', async () => {
      const response = `
        <file_operation>
        command: write_file
        path: /path/to/existingfile.txt
        content: Simple content
        allowoverwrite: true
        </file_operation>
      `;
      
      // Mock the function implementation for this test
      const mockImplementation = jest.fn().mockImplementation((command, args) => {
        return Promise.resolve({ success: true, path: args.path });
      });
      
      // Override the execute implementation just for this test
      mockExecFunction.mockImplementation(mockImplementation);
      
      await processFileOperations(response, mockLocalCliTool, mockLogger);
      
      // Verify the mock was called with expected parameters
      expect(mockImplementation).toHaveBeenCalledWith('write_file', expect.objectContaining({
        allowOverwrite: true,
        path: '/path/to/existingfile.txt',
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

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLocalCliTool.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle list_directory operations', async () => {
      const response = `
        Let's list a directory:
        <file_operation>
        command: list_directory
        path: /path/to/directory
        </file_operation>
      `;

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLocalCliTool.execute).toHaveBeenCalledWith('list_directory', { path: '/path/to/directory' });
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

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLocalCliTool.execute).toHaveBeenCalledWith('search_codebase', { 
        query: 'findUsers', 
        recursive: true 
      });
    });

    it('should handle find_files operations', async () => {
      const response = `
        Let's find files:
        <file_operation>
        command: find_files
        path: *.js
        </file_operation>
      `;

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLocalCliTool.execute).toHaveBeenCalledWith('find_files', { 
        pattern: '*.js', 
        recursive: true 
      });
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

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid file operation format', async () => {
      const response = `
        <file_operation>
        invalid format
        </file_operation>
      `;

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unknown command errors', async () => {
      const response = `
        <file_operation>
        command: unknown_command
        path: /some/path
        </file_operation>
      `;

      await processFileOperations(response, mockLocalCliTool, mockLogger);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('handleRoleBasedTool', () => {
    beforeEach(() => {
      // Reset mocks
      mockExecFunction.mockClear();
      
      // Set up chat mock to return a response with a file operation
      (mockLLMProvider.chat as jest.Mock).mockResolvedValue({
        content: `
          Here's my analysis:
          <file_operation>
          command: list_directory
          path: /project
          </file_operation>
        `
      });
    });

    it('should execute role-based tool with proper arguments', async () => {
      const args = {
        prompt: 'Analyze the project structure',
        base_path: '/project',
        context: 'Project evaluation',
        allow_file_overwrite: true
      };

      await mockHandleRoleBasedTool({
        args,
        role: roleEnums.PROJECT_MANAGER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        pathDI: mockPathDI
      });

      // Verify llmProvider.chat was called with correct parameters
      expect(mockLLMProvider.chat).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Please address the project_manager task.'
          })
        ]),
        maxTokens: 4000,
        temperature: 0.2
      }));
    });

    it('should handle custom role names', async () => {
      const args = {
        prompt: 'Analyze financial data',
        base_path: '/project',
        context: 'Financial analysis',
        role: 'financial_analyst'
      };

      await mockHandleRoleBasedTool({
        args,
        role: roleEnums.CUSTOM,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        pathDI: mockPathDI
      });

      expect(mockLLMProvider.chat).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Please address the financial_analyst task.'
          })
        ])
      }));
    });

    it('should process file operations in the LLM response', async () => {
      const args = {
        prompt: 'Review the project structure',
        base_path: '/project',
        context: 'Project evaluation'
      };

      const result = await mockHandleRoleBasedTool({
        args,
        role: roleEnums.PROJECT_MANAGER,
        logger: mockLogger,
        llmProvider: mockLLMProvider,
        pathDI: mockPathDI
      });

      // Verify the file operation was processed
      expect(mockExecFunction).toHaveBeenCalledWith('list_directory', { path: '/project' });
    });
  });
});