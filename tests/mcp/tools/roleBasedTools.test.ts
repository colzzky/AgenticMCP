import { jest } from '@jest/globals';
import { registerRoleBasedTools } from '../../../src/mcp/tools/roleBasedTools';
import type { Logger } from '../../../src/core/types/logger.types';
import type { LLMProvider } from '../../../src/core/types/provider.types';

// Create mock MCP server
const mockServer = {
  registerTool: jest.fn()
};

// Create mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as Logger;

// Create mock LLM provider
const mockLlmProvider = {
  name: 'mock-provider',
  configure: jest.fn(),
  generateCompletion: jest.fn(),
  chat: (jest.fn<any>().mockResolvedValue({
    success: true,
    content: 'Mock LLM response'
  }) as jest.Mock<any>),
  executeToolCall: jest.fn(),
  generateText: jest.fn(),
  generateTextWithToolResults: jest.fn()
} as unknown as LLMProvider;

describe('Role-Based Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should register all role-based tools with the MCP server', () => {
    registerRoleBasedTools(mockServer as any, mockLogger, mockLlmProvider);
    
    // Check that registration was logged
    expect(mockLogger.info).toHaveBeenCalledWith('Registering role-based MCP tools');
    expect(mockLogger.info).toHaveBeenCalledWith('Role-based MCP tools registered successfully');
    
    // Check that all tools were registered
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'coder',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'qa',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'project_manager',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'cpo',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'ui_ux',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'summarizer',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'rewriter',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'analyst',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'custom',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });
  
  test('should handle tool execution with proper XML formatting and file operations', async () => {
    registerRoleBasedTools(mockServer as any, mockLogger, mockLlmProvider);

    // Get the tool handler for 'coder'
    const coderToolHandler = mockServer.registerTool.mock.calls.find(
      call => call[0] === 'coder'
    )?.[3];

    expect(coderToolHandler).toBeDefined();

    if (coderToolHandler) {
      // Call the tool handler with mock arguments
      const args = {
        prompt: 'Create a simple function',
        base_path: '/test/path',
        language: 'JavaScript',
        context: 'This is a test context'
      };

      // Mock the file operations processing
      (mockLlmProvider.chat as jest.Mock<any>).mockResolvedValueOnce({
        success: true,
        content: 'Here is my solution: <solution>function add(a, b) { return a + b; }</solution>\n\n' +
                'Let me read a file: <file_operation>\ncommand: read_file\npath: test.js\n</file_operation>'
      });

      const result = await (coderToolHandler as (args: any) => Promise<any>)(args);

      // Check that LLM was called
      expect(mockLlmProvider.chat).toHaveBeenCalled();

      // Verify the message format
      const messages = ((mockLlmProvider.chat as jest.Mock<any>).mock.calls[0][0] as any).messages;
      expect(messages[0].role).toBe('system');

      // Verify XML structure
      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain('<role>');
      expect(systemPrompt).toContain('<task>Create a simple function</task>');
      expect(systemPrompt).toContain('<context>This is a test context</context>');
      expect(systemPrompt).toContain('<language>JavaScript</language>');
      expect(systemPrompt).toContain('<available_tools>');
      expect(systemPrompt).toContain('read_file');
      expect(systemPrompt).toContain('write_file');
      expect(systemPrompt).toContain('<instructions>');
      expect(systemPrompt).toContain('<file_operation>');

      // Check that the result contains the processed file operations
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Here is my solution');
      expect(result.content[0].text).toContain('<file_operation_');
    }
  });
  
  test('should handle errors during tool execution', async () => {
    registerRoleBasedTools(mockServer as any, mockLogger, mockLlmProvider);
    
    // Get the tool handler for 'analyst'
    const analystToolHandler = mockServer.registerTool.mock.calls.find(
      call => call[0] === 'analyst'
    )?.[3];
    
    expect(analystToolHandler).toBeDefined();
    
    if (analystToolHandler) {
      // Mock an error when generating
      (mockLlmProvider.chat as jest.Mock<any>).mockRejectedValueOnce(new Error('LLM error'));
      
      // Call the tool handler with mock arguments
      const args = {
        prompt: 'Analyze this data',
        base_path: '/test/path'
      };
      
      await expect((analystToolHandler as (args: any) => Promise<any>)(args)).rejects.toThrow('LLM error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error executing analyst role-based tool:'),
        expect.any(Error)
      );
    }
  });
  
  test('should handle custom role with special parameters', async () => {
    registerRoleBasedTools(mockServer as any, mockLogger, mockLlmProvider);
    
    // Get the tool handler for 'custom'
    const customToolHandler = mockServer.registerTool.mock.calls.find(
      call => call[0] === 'custom'
    )?.[3];
    
    expect(customToolHandler).toBeDefined();
    
    if (customToolHandler) {
      // Call the tool handler with a custom role
      const args = {
        prompt: 'Design a database schema',
        base_path: '/test/path',
        role: 'Database Architect',
        parameters: {
          database_type: 'PostgreSQL',
          entities: ['users', 'products', 'orders']
        }
      };
      
      await (customToolHandler as (args: any) => Promise<any>)(args);
      
      // Verify the message format
      const messages = ((mockLlmProvider.chat as jest.Mock<any>).mock.calls[0][0] as any).messages;
      const systemPrompt = messages[0].content;
      
      // Should include custom role
      expect(systemPrompt).toContain('Database Architect');
      expect(systemPrompt).toContain('<task>Design a database schema</task>');
      
      // Should include custom parameters
      expect(systemPrompt).toContain('<parameters>');
      expect(systemPrompt).toContain('database_type');
      expect(systemPrompt).toContain('PostgreSQL');
    }
  });
});