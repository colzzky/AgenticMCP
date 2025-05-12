import { jest } from '@jest/globals';
import { McpServer } from '../../src/mcp/mcpServer';
import { LocalCliTool } from '../../src/tools/localCliTool';
import { type Logger } from '../../src/core/types/logger.types';
import { z } from 'zod';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => {
      return {
        tool: jest.fn(),
        connect: jest.fn(() => Promise.resolve()),
        disconnect: jest.fn(() => Promise.resolve())
      };
    })
  };
});

// Create mock logger
const mockLogger = {
  debug: jest.fn(async (...args: any[]) => { }),
  info: jest.fn(async (...args: any[]) => { }),
  warn: jest.fn(async (...args: any[]) => { }),
  error: jest.fn(async (...args: any[]) => { })
} as unknown as Logger;

// Create mock LocalCliTool
const mockLocalCliTool = {
  getCommandMap: jest.fn().mockReturnValue({
    read_file: jest.fn(),
    write_file: jest.fn()
  }),
  getToolDefinitions: jest.fn().mockReturnValue([
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string'
            }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Write a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string'
            },
            content: {
              type: 'string'
            }
          }
        }
      }
    }
  ]),
  execute: jest.fn(async (...args: any[]) => { })
} as unknown as LocalCliTool;

// Mock transport
const mockTransport = {
  name: 'test-transport'
};

describe('McpServer', () => {
  let mcpServer: McpServer;

  beforeEach(() => {
    jest.clearAllMocks();

    mcpServer = new McpServer(
      {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test MCP server'
      },
      mockLogger,
    );
  });

  test('should initialize with the correct configuration', () => {
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('MCP Server initialized: test-server v1.0.0')
    );
  });

  test('should register LocalCliTool commands as tools', () => {
    expect(mockLocalCliTool.getToolDefinitions).toHaveBeenCalled();
    expect(mockLocalCliTool.getCommandMap).toHaveBeenCalled();
  });

  test('should connect to a transport', async () => {
    await mcpServer.connect(mockTransport as any);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Connecting MCP Server to transport')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('MCP Server successfully connected to transport')
    );
  });

  test('should disconnect from a transport', async () => {
    // First connect
    await mcpServer.connect(mockTransport as any);

    // Then disconnect
    await mcpServer.disconnect();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Disconnecting MCP Server from transport')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('MCP Server successfully disconnected from transport')
    );
  });

  test('should not reconnect if already connected', async () => {
    // Connect once
    await mcpServer.connect(mockTransport as any);

    // Clear mocks
    jest.clearAllMocks();

    // Try to connect again
    await mcpServer.connect(mockTransport as any);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('MCP Server is already connected to a transport')
    );
  });

  test('should not disconnect if not connected', async () => {
    // Try to disconnect without connecting first
    await mcpServer.disconnect();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('MCP Server is not connected to any transport')
    );
  });

  test('should register external tools with registerTool method', () => {
    const handler = jest.fn(async (...args: any[]) => { });

    mcpServer.registerTool(
      'test_tool',
      'Test tool',
      { type: z.string(), properties: z.object({}) },
      handler
    );

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Registering external MCP tool: test_tool')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Tool test_tool successfully registered')
    );
  });

  test('should not register a tool with the same name twice', () => {
    const handler = jest.fn(async (...args: any[]) => { });

    // Register once
    mcpServer.registerTool(
      'test_tool',
      'Test tool',
      { type: z.string(), properties: z.object({}) },
      handler
    );

    // Clear mocks
    jest.clearAllMocks();

    // Try to register again
    mcpServer.registerTool(
      'test_tool',
      'Test tool',
      { type: z.string(), properties: z.object({}) },
      handler
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Tool test_tool is already registered, skipping')
    );
  });
});