/**
 * @file Tests for the Tool Commands
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ToolCommands } from '../../src/commands/toolCommands';
import { ToolRegistry } from '../../src/tools/toolRegistry';
import { ToolExecutor } from '../../src/tools/toolExecutor';

// Using global objects defined in global.d.ts

// Mock modules
jest.mock('../../src/tools/toolRegistry');
jest.mock('../../src/tools/toolExecutor');

describe('ToolCommands', () => {
  let toolCommands: ToolCommands;
  let mockRegistry: jest.Mocked<ToolRegistry>;
  let mockExecutor: jest.Mocked<ToolExecutor>;

  beforeEach(() => {
    // Setup mock registry and executor
    mockRegistry = new ToolRegistry(jest.fn() as any) as jest.Mocked<ToolRegistry>;
    mockExecutor = new ToolExecutor(
      mockRegistry,
      {},
      jest.fn() as any
    ) as jest.Mocked<ToolExecutor>;

    // Mock getAllTools method
    mockRegistry.getAllTools.mockReturnValue([
      {
        name: 'test_tool',
        description: 'A test tool',
        type: 'function',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'another_tool',
        description: 'Another test tool',
        type: 'function',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]);

    // Mock executeTool method
    mockExecutor.executeTool.mockResolvedValue({ result: 'success' });

    // Set global objects
    globalThis.toolRegistry = mockRegistry;
    globalThis.toolExecutor = mockExecutor;

    // Create instance of ToolCommands
    toolCommands = new ToolCommands();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up globals
    delete globalThis.toolRegistry;
    delete globalThis.toolExecutor;
  });

  describe('execute', () => {
    it('should return a list of available tools', async () => {
      const result = await toolCommands.execute({ options: {} });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 2 registered tools');
      expect(result.data).toBeDefined();

      // Type assertion to help TypeScript understand the structure
      const data = result.data as { tools: Array<{ name: string, description: string }> };
      expect(data.tools).toHaveLength(2);
      expect(mockRegistry.getAllTools).toHaveBeenCalled();
    });

    it('should handle missing tool registry', async () => {
      delete globalThis.toolRegistry;
      
      const result = await toolCommands.execute({ options: {} });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Tool registry is not initialized');
    });
  });

  describe('listTools', () => {
    it('should return a list of available tools with details', async () => {
      const result = await toolCommands.listTools();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 2 registered tools');
      expect(result.data).toBeDefined();

      // Type assertion to help TypeScript understand the structure
      const data = result.data as {
        tools: Array<{
          name: string,
          description: string,
          parameters: object
        }>
      };

      expect(data.tools).toHaveLength(2);
      expect(data.tools[0]).toHaveProperty('parameters');
      expect(mockRegistry.getAllTools).toHaveBeenCalled();
    });

    it('should handle missing tool registry', async () => {
      delete globalThis.toolRegistry;
      
      const result = await toolCommands.listTools();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Tool registry is not initialized');
    });
  });

  describe('executeTool', () => {
    it('should execute the specified tool with provided arguments', async () => {
      const toolName = 'test_tool';
      const args = { param1: 'value1' };

      const result = await toolCommands.executeTool(toolName, args);

      expect(result.success).toBe(true);
      expect(result.message).toContain(`Tool '${toolName}' executed successfully`);
      expect(result.data).toBeDefined();

      // Type assertion to help TypeScript understand the structure
      const data = result.data as { result: string };
      expect(data).toHaveProperty('result');
      expect(mockExecutor.executeTool).toHaveBeenCalledWith(toolName, args);
    });

    it('should handle missing tool executor', async () => {
      delete globalThis.toolExecutor;
      
      const result = await toolCommands.executeTool('test_tool', {});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Tool executor is not initialized');
    });

    it('should handle tool execution errors', async () => {
      const errorMessage = 'Execution failed';
      mockExecutor.executeTool.mockRejectedValue(new Error(errorMessage));
      
      const result = await toolCommands.executeTool('test_tool', {});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain(errorMessage);
    });
  });
});