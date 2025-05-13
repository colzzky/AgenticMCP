import { Command } from 'commander';
import type { PathDI } from '../global.types';
import { CommandHandler } from '../core/commands/decorators.js';
import type { Logger } from '../core/types/logger.types.js';
import { ConfigManager } from '../core/config/configManager.js';
import type { McpServerType, McpServerTransport, BaseMcpServer } from '../mcp/types.js';
import type { RoleBasedToolsRegistrar } from '../mcp/tools/types';
import type { ProviderFactoryType } from '../providers/types.js';

/**
 * Command options for serving the MCP server
 */
export interface ServeMcpOptions {
  /** Base directory for file operations */
  baseDir?: string;
  /** Name of the MCP server */
  name?: string;
  /** Version of the MCP server */
  version?: string;
  /** Description of the MCP server */
  description?: string;
  /** Tool name prefix */
  toolPrefix?: string;
  /** Default LLM provider for role-based tools */
  provider?: string;
}

/**
 * Command for starting an MCP server to expose DILocalCliTool functionality through MCP.
 * This allows external LLM applications to access file operations via the standard MCP protocol.
 */
export class McpCommands {
  private configManager: ConfigManager;
  private logger: Logger;
  private pathDI: PathDI;
  private mcpServer: McpServerType;
  private baseMcpServer: BaseMcpServer;
  private process: NodeJS.Process
  private transport: McpServerTransport;
  private providerFactory: ProviderFactoryType;
  private roleBasedToolsRegistrar: RoleBasedToolsRegistrar;

  constructor(
    configManager: ConfigManager,
    logger: Logger,
    pathDI: PathDI,
    mcpServer: McpServerType,
    baseMcpServer: BaseMcpServer,
    process: NodeJS.Process,
    transport: McpServerTransport,
    providerFactory: ProviderFactoryType,
    roleBasedToolsRegistrar: RoleBasedToolsRegistrar
  ) {
    this.configManager = configManager;
    this.logger = logger;
    this.pathDI = pathDI;
    this.mcpServer = mcpServer;
    this.baseMcpServer = baseMcpServer;
    this.process = process;
    this.transport = transport;
    this.providerFactory = providerFactory;
    this.roleBasedToolsRegistrar = roleBasedToolsRegistrar;
  }

  /**
   * Register MCP-related commands with the CLI
   * 
   * @param cli Commander instance
   */
  @CommandHandler({ name: 'registerCommands', description: 'Register MCP server commands' })
  public registerCommands(cli: Command): void {
    cli.command('serve-mcp')
      .description('Start an MCP server with role-based tools for AI-assisted tasks')
      .option('-d, --base-dir <path>', 'Base directory for file operations', this.process.cwd())
      .option('-n, --name <string>', 'Name of the MCP server', this.getDefaultServerName())
      .option('-v, --version <string>', 'Version of the MCP server', this.getDefaultServerVersion())
      .option('--description <string>', 'Description of the MCP server', this.getDefaultServerDescription())
      .option('--tool-prefix <string>', 'Prefix for tool names', this.getDefaultToolPrefix())
      .option('--provider <string>', 'Default LLM provider for role-based tools', this.getDefaultProviderName())
      .action(async (options: ServeMcpOptions) => {
        await this.serveMcp(options);
      });
  }

  /**
   * Start an MCP server with the given options
   *
   * @param options Command options
   */
  private async serveMcp(options: ServeMcpOptions): Promise<void> {
    const baseDir = this.pathDI.resolve(options.baseDir || "./");

    this.logger.info(`Base directory for file operations: ${baseDir}`);

    try {
      // Create MCP server with configuration
      const mcpServer = new this.mcpServer(
        {
          name: options.name || this.getDefaultServerName(),
          version: options.version || this.getDefaultServerVersion(),
          description: options.description || this.getDefaultServerDescription()
        },
        this.logger,
        this.baseMcpServer
      );

      // Initialize LLM provider for role-based tools
      const providerName = options.provider || this.getDefaultProviderName();
      this.logger.info(`Using LLM provider: ${providerName} for role-based tools`);

      const providerConfig = await this.configManager.getProviderConfigByAlias(providerName);
      if (!providerConfig) {
        throw new Error(`Provider "${providerName}" not found in configuration. Please configure it first.`);
      }

      const providerFactory = new this.providerFactory(this.configManager);
      const llmProvider = providerFactory.getProvider(providerName as any);

      // Register role-based tools
      this.roleBasedToolsRegistrar.register(mcpServer, this.logger, llmProvider, this.pathDI);

      this.logger.info(`Starting HTTP MCP server`);
      await mcpServer.connect(this.transport);
      this.logger.info(`MCP server running`);

      // Keep the process running
      this.process.on('SIGINT', async () => {
        this.logger.info('Received SIGINT, shutting down MCP server...');
        await mcpServer.disconnect();
        throw new Error('Process exited with code: ' + 0);
      });
    } catch (error) {
      this.logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }
  
  /**
   * Get default server name from config or fallback to AgenticMCP-MCP
   */
  private getDefaultServerName(): string {
    const config = this.configManager.getConfig();
    return config.mcp?.name || 'AgenticMCP-MCP';
  }
  
  /**
   * Get default server version from config or fallback to 1.0.0
   */
  private getDefaultServerVersion(): string {
    const config = this.configManager.getConfig();
    return config.mcp?.version || '1.0.0';
  }
  
  /**
   * Get default server description from config or fallback to a generic description
   */
  private getDefaultServerDescription(): string {
    const config = this.configManager.getConfig();
    return config.mcp?.description || 'AgenticMCP MCP Server - Providing filesystem operations for LLMs';
  }
  
  /**
   * Get default tool name prefix from config or fallback to empty string
   */
  private getDefaultToolPrefix(): string {
    const config = this.configManager.getConfig();
    return config.mcp?.tools?.namePrefix || '';
  }

  /**
   * Get default provider name for role-based tools
   */
  private getDefaultProviderName(): string {
    const config = this.configManager.getConfig();
    return config.defaultProvider || 'openai';
  }

}