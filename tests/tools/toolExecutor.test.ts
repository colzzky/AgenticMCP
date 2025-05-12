/**
 * @file Tests for the ToolExecutor class
 */

import { ToolExecutor, ToolExecutionResult } from '../../src/tools/toolExecutor';
import { ToolRegistry } from '../../src/tools/toolRegistry';
import { Tool, ToolCall } from '../../src/core/types/provider.types';

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock tool implementations
const mockToolImplementations = {
  'get-weather': jest.fn().mockResolvedValue({
    temperature: 72,
    condition: 'sunny',
    humidity: 45,
  }),
  'search-web': jest.fn().mockResolvedValue('Search results for query'),
  'error-tool': jest.fn().mockRejectedValue(new Error('Tool execution failed')),
};

// Mock tool registry
const mockToolRegistry = {
  getTools: jest.fn().mockReturnValue([
    {
      type: 'function',
      name: 'get-weather',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for',
          },
        },
        required: ['location'],
      },
    },
    {
      type: 'function',
      name: 'search-web',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
    {
      type: 'function',
      name: 'error-tool',
      description: 'A tool that always fails',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  ]),
} as unknown as ToolRegistry;

describe('ToolExecutor', () => {
  let toolExecutor: ToolExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    toolExecutor = new ToolExecutor(
      mockToolRegistry,
      mockToolImplementations,
      mockLogger as any
    );
  });

  describe('executeToolCall', () => {
    it('should execute a tool call successfully', async () => {
      const toolCall: ToolCall = {
        id: 'call-123',
        type: 'function_call',
        name: 'get-weather',
        arguments: JSON.stringify({ location: 'New York' }),
      };

      const result = await toolExecutor.executeToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.output).toBe(JSON.stringify({
        temperature: 72,
        condition: 'sunny',
        humidity: 45,
      }));
      expect(mockToolImplementations['get-weather']).toHaveBeenCalledWith({ location: 'New York' });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Executing tool call: get-weather'));
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('executed successfully'));
    });

    it('should handle tool execution errors', async () => {
      const toolCall: ToolCall = {
        id: 'call-456',
        type: 'function_call',
        name: 'error-tool',
        arguments: JSON.stringify({}),
      };

      const result = await toolExecutor.executeToolCall(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Tool execution failed');
      expect(mockToolImplementations['error-tool']).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error executing tool call'));
    });

    it('should handle unknown tools', async () => {
      const toolCall: ToolCall = {
        id: 'call-789',
        type: 'function_call',
        name: 'unknown-tool',
        arguments: JSON.stringify({}),
      };

      const result = await toolExecutor.executeToolCall(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Tool not found: unknown-tool');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Tool not found'));
    });
  });

  describe('executeToolCalls', () => {
    it('should execute multiple tool calls in parallel', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call-123',
          type: 'function_call',
          name: 'get-weather',
          arguments: JSON.stringify({ location: 'New York' }),
        },
        {
          id: 'call-456',
          type: 'function_call',
          name: 'search-web',
          arguments: JSON.stringify({ query: 'TypeScript' }),
        },
      ];

      const results = await toolExecutor.executeToolCalls(toolCalls);

      expect(results.length).toBe(2);
      expect(results[0].call_id).toBe('call-123');
      expect(results[1].call_id).toBe('call-456');
      expect(mockToolImplementations['get-weather']).toHaveBeenCalledWith({ location: 'New York' });
      expect(mockToolImplementations['search-web']).toHaveBeenCalledWith({ query: 'TypeScript' });
    });

    it('should handle empty tool calls array', async () => {
      const results = await toolExecutor.executeToolCalls([]);
      expect(results).toEqual([]);
    });

    it('should handle a mix of successful and failed tool calls', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call-123',
          type: 'function_call',
          name: 'get-weather',
          arguments: JSON.stringify({ location: 'New York' }),
        },
        {
          id: 'call-456',
          type: 'function_call',
          name: 'error-tool',
          arguments: JSON.stringify({}),
        },
      ];

      const results = await toolExecutor.executeToolCalls(toolCalls);

      expect(results.length).toBe(2);
      expect(results[0].call_id).toBe('call-123');
      expect(results[1].call_id).toBe('call-456');
      expect(results[0].output).not.toContain('error');
      expect(results[1].output).toContain('error');
    });
  });

  describe('registerToolImplementation', () => {
    it('should register a new tool implementation', () => {
      const newTool = jest.fn();
      const result = toolExecutor.registerToolImplementation('new-tool', newTool);
      
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Registered tool implementation: new-tool'));
      
      // Verify the tool was registered by checking the implementations
      const implementations = toolExecutor.getToolImplementations();
      expect(implementations['new-tool']).toBe(newTool);
    });

    it('should not register a tool with an existing name', () => {
      const newTool = jest.fn();
      const result = toolExecutor.registerToolImplementation('get-weather', newTool);
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });
  });
});
