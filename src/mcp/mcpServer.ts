import { McpServer as BaseMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerTransport } from '@modelcontextprotocol/sdk/server/transport.js';
import type { Tool } from '../core/types/provider.types.js';
import type { Logger } from '../core/types/logger.types.js';
import type { LocalCliTool } from '../tools/localCliTool.js';
import { z } from 'zod';

/**
 * Configuration options for the MCP server
 */
export interface McpServerConfig {
  /** Name of the MCP server */
  name: string;
  /** Version of the MCP server */
  version: string;
  /** Optional server description */
  description?: string;
}

/**
 * MCP Server class that wraps the MCP SDK server and provides integration
 * with AgenticMCP's existing LocalCliTool implementation.
 */
export class McpServer {
  private server: BaseMcpServer;
  private logger: Logger;
  private localCliTool: LocalCliTool;
  private isConnected = false;
  private registeredTools: Set<string> = new Set();

  /**
   * Creates a new MCP server instance
   * 
   * @param config Server configuration options
   * @param localCliTool Instance of LocalCliTool for handling filesystem operations
   * @param logger Logger instance for logging
   */
  constructor(config: McpServerConfig, localCliTool: LocalCliTool, logger: Logger) {
    this.server = new BaseMcpServer({
      name: config.name,
      version: config.version,
      description: config.description
    });
    
    this.localCliTool = localCliTool;
    this.logger = logger;
    
    this.logger.info(`MCP Server initialized: ${config.name} v${config.version}`);
    
    // Register LocalCliTool commands as MCP tools
    this.registerLocalCliTools();
  }

  /**
   * Registers all LocalCliTool commands as MCP tools
   */
  private registerLocalCliTools(): void {
    const commandMap = this.localCliTool.getCommandMap();
    const toolDefinitions = this.localCliTool.getToolDefinitions();
    
    // Register each tool definition from LocalCliTool
    for (const toolDef of toolDefinitions) {
      const toolName = toolDef.function.name;
      const handler = commandMap[toolName as keyof typeof commandMap];
      
      if (handler) {
        this.logger.debug(`Registering MCP tool: ${toolName}`);
        
        // Register the tool with the MCP server
        this.server.tool(
          toolName,
          toolDef.function.parameters,
          async (args: any) => {
            try {
              this.logger.debug(`Executing tool ${toolName} with args:`, args);
              const result = await this.localCliTool.execute(toolName as any, args);
              
              return {
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify(result, null, 2) 
                }]
              };
            } catch (error) {
              this.logger.error(`Error executing tool ${toolName}:`, error);
              
              return { 
                content: [{ 
                  type: 'text', 
                  text: `Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}` 
                }]
              };
            }
          }
        );
      }
    }
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
      await this.server.disconnect();
      this.isConnected = false;
      this.logger.info('MCP Server successfully disconnected from transport');
    } catch (error) {
      this.logger.error('Failed to disconnect MCP Server from transport:', error);
      throw error;
    }
  }
}