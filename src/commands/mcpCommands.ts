import { Command } from 'commander';
import type { PathDI } from '../types/global.types';
import { CommandHandler } from '../core/commands/decorators.js';
import type { Logger } from '../core/types/logger.types.js';
import { ConfigManager } from '../core/config/configManager.js';
import type { McpServerType, McpServerTransport, BaseMcpServer } from '../mcp/types.js';
import type { ProviderFactoryInterface } from '../providers/types.js';
import type { ProviderType } from '../core/types/provider.types.js';
import { registerRoleBasedTools } from '../mcp/tools/roleBasedTools';

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

export interface handlers {
  registerRoleBasedTools: typeof registerRoleBasedTools
}

/**
 * Command for starting an MCP server to expose FileSystemTool functionality through MCP.
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
  private providerFactoryInstance: ProviderFactoryInterface;
  private handlers: handlers;

  constructor(
    configManager: ConfigManager,
    logger: Logger,
    pathDI: PathDI,
    mcpServer: McpServerType,
    baseMcpServer: BaseMcpServer,
    process: NodeJS.Process,
    transport: McpServerTransport,
    providerFactoryInstance: ProviderFactoryInterface,
    handlers: handlers
  ) {
    this.configManager = configManager;
    this.logger = logger;
    this.pathDI = pathDI;
    this.mcpServer = mcpServer;
    this.baseMcpServer = baseMcpServer;
    this.process = process;
    this.transport = transport;
    this.providerFactoryInstance = providerFactoryInstance;
    this.handlers = handlers;
  }

  /**
   * Registers MCP-related commands with the command-line interface.
   * @param program - The Commander program instance
   */
  @CommandHandler({
    name: 'serve:mcp',
    description: 'Serve an MCP server for external AI applications'
  })
  registerCommands(program: Command): void {
    program
      .command('serve:mcp')
      .description('Serve an MCP server for external AI applications')
      .option('-b, --base-dir <dir>', 'Base directory for file operations')
      .option('-n, --name <name>', 'Name of the MCP server')
      .option('-v, --version <version>', 'Version of the MCP server')
      .option('-d, --description <description>', 'Description of the MCP server')
      .option('-t, --tool-prefix <prefix>', 'Tool name prefix')
      .action(this.handleServeMcp.bind(this));
  }

  /**
   * Handler for the serve:mcp command.
   * @param options - Command options
   */
  private async handleServeMcp(options: ServeMcpOptions): Promise<void> {
    try {
      const {
        baseDir = this.pathDI.resolve(this.process.cwd()),
        name = this.getDefaultServerName(),
        version = this.getDefaultServerVersion(),
        description = this.getDefaultServerDescription(),
        toolPrefix = this.getDefaultToolPrefix(),
      } = options;

      this.logger.info(`Starting MCP server (${name} v${version})`);
      this.logger.info(`Base directory: ${baseDir}`);

      // Create an instance of the MCP server
      const mcpServer = new this.mcpServer(
        {
          name,
          version,
          description,
          debug: true,
          logger: this.logger,
          namePrefix: toolPrefix,
        },
        this.logger,
        this.baseMcpServer
      );

      // Create the role-based tools registrar
      const mcpServerWithTools = this.handlers.registerRoleBasedTools(
        mcpServer,
        this.logger,
        this.providerFactoryInstance,
      );

      this.logger.info(`Starting HTTP MCP server`);
      await mcpServerWithTools.connect(this.transport);
      this.logger.info(`MCP server running`);

      // Keep the process running
      this.process.on('SIGINT', async () => {
        this.logger.info('Received SIGINT, shutting down MCP server...');
        await mcpServerWithTools.disconnect();
        this.logger.debug('MCP server successfully marked as disconnected');
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

}