/**
 * Tests for ToolExecutor
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ToolExecutor } from '../../src/tools/toolExecutor.js';
import { ToolRegistry } from '../../src/tools/toolRegistry.js';

describe('ToolExecutor', () => {
  // Mock the logger
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  // Mock the tool registry
  const mockToolRegistry = {
    getAllTools: jest.fn().mockReturnValue([]),
    getTool: jest.fn(),
    registerTool: jest.fn(),
    registerTools: jest.fn(),
    getTools: jest.fn(),
    registerLocalCliTools: jest.fn(),
    validateToolsForProvider: jest.fn()
  };

  // Mock tool implementations
  const mockToolImplementations = {
    test_tool: jest.fn().mockResolvedValue('tool result'),
    failing_tool: jest.fn().mockRejectedValue(new Error('Tool failed')),
    get_weather: jest.fn().mockResolvedValue({ temperature: 72, condition: 'sunny' }),
    slow_tool: jest.fn().mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({ result: 'slow result' }), 100);
    }))
  };

  // Test instance
  let toolExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    toolExecutor = new ToolExecutor(
      mockToolRegistry,
      mockToolImplementations,
      mockLogger,
      { toolTimeoutMs: 1000 }
    );
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(toolExecutor).toBeInstanceOf(ToolExecutor);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('executeTool', () => {
    it('should directly execute a tool by name', async () => {
      const result = await toolExecutor.executeTool('test_tool', { param: 'value' });
      
      expect(result).toBe('tool result');
      expect(mockToolImplementations.test_tool).toHaveBeenCalledWith({ param: 'value' });
    });

    it('should throw an error for non-existent tools', async () => {
      await expect(
        toolExecutor.executeTool('non_existent_tool', {})
      ).rejects.toThrow('Tool not found');
    });

    it('should propagate errors from tool execution', async () => {
      await expect(
        toolExecutor.executeTool('failing_tool', {})
      ).rejects.toThrow('Tool failed');
    });
  });
});