/**
 * Simple functional tests for McpCommands
 * Tests the functionality rather than the Commander.js implementation
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { McpCommands } from '../../src/commands/mcpCommands.js';
import { ConfigManager } from '../../src/core/config/configManager.js';
import { Logger } from '../../src/core/types/logger.types.js';
import { PathDI } from '../../src/global.types.js';
import { ServeMcpOptions } from '../../src/commands/mcpCommands.js';

describe('McpCommands Functionality', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockPathDI = {
    resolve: (jest.fn() as any).mockImplementation((path) => path),
    join: (jest.fn() as any).mockImplementation((...args) => args.join('/'))
  } as unknown as PathDI;

  const mockConfigManager = {
    getConfig: (jest.fn() as any).mockReturnValue({
      defaultProvider: 'openai',
      mcp: {
        name: 'Test-MCP-Server',
        version: '1.2.3',
        description: 'Test MCP Server Description',
        tools: {
          namePrefix: 'test_'
        }
      }
    }),
    loadConfig: jest.fn()
  } as unknown as ConfigManager;

  const mockMcpServer = (jest.fn() as any).mockImplementation(() => ({
    connect: (jest.fn() as any).mockResolvedValue(undefined),
    disconnect: (jest.fn() as any).mockResolvedValue(undefined)
  }));

  const mockBaseMcpServer = jest.fn();

  const mockProcess = {
    cwd: (jest.fn() as any).mockReturnValue('/test/cwd'),
    on: jest.fn()
  } as unknown as NodeJS.Process;

  const mockTransport = jest.fn();

  const mockLLMProvider = {
    generateText: jest.fn(),
    configure: jest.fn(),
    providerType: 'openai'
  };

  const mockProviderFactory = {
    getProvider: (jest.fn() as any).mockReturnValue(mockLLMProvider)
  };

  const mockRoleBasedToolsRegistrar = {
    register: jest.fn()
  };

  let mcpCommands: McpCommands;
  let mockServerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServerInstance = {
      connect: (jest.fn() as any).mockResolvedValue(undefined),
      disconnect: (jest.fn() as any).mockResolvedValue(undefined)
    };
    mockRoleBasedToolsRegistrar.register.mockReturnValue(mockServerInstance);
    mcpCommands = new McpCommands(
      mockConfigManager,
      mockLogger,
      mockPathDI,
      mockMcpServer,
      mockBaseMcpServer,
      mockProcess,
      mockTransport,
      mockProviderFactory,
      mockRoleBasedToolsRegistrar
    );
  });

  describe('handleServeMcp method', () => {
    it('should start the MCP server with default options', async () => {
      // Setup
      const options: ServeMcpOptions = {};
      
      // Access the private method using any type
      const handleServeMcp = (mcpCommands as any).handleServeMcp.bind(mcpCommands);

      // Execute
      await handleServeMcp(options);

      // Verify
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
      expect(mockPathDI.resolve).toHaveBeenCalledWith('/test/cwd');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting MCP server (Test-MCP-Server v1.2.3)');
      expect(mockLogger.info).toHaveBeenCalledWith('Base directory: /test/cwd');
      
      // Verify MCP server creation
      expect(mockMcpServer).toHaveBeenCalledWith(
        {
          name: 'Test-MCP-Server',
          version: '1.2.3',
          description: 'Test MCP Server Description',
          debug: true,
          logger: mockLogger,
          namePrefix: 'test_',
        },
        mockLogger,
        mockBaseMcpServer
      );
      
      // Verify provider factory and role-based tools registrar
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('openai');
      expect(mockRoleBasedToolsRegistrar.register).toHaveBeenCalled();
      
      // Verify server connection logs and connection
      expect(mockLogger.info).toHaveBeenCalledWith('Starting HTTP MCP server');
      expect(mockServerInstance.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server running');
      
      // Verify SIGINT handler
      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should start the MCP server with custom options', async () => {
      // Setup
      const options: ServeMcpOptions = {
        baseDir: '/custom/dir',
        name: 'Custom-MCP',
        version: '2.0.0',
        description: 'Custom MCP Description',
        toolPrefix: 'custom_',
        provider: 'anthropic'
      };
      
      // Access the private method using any type
      const handleServeMcp = (mcpCommands as any).handleServeMcp.bind(mcpCommands);

      // Execute
      await handleServeMcp(options);

      // Verify
      expect(mockLogger.info).toHaveBeenCalledWith('Starting MCP server (Custom-MCP v2.0.0)');
      expect(mockLogger.info).toHaveBeenCalledWith('Base directory: /custom/dir');
      
      // Verify MCP server creation with custom options
      expect(mockMcpServer).toHaveBeenCalledWith(
        {
          name: 'Custom-MCP',
          version: '2.0.0',
          description: 'Custom MCP Description',
          debug: true,
          logger: mockLogger,
          namePrefix: 'custom_',
        },
        mockLogger,
        mockBaseMcpServer
      );
      
      // Verify provider factory uses the custom provider
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('anthropic');
    });

    it('should throw error for unsupported provider', async () => {
      // Setup
      const options: ServeMcpOptions = {
        provider: 'unsupported-provider'
      };
      
      // Access the private method using any type
      const handleServeMcp = (mcpCommands as any).handleServeMcp.bind(mcpCommands);

      // Execute & Verify
      await expect(handleServeMcp(options)).rejects.toThrow(
        'Provider "unsupported-provider" not supported. Please configure it first.'
      );
    });

    it('should handle server connection errors', async () => {
      // Setup
      const options: ServeMcpOptions = {};
      const failingServerInstance = {
        connect: (jest.fn() as any).mockRejectedValue(new Error('Connection failure')),
        disconnect: jest.fn()
      };
      mockRoleBasedToolsRegistrar.register.mockReturnValueOnce(failingServerInstance);
      
      // Access the private method using any type
      const handleServeMcp = (mcpCommands as any).handleServeMcp.bind(mcpCommands);

      // Execute & Verify
      await expect(handleServeMcp(options)).rejects.toThrow('Connection failure');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to start MCP server:',
        expect.any(Error)
      );
    });
  });

  describe('Default config methods', () => {
    it('should get default server name from config', () => {
      // Execute
      const result = (mcpCommands as any).getDefaultServerName();
      
      // Verify
      expect(result).toBe('Test-MCP-Server');
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });

    it('should fall back to default server name when not in config', () => {
      // Setup
      mockConfigManager.getConfig.mockReturnValueOnce({});
      
      // Execute
      const result = (mcpCommands as any).getDefaultServerName();
      
      // Verify
      expect(result).toBe('AgenticMCP-MCP');
    });

    it('should get default server version from config', () => {
      // Execute
      const result = (mcpCommands as any).getDefaultServerVersion();
      
      // Verify
      expect(result).toBe('1.2.3');
    });

    it('should fall back to default server version when not in config', () => {
      // Setup
      mockConfigManager.getConfig.mockReturnValueOnce({});
      
      // Execute
      const result = (mcpCommands as any).getDefaultServerVersion();
      
      // Verify
      expect(result).toBe('1.0.0');
    });

    it('should get default server description from config', () => {
      // Execute
      const result = (mcpCommands as any).getDefaultServerDescription();
      
      // Verify
      expect(result).toBe('Test MCP Server Description');
    });

    it('should fall back to default server description when not in config', () => {
      // Setup
      mockConfigManager.getConfig.mockReturnValueOnce({});
      
      // Execute
      const result = (mcpCommands as any).getDefaultServerDescription();
      
      // Verify
      expect(result).toBe('AgenticMCP MCP Server - Providing filesystem operations for LLMs');
    });

    it('should get default tool prefix from config', () => {
      // Execute
      const result = (mcpCommands as any).getDefaultToolPrefix();
      
      // Verify
      expect(result).toBe('test_');
    });

    it('should fall back to empty string for tool prefix when not in config', () => {
      // Setup
      mockConfigManager.getConfig.mockReturnValueOnce({});
      
      // Execute
      const result = (mcpCommands as any).getDefaultToolPrefix();
      
      // Verify
      expect(result).toBe('');
    });

    it('should get default provider name from config', () => {
      // Execute
      const result = (mcpCommands as any).getDefaultProviderName();
      
      // Verify
      expect(result).toBe('openai');
    });

    it('should fall back to openai for provider name when not in config', () => {
      // Setup
      mockConfigManager.getConfig.mockReturnValueOnce({});
      
      // Execute
      const result = (mcpCommands as any).getDefaultProviderName();
      
      // Verify
      expect(result).toBe('openai');
    });
  });

  describe('registerCommands method', () => {
    it('should register the serve:mcp command', () => {
      // Setup
      const mockProgram = {
        command: (jest.fn() as any).mockReturnThis(),
        description: (jest.fn() as any).mockReturnThis(),
        option: (jest.fn() as any).mockReturnThis(),
        action: (jest.fn() as any).mockReturnThis()
      };

      // Execute
      mcpCommands.registerCommands(mockProgram as any);

      // Verify
      expect(mockProgram.command).toHaveBeenCalledWith('serve:mcp');
      expect(mockProgram.description).toHaveBeenCalledWith('Serve an MCP server for external AI applications');
      expect(mockProgram.option).toHaveBeenCalledTimes(6);
      expect(mockProgram.action).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
