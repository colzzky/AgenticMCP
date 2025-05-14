/**
 * Unit tests for ToolExecutor
 * Tests the execution of LLM tool calls
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ToolExecutor, ToolExecutorConfig } from '../../src/tools/toolExecutor.js';
import { ToolRegistry } from '../../src/tools/toolRegistry.js';
import type { ToolCall } from '../../src/core/types/provider.types.js';
import type { Logger } from '../../src/core/types/logger.types.js';

describe('ToolExecutor', () => {
  // Mock logger
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  // Mock ToolRegistry
  const mockToolRegistry = {
    getTool: jest.fn(),
    getAllTools: jest.fn(),
    getTools: jest.fn(),
    registerTool: jest.fn(),
    registerTools: jest.fn(),
    validateToolsForProvider: jest.fn(),
    registerLocalCliTools: jest.fn()
  } as unknown as ToolRegistry;

  // Sample tool implementation functions
  const mockToolImplementations = {
    get_weather: jest.fn().mockImplementation((args: { location: string }) => {
      return { temperature: 72, conditions: 'sunny', location: args.location };
    }),
    
    get_time: jest.fn().mockImplementation((args: { timezone?: string }) => {
      return { time: '12:00 PM', timezone: args.timezone || 'UTC' };
    }),
    
    echo: jest.fn().mockImplementation((args: { text: string }) => {
      return args.text;
    }),
    
    throw_error: jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    })
  };

  // Sample tool calls
  const weatherToolCall: ToolCall = {
    id: 'call_1',
    type: 'function_call',
    name: 'get_weather',
    arguments: JSON.stringify({ location: 'San Francisco' })
  };

  const timeToolCall: ToolCall = {
    id: 'call_2',
    type: 'function_call',
    name: 'get_time',
    arguments: JSON.stringify({ timezone: 'America/Los_Angeles' })
  };

  const echoToolCall: ToolCall = {
    id: 'call_3',
    type: 'function_call',
    name: 'echo',
    arguments: JSON.stringify({ text: 'Hello, world!' })
  };

  const errorToolCall: ToolCall = {
    id: 'call_4',
    type: 'function_call',
    name: 'throw_error',
    arguments: '{}'
  };

  const unknownToolCall: ToolCall = {
    id: 'call_5',
    type: 'function_call',
    name: 'unknown_tool',
    arguments: '{}'
  };

  let toolExecutor: ToolExecutor;
  const defaultConfig: ToolExecutorConfig = {
    toolTimeoutMs: 1000,
    maxRetries: 1,
    parallelExecution: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toolExecutor = new ToolExecutor(
      mockToolRegistry,
      mockToolImplementations,
      mockLogger,
      defaultConfig
    );
    // Spy on private method executeWithTimeout to control timing
    jest.spyOn(toolExecutor as any, 'executeWithTimeout').mockImplementation(
      (fn: () => Promise<any>) => fn()
    );
  });

  describe('constructor', () => {
    it('should initialize with the provided config', () => {
      // Assert the executor is initialized with the right config
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ToolExecutor initialized with config:',
        expect.any(String)
      );
    });

    it('should use default config when none is provided', () => {
      // Act
      const executor = new ToolExecutor(
        mockToolRegistry,
        mockToolImplementations,
        mockLogger
      );
      
      // Assert default config is used
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('executeToolCall', () => {
    it('should execute a tool call successfully', async () => {
      // Act
      const result = await toolExecutor.executeToolCall(weatherToolCall);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toContain('San Francisco');
      expect(mockToolImplementations.get_weather).toHaveBeenCalledWith({ location: 'San Francisco' });
    });

    it('should handle unknown tools', async () => {
      // Act
      const result = await toolExecutor.executeToolCall(unknownToolCall);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('tool_not_found');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Tool not found'));
    });

    it('should handle tool execution errors', async () => {
      // Act
      const result = await toolExecutor.executeToolCall(errorToolCall);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('tool_execution_error');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error executing tool call'));
    });

    it('should convert non-string output to JSON string', async () => {
      // Act
      const result = await toolExecutor.executeToolCall(timeToolCall);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toContain('America/Los_Angeles');
      expect(typeof result.output).toBe('string');
    });
  });

  describe('executeToolCalls', () => {
    it('should execute multiple tool calls in parallel when parallelExecution is true', async () => {
      // Act
      const results = await toolExecutor.executeToolCalls([weatherToolCall, timeToolCall, echoToolCall]);
      
      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].call_id).toBe('call_1');
      expect(results[1].call_id).toBe('call_2');
      expect(results[2].call_id).toBe('call_3');
      
      // Verify all function implementations were called
      expect(mockToolImplementations.get_weather).toHaveBeenCalled();
      expect(mockToolImplementations.get_time).toHaveBeenCalled();
      expect(mockToolImplementations.echo).toHaveBeenCalled();
    });

    it('should execute tool calls sequentially when parallelExecution is false', async () => {
      // Arrange
      const sequentialExecutor = new ToolExecutor(
        mockToolRegistry,
        mockToolImplementations,
        mockLogger,
        { ...defaultConfig, parallelExecution: false }
      );
      
      // Spy on private method 
      const executeSequentiallyMock = jest.spyOn(sequentialExecutor as any, 'executeSequentially');
      jest.spyOn(sequentialExecutor as any, 'executeWithTimeout').mockImplementation(
        (fn: () => Promise<any>) => fn()
      );
      
      // Act
      await sequentialExecutor.executeToolCalls([weatherToolCall, timeToolCall]);
      
      // Assert
      expect(executeSequentiallyMock).toHaveBeenCalled();
    });

    it('should return empty array for empty input', async () => {
      // Act
      const results = await toolExecutor.executeToolCalls([]);
      
      // Assert
      expect(results).toEqual([]);
    });

    it('should format error results as JSON strings', async () => {
      // Act
      const results = await toolExecutor.executeToolCalls([errorToolCall]);
      
      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].output).toContain('error');
      expect(() => JSON.parse(results[0].output)).not.toThrow();
    });
  });

  describe('executeTool', () => {
    it('should execute a tool by name with arguments', async () => {
      // Act
      const result = await toolExecutor.executeTool('get_weather', { location: 'New York' });
      
      // Assert
      expect(result).toEqual({
        temperature: 72,
        conditions: 'sunny',
        location: 'New York'
      });
      expect(mockToolImplementations.get_weather).toHaveBeenCalledWith({ location: 'New York' });
    });

    it('should throw for unknown tools', async () => {
      // Act & Assert
      await expect(toolExecutor.executeTool('unknown_tool', {}))
        .rejects.toThrow('Tool not found');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Tool not found'));
    });

    it('should propagate errors from tool execution', async () => {
      // Act & Assert
      await expect(toolExecutor.executeTool('throw_error', {}))
        .rejects.toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error executing tool'));
    });
  });

  describe('registerToolImplementation', () => {
    it('should register a new tool implementation', () => {
      // Arrange
      const newToolFn = jest.fn();
      
      // Act
      const result = toolExecutor.registerToolImplementation('new_tool', newToolFn);
      
      // Assert
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Registered tool implementation'));
      expect(toolExecutor.getToolImplementations().new_tool).toBe(newToolFn);
    });

    it('should not register a duplicate tool implementation', () => {
      // Act
      const result = toolExecutor.registerToolImplementation('get_weather', jest.fn());
      
      // Assert
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });
  });

  describe('getToolImplementations', () => {
    it('should return a copy of all registered tool implementations', () => {
      // Act
      const implementations = toolExecutor.getToolImplementations();
      
      // Assert
      expect(implementations).toEqual(mockToolImplementations);
      
      // Verify it's a copy by modifying it and checking the original is unchanged
      const originalCount = Object.keys(toolExecutor.getToolImplementations()).length;
      implementations.new_tool = jest.fn() as any;
      expect(Object.keys(toolExecutor.getToolImplementations()).length).toBe(originalCount);
    });
  });
});