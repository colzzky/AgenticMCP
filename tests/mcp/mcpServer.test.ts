/**
 * @file Unit tests for MCPServer
 * Tests the MCP server implementation with mocked dependencies
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { McpServer } from '../../src/mcp/mcpServer.js';
import type { Logger } from '../../src/core/types/logger.types.js';
import { z, type ZodRawShape } from 'zod';

describe('MCPServer', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  // Mock the BaseMcpServer
  const mockConnect = (jest.fn() as any).mockResolvedValue(undefined);
  const mockClose = (jest.fn() as any).mockResolvedValue(undefined);
  const mockTool = jest.fn();

  // Mock server instance
  const mockServerInstance = {
    connect: mockConnect,
    close: mockClose,
    tool: mockTool
  };
  
  // Mock server class constructor
  const MockBaseMcpServer = (jest.fn() as any).mockImplementation(() => mockServerInstance);

  // Mock transport
  const MockTransport = (jest.fn() as any).mockImplementation(() => ({}));

  let mcpServer: McpServer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mcpServer = new McpServer(
      {
        name: 'Test MCP Server',
        version: '1.0.0',
        description: 'A test MCP server'
      },
      mockLogger,
      MockBaseMcpServer as any
    );
  });

  describe('constructor', () => {
    it('should initialize the server with correct configuration', () => {
      // Verify server constructor was called with correct params
      expect(MockBaseMcpServer).toHaveBeenCalledWith({
        name: 'Test MCP Server',
        version: '1.0.0',
        description: 'A test MCP server'
      });
      
      // Verify the logger was used
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('MCP Server initialized')
      );
    });
  });

  describe('connect method', () => {
    it('should connect the server to the transport', async () => {
      await mcpServer.connect(MockTransport as any);
      
      // The transport is instantiated inside the connect method
      expect(mockConnect).toHaveBeenCalled();
      expect(MockTransport).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Connecting MCP Server to transport')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('successfully connected')
      );
    });
    
    it('should warn if already connected', async () => {
      // Connect once
      await mcpServer.connect(MockTransport as any);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Try to connect again
      await mcpServer.connect(MockTransport as any);
      
      expect(mockConnect).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('already connected')
      );
    });
    
    it('should handle connection errors', async () => {
      const error = new Error('Connection error');
      mockConnect.mockRejectedValueOnce(error);
      
      await expect(mcpServer.connect(MockTransport as any)).rejects.toThrow('Connection error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect'),
        error
      );
      // The transport is instantiated inside the connect method
      expect(mockConnect).toHaveBeenCalled();
      expect(MockTransport).toHaveBeenCalled();
    });
  });

  describe('disconnect method', () => {
    it('should disconnect the server from the transport', async () => {
      // First connect
      await mcpServer.connect(MockTransport as any);
      
      // Then disconnect
      await mcpServer.disconnect();
      
      expect(mockClose).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Disconnecting MCP Server')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('successfully marked as disconnected')
      );
    });
    
    it('should warn if not connected', async () => {
      await mcpServer.disconnect();
      
      expect(mockClose).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not connected')
      );
    });
    
    it('should handle disconnection errors', async () => {
      // First connect
      await mcpServer.connect(MockTransport as any);
      
      // Mock disconnect error
      const error = new Error('Disconnection error');
      mockClose.mockRejectedValueOnce(error);
      
      await expect(mcpServer.disconnect()).rejects.toThrow('Disconnection error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to disconnect'),
        error
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('registerTool method', () => {
    it('should register a tool with the server', () => {
      // Setup
      const toolName = 'test_tool';
      const description = 'A test tool';
      const schema: ZodRawShape = {
        param1: z.string(),
        param2: z.number()
      };
      const handler = (jest.fn() as any).mockResolvedValue('Tool result');
      
      // Register tool
      mcpServer.registerTool(toolName, description, schema, handler);
      
      // Verify
      expect(mockTool).toHaveBeenCalledWith(
        toolName,
        description,
        schema,
        expect.any(Function)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Registering external MCP tool: ${toolName}`)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`successfully registered`)
      );
    });
    
    it('should warn if tool is already registered', () => {
      // Setup
      const toolName = 'test_tool';
      const description = 'A test tool';
      const schema: ZodRawShape = {
        param1: z.string()
      };
      const handler = jest.fn();
      
      // Register first time
      mcpServer.registerTool(toolName, description, schema, handler);
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Register again
      mcpServer.registerTool(toolName, description, schema, handler);
      
      // Verify
      expect(mockTool).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`already registered`)
      );
    });
    
    it('should handle registration errors', () => {
      // Setup
      const toolName = 'test_tool';
      const description = 'A test tool';
      const schema: ZodRawShape = {
        param1: z.string()
      };
      const handler = jest.fn();
      const error = new Error('Registration error');
      
      // Mock error
      mockTool.mockImplementationOnce(() => {
        throw error;
      });
      
      // Verify
      expect(() => {
        mcpServer.registerTool(toolName, description, schema, handler);
      }).toThrow('Registration error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to register tool`),
        error
      );
    });
    
    it('should wrap handler and handle successful execution', async () => {
      // Setup
      const toolName = 'test_tool';
      const description = 'A test tool';
      const schema: ZodRawShape = {
        param1: z.string()
      };
      const handlerResult = 'Handler result';
      const handler = (jest.fn() as any).mockResolvedValue(handlerResult);
      const toolArgs = { param1: 'value1' };
      
      // Register tool
      mcpServer.registerTool(toolName, description, schema, handler);
      
      // Extract wrapper function (3rd argument of mockTool)
      const wrapperFn = mockTool.mock.calls[0][3];
      
      // Call the wrapper function
      const result = await wrapperFn(toolArgs);
      
      // Verify handler was called
      expect(handler).toHaveBeenCalledWith(toolArgs);
      
      // Verify result was wrapped correctly
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Handler result'
        }]
      });
      
      // Verify logging
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Executing tool ${toolName}`),
        toolArgs
      );
    });
    
    it('should handle structured response format', async () => {
      // Setup
      const toolName = 'test_tool';
      const description = 'A test tool';
      const schema: ZodRawShape = {
        param1: z.string()
      };
      const structuredResult = {
        content: [
          { type: 'text', text: 'Part 1' },
          { type: 'code', text: 'console.log("hello")', language: 'javascript' }
        ]
      };
      const handler = (jest.fn() as any).mockResolvedValue(structuredResult);
      
      // Register tool
      mcpServer.registerTool(toolName, description, schema, handler);
      
      // Extract wrapper function
      const wrapperFn = mockTool.mock.calls[0][3];
      
      // Call the wrapper function
      const result = await wrapperFn({ param1: 'value1' });
      
      // Verify result was passed through directly
      expect(result).toEqual(structuredResult);
    });
    
    it('should handle object results by stringifying', async () => {
      // Setup
      const toolName = 'test_tool';
      const description = 'A test tool';
      const schema: ZodRawShape = {
        param1: z.string()
      };
      const objectResult = { key1: 'value1', key2: 42 };
      const handler = (jest.fn() as any).mockResolvedValue(objectResult);
      
      // Register tool
      mcpServer.registerTool(toolName, description, schema, handler);
      
      // Extract wrapper function
      const wrapperFn = mockTool.mock.calls[0][3];
      
      // Call the wrapper function
      const result = await wrapperFn({ param1: 'value1' });
      
      // Verify result was JSON stringified
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(objectResult, undefined, 2)
        }]
      });
    });
    
    it('should handle handler errors', async () => {
      // Setup
      const toolName = 'test_tool';
      const description = 'A test tool';
      const schema: ZodRawShape = {
        param1: z.string()
      };
      const error = new Error('Handler error');
      const handler = (jest.fn() as any).mockRejectedValue(error);
      
      // Register tool
      mcpServer.registerTool(toolName, description, schema, handler);
      
      // Extract wrapper function
      const wrapperFn = mockTool.mock.calls[0][3];
      
      // Call the wrapper function
      const result = await wrapperFn({ param1: 'value1' });
      
      // Verify error handling
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: `Error executing ${toolName}: Handler error`
        }]
      });
      
      // Verify logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error executing tool ${toolName}`),
        error
      );
    });
  });
});