import { mock, mockDeep, MockProxy, DeepMockProxy } from 'jest-mock-extended';
import { Command } from 'commander';
import path from 'node:path';

// ---- Mocks of all external modules before we import McpCommands ----
const mockMcpServer = mockDeep<import('../../src/mcp/mcpServer').McpServer>();
const mockTransport = mockDeep<import('@modelcontextprotocol/sdk/server/stdio.js').StdioServerTransport>();
const mockLlmProvider = {} as any;
const mockRegisterTools = jest.fn();

// Mock McpServer constructor to always return our deep‐mock
jest.mock('../../src/mcp/mcpServer.js', () => ({
  McpServer: jest.fn().mockImplementation(() => mockMcpServer),
}));

// Spy out registerRoleBasedTools
jest.mock('../../src/mcp/tools/index.js', () => ({
  registerRoleBasedTools: mockRegisterTools,
}));

// Mock ProviderFactory so getProvider() returns our dummy provider
jest.mock('../../src/providers/providerFactory.js', () => ({
  ProviderFactory: jest.fn().mockImplementation(() => ({
    getProvider: () => mockLlmProvider,
  })),
}));

// Mock the stdio transport class to return our deep‐mock transport
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => mockTransport),
}));

// ---- Now import under-test after mocks are in place ----
import { McpCommands } from '../../src/commands/mcpCommands';
import { ConfigManager } from '../../src/core/config/configManager';
import type { Logger } from '../../src/core/types/logger.types';
import type { McpServerConfig } from '../../src/core/types/config.types';

describe('McpCommands', () => {
  let cmd: McpCommands;
  let mockConfigManager: MockProxy<ConfigManager>;
  let mockLogger: MockProxy<Logger>;
  let cli: MockProxy<Command>;
  let actionCallback!: (opts: any) => Promise<void>;

  const defaultMcpConfig: McpServerConfig = {
    enabled: true,
    name: 'Test MCP Server',
    version: '1.0.0',
    description: 'Test MCP server for unit tests',
    tools: { namePrefix: 'test_' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create shallow mocks
    mockConfigManager = mock<ConfigManager>();
    mockLogger = mock<Logger>();

    // Stub configManager behavior
    mockConfigManager.getConfig.mockReturnValue({ mcp: defaultMcpConfig, defaultProvider: 'openai' } as any);
    mockConfigManager.getProviderConfigByAlias.mockResolvedValue({ providerType: 'openai' });

    // Fake a Commander instance
    cli = mock<Command>();
    cli.command.mockReturnThis();
    cli.description.mockReturnThis();
    cli.option.mockReturnThis();
    cli.action.mockImplementation(cb => {
      actionCallback = cb;
      return cli;
    });

    // Instantiate and register
    cmd = new McpCommands(mockConfigManager, mockLogger);
    cmd.registerCommands(cli);
  });

  it('registers the serve-mcp command with all options', () => {
    expect(cli.command).toHaveBeenCalledWith('serve-mcp');
    expect(cli.description).toHaveBeenCalledWith(
      expect.stringContaining('Start an MCP server with role-based tools')
    );
    // we have 6 .option() calls in your code
    expect(cli.option).toHaveBeenCalledTimes(6);
    expect(cli.action).toHaveBeenCalledWith(expect.any(Function));
  });

  it('runs serveMcp() with defaults', async () => {
    await actionCallback({});

    // Base-dir log
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Base directory for file operations:')
    );

    // Provider log
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Using LLM provider: openai for role-based tools`
    );

    // registerRoleBasedTools
    expect(mockRegisterTools).toHaveBeenCalledWith(
      mockMcpServer,
      mockLogger,
      mockLlmProvider
    );

    // transport + connect
    expect(mockMcpServer.connect).toHaveBeenCalledWith(mockTransport);
    expect(mockLogger.info).toHaveBeenCalledWith('Starting HTTP MCP server');
    expect(mockLogger.info).toHaveBeenCalledWith('MCP server running');
  });

  it('honors custom options (baseDir, name, version, description, provider)', async () => {
    const custom = {
      baseDir: '/tmp/foo',
      name: 'CustomName',
      version: '2.0.0',
      description: 'A custom desc',
      toolPrefix: 'pref_',
      provider: 'myProv',
    };
    await actionCallback(custom);

    // Base-dir was resolved
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Base directory for file operations: ${path.resolve(custom.baseDir)}`
    );
    // Custom provider
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Using LLM provider: myProv for role-based tools`
    );
  });

  it('throws if provider is not found in config', async () => {
    mockConfigManager.getProviderConfigByAlias.mockResolvedValue(undefined);

    await expect(actionCallback({})).rejects.toThrow(
      'Provider "openai" not found in configuration. Please configure it first.'
    );
  });

  it('registers SIGINT for graceful shutdown', async () => {
    const onSpy = jest.spyOn(process, 'on');
    await actionCallback({});

    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    const handler = onSpy.mock.calls.find(c => c[0] === 'SIGINT')![1] as () => Promise<void>;

    // prepare mocks
    mockMcpServer.disconnect.mockResolvedValue();
    mockLogger.info.mockClear();

    // invoking the handler should disconnect and then throw our "exit" error
    await expect(handler()).rejects.toThrow('Process exited with code: 0');
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Received SIGINT, shutting down MCP server...'
    );
    expect(mockMcpServer.disconnect).toHaveBeenCalled();
  });
});
