/**
 * Simple functional tests for ToolCommands
 * Tests the functionality rather than the Commander.js implementation
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ToolCommands } from '../../src/commands/toolCommands.js';
import { ToolRegistry } from '../../src/tools/toolRegistry.js';
import { ToolExecutor } from '../../src/tools/toolExecutor.js';
import { CommandContext } from '../../src/core/types/command.types.js';
import { Logger } from '../../src/core/types/logger.types.js';
import { Tool } from '../../src/core/types/provider.types.js';

// Mock the logger helper function
jest.mock('../../src/core/utils/logger.js', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('ToolCommands Functionality', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockTool1: Tool = {
    name: 'test_tool1',
    description: 'A test tool',
    type: 'function',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string' }
      },
      required: ['param1']
    }
  };

  const mockTool2: Tool = {
    name: 'test_tool2',
    description: 'Another test tool',
    type: 'function',
    parameters: {
      type: 'object',
      properties: {
        param2: { type: 'number' }
      },
      required: ['param2']
    }
  };

  // Mock tool registry
  const mockGetAllTools = jest.fn().mockReturnValue([mockTool1, mockTool2]);
  const mockToolRegistry = {
    getAllTools: mockGetAllTools
  } as unknown as InstanceType<typeof ToolRegistry>;

  // Mock tool executor
  const mockExecuteTool = jest.fn();
  const mockToolExecutor = {
    executeTool: mockExecuteTool
  } as unknown as InstanceType<typeof ToolExecutor>;

  let toolCommands: ToolCommands;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock functions
    mockGetAllTools.mockReturnValue([mockTool1, mockTool2]);
    
    // Create a fresh instance of ToolCommands
    toolCommands = new ToolCommands(
      mockToolRegistry,
      mockToolExecutor
    );
  });

  describe('execute method', () => {
    it('should list all registered tools', async () => {
      // Setup
      const context: CommandContext = {};
      
      // Execute
      const result = await toolCommands.execute(context);

      // Verify
      expect(mockGetAllTools).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Found 2 registered tools');
      expect(result.data?.tools).toEqual([
        { name: 'test_tool1', description: 'A test tool' },
        { name: 'test_tool2', description: 'Another test tool' }
      ]);
    });

    it('should handle case when tool registry is not initialized', async () => {
      // Setup
      const context: CommandContext = {};
      
      // Create a command instance with null tool registry
      const commandWithNullRegistry = new ToolCommands(
        null as any,
        mockToolExecutor
      );

      // Execute
      const result = await commandWithNullRegistry.execute(context);

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Tool registry is not initialized');
    });
  });

  describe('listTools method', () => {
    it('should list all registered tools with parameters', async () => {
      // Execute
      const result = await toolCommands.listTools();

      // Verify
      expect(mockGetAllTools).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Found 2 registered tools');
      expect(result.data?.tools).toEqual([
        { 
          name: 'test_tool1', 
          description: 'A test tool',
          parameters: mockTool1.parameters 
        },
        { 
          name: 'test_tool2', 
          description: 'Another test tool',
          parameters: mockTool2.parameters 
        }
      ]);
    });

    it('should handle case when tool registry is not initialized', async () => {
      // Create a command instance with null tool registry
      const commandWithNullRegistry = new ToolCommands(
        null as any,
        mockToolExecutor
      );

      // Execute
      const result = await commandWithNullRegistry.listTools();

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Tool registry is not initialized');
    });

    it('should handle empty tools array', async () => {
      // Setup
      mockGetAllTools.mockReturnValueOnce([]);

      // Execute
      const result = await toolCommands.listTools();

      // Verify
      expect(result.success).toBe(true);
      expect(result.message).toBe('Found 0 registered tools');
      expect(result.data?.tools).toEqual([]);
    });
  });

  describe('executeTool method', () => {
    it('should execute a tool with given arguments', async () => {
      // Setup
      const toolName = 'test_tool1';
      const args = { param1: 'test_value' };
      const expectedResult = { success: true, data: 'Tool executed successfully' };
      
      mockExecuteTool.mockResolvedValueOnce(expectedResult);

      // Execute
      const result = await toolCommands.executeTool(toolName, args);

      // Verify
      expect(mockExecuteTool).toHaveBeenCalledWith(toolName, args);
      expect(result.success).toBe(true);
      expect(result.message).toBe(`Tool '${toolName}' executed successfully`);
      expect(result.data?.result).toEqual(expectedResult);
    });

    it('should handle case when tool executor is not initialized', async () => {
      // Setup
      const toolName = 'test_tool1';
      const args = { param1: 'test_value' };
      
      // Create a command instance with null tool executor
      const commandWithNullExecutor = new ToolCommands(
        mockToolRegistry,
        null as any
      );

      // Execute
      const result = await commandWithNullExecutor.executeTool(toolName, args);

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Tool executor is not initialized');
    });

    it('should handle errors during tool execution', async () => {
      // Setup
      const toolName = 'test_tool1';
      const args = { param1: 'test_value' };
      const error = new Error('Tool execution failed');
      
      mockExecuteTool.mockRejectedValueOnce(error);

      // Execute
      const result = await toolCommands.executeTool(toolName, args);

      // Verify
      expect(mockExecuteTool).toHaveBeenCalledWith(toolName, args);
      expect(result.success).toBe(false);
      expect(result.message).toBe(`Failed to execute tool '${toolName}': Tool execution failed`);
    });
  });

  describe('getHelp method', () => {
    it('should return help text', () => {
      // Execute
      const helpText = toolCommands.getHelp();

      // Verify
      expect(helpText).toContain('Tool Commands');
      expect(helpText).toContain('Usage:');
      expect(helpText).toContain('Description:');
      expect(helpText).toContain('Options:');
      expect(helpText).toContain('Examples:');
    });
  });
});