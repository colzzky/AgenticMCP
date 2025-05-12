import { jest } from '@jest/globals';
import { Command } from 'commander';

// Patch process.exit type for test
const originalProcessExit = process.exit;
beforeAll(() => {
  process.exit = ((code?: number | string | null | undefined) => { throw new Error(`process.exit: ${code}`); }) as any;
});
afterAll(() => {
  process.exit = originalProcessExit;
});
import { McpCommands } from '../../src/commands/mcpCommands';
import { type ConfigManager } from '../../src/core/config/configManager';
import { type Logger } from '../../src/core/types/logger.types';
import { type McpServerConfig } from '../../src/core/types/config.types';

// Create mock classes
const mockMcpServer = {
  connect: jest.fn(async () => {}),
  disconnect: jest.fn(async () => {})
};

const mockLocalCliTool = {
  getToolDefinitions: jest.fn(() => ({})),
  getCommandMap: jest.fn(() => ({}))
};

const mockStdioTransport = {
  getTransport: jest.fn().mockReturnValue({})
};

const mockHttpTransport = {
  getTransport: jest.fn().mockReturnValue({})
};

// Mock the actual implementation modules
jest.mock('../../src/mcp/mcpServer', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => mockMcpServer)
  };
});

jest.mock('../../src/tools/localCliTool', () => {
  return {
    LocalCliTool: jest.fn().mockImplementation(() => mockLocalCliTool)
  };
});

jest.mock('../../src/mcp/transports/stdioTransport', () => {
  return {
    StdioTransport: jest.fn().mockImplementation(() => mockStdioTransport)
  };
});

jest.mock('../../src/mcp/transports/httpTransport', () => {
  return {
    HttpTransport: jest.fn().mockImplementation(() => mockHttpTransport)
  };
});

jest.mock('../../src/mcp/adapters/localCliToolAdapter', () => {
  return {
    LocalCliToolAdapter: jest.fn().mockImplementation(() => ({
      registerTools: jest.fn()
    }))
  };
});

// Create mock config manager
const defaultMcpConfig: McpServerConfig = {
  enabled: true,
  transport: 'stdio',
  name: 'Test MCP Server',
  version: '1.0.0',
  description: 'Test MCP server for unit tests',
  http: {
    port: 3000,
    host: 'localhost',
    cors: true
  },
  tools: {
    namePrefix: 'test_'
  }
};

const mockConfigManager = {
  getConfig: jest.fn().mockReturnValue({
    mcp: defaultMcpConfig
  }),
  getMcpConfig: jest.fn().mockReturnValue(defaultMcpConfig)
} as unknown as ConfigManager;

// Create mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as Logger;

describe('McpCommands', () => {
  let mcpCommands: McpCommands;
  let cli: Command;
  let actionCallback: (options: any) => Promise<void>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance for each test
    mcpCommands = new McpCommands(mockConfigManager, mockLogger);
    
    // Setup a mock CLI
    cli = {
      command: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      // @ts-expect-error: Commander action signature is more permissive than our test mock
      action: jest.fn().mockImplementation((cb: (options: any) => Promise<void>) => {
        actionCallback = cb;
        return cli;
      })
    } as unknown as Command;
    
    // Register commands
    mcpCommands.registerCommands(cli as unknown as Command);
  });
  
  test('should register command with CLI', () => {
    expect(cli.command).toHaveBeenCalledWith('serve-mcp');
    expect(cli.description).toHaveBeenCalledWith(
      expect.stringContaining('Start an MCP server')
    );
    expect(cli.option).toHaveBeenCalledTimes(8);
    expect(cli.action).toHaveBeenCalledWith(expect.any(Function));
  });
  
  test('should start stdio transport when called with default options', async () => {
    // Get the registered action callback
    expect(actionCallback).toBeDefined();
    
    // Call the action with default options
    await actionCallback({});
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Starting MCP server with transport: stdio')
    );
    expect(mockStdioTransport.getTransport).toHaveBeenCalled();
    expect(mockMcpServer.connect).toHaveBeenCalled();
  });
  
  test('should start HTTP transport when specified', async () => {
    // Call the action with HTTP transport option
    await actionCallback({
      transport: 'http',
      port: 8080,
      host: '127.0.0.1'
    });
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Starting MCP server with transport: http')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Starting HTTP MCP server on 127.0.0.1:8080')
    );
    expect(mockHttpTransport.getTransport).toHaveBeenCalled();
    expect(mockMcpServer.connect).toHaveBeenCalled();
  });
  
  test('should handle server startup failure', async () => {
    // Mock a connection error
    mockMcpServer.connect.mockRejectedValueOnce(new Error('Connection failed'));
    
    // Mock process.exit
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => { throw new Error(`process.exit: ${code}`); });
    
    // Call the action
    await actionCallback({});
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to start MCP server:'),
      expect.any(Error)
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    
    // Restore mock
    exitSpy.mockRestore();
  });
  
  test('should register SIGINT handler for graceful shutdown', async () => {
    // Spy on process.on
    const onSpy = jest.spyOn(process, 'on');
    
    // Call the action
    await actionCallback({});
    
    // Check that SIGINT handler was registered
    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    
    // Get the registered handler
    const sigintHandler = onSpy.mock.calls.find(call => call[0] === 'SIGINT')?.[1] as Function;
    expect(sigintHandler).toBeDefined();
    
    // Mock process.exit for the handler
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => { throw new Error(`process.exit: ${code}`); });
    
    // Call the handler
    await sigintHandler();
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Received SIGINT, shutting down MCP server')
    );
    expect(mockMcpServer.disconnect).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    
    // Restore mocks
    onSpy.mockRestore();
    exitSpy.mockRestore();
  });
});