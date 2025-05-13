import { McpServer as BaseMcpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport as ServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Logger } from '../core/types/logger.types.js';
import { type ZodRawShape } from "zod";

/**
 * Configuration options for the MCP server
 */
export type McpServerConfig = Implementation;

/**
 * MCP Server class that wraps the MCP SDK server and provides integration
 * with AgenticMCP's existing DILocalCliTool implementation.
 */
export class McpServer {
  private server: BaseMcpServer;
  private logger: Logger;
  private isConnected = false;
  private registeredTools: Set<string> = new Set();

  /**
   * Creates a new MCP server instance
   *
   * @param config Server configuration options
   * @param logger Logger instance for logging
   */
  constructor(config: McpServerConfig, logger: Logger) {
    this.server = new BaseMcpServer({
      name: config.name,
      version: config.version,
      description: config.description
    });

    this.logger = logger;

    this.logger.info(`MCP Server initialized: ${config.name} v${config.version}`);

  }

  /**
   * Connect the MCP server to a transport
   * 
   * @param transport Server transport implementation
   * @returns Promise that resolves when the server is connected
   */
  public async connect(transport: ServerTransport): Promise<void> {
    if (this.isConnected) {
      this.logger.warn('MCP Server is already connected to a transport');
      return;
    }
    
    try {
      this.logger.info('Connecting MCP Server to transport...');
      await this.server.connect(transport);
      this.isConnected = true;
      this.logger.info('MCP Server successfully connected to transport');
    } catch (error) {
      this.logger.error('Failed to connect MCP Server to transport:', error);
      throw error;
    }
  }

  /**
   * Disconnect the MCP server from its transport
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('MCP Server is not connected to any transport');
      return;
    }

    try {
      this.logger.info('Disconnecting MCP Server from transport...');
      await this.server.close();
      this.isConnected = false;
      this.logger.info('MCP Server successfully marked as disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect MCP Server from transport:', error);
      throw error;
    }
  }

  /**
   * Register a new tool with the MCP server
   *
   * @param name Tool name
   * @param description Tool description
   * @param schema Tool input schema (using Zod)
   * @param handler Function that executes the tool
   */
  public registerTool(
    name: string,
    description: string,
    schema: ZodRawShape,
    handler: (args: any) => Promise<any>
  ): void {
    if (this.registeredTools.has(name)) {
      this.logger.warn(`Tool ${name} is already registered, skipping`);
      return;
    }

    this.logger.debug(`Registering external MCP tool: ${name}`);
    try {
      this.server.tool(
        name,
        description,
        schema,
        async (args: any) => {
          try {
            this.logger.debug(`Executing tool ${name} with args:`, args);
            const result = await handler(args);

            // If the result is already in the expected format, return it directly
            if (result?.content && Array.isArray(result.content)) {
              return result;
            }

            // Otherwise, wrap it in the expected format
            return {
              content: [{
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, undefined, 2)
              }]
            };
          } catch (error) {
            this.logger.error(`Error executing tool ${name}:`, error);

            return {
              content: [{
                type: 'text',
                text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
              }]
            };
          }
        }
      );

      this.registeredTools.add(name);
      this.logger.info(`Tool ${name} successfully registered`);
    } catch (error) {
      this.logger.error(`Failed to register tool ${name}:`, error);
      throw error;
    }
  }
}