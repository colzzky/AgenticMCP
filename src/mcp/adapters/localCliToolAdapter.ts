import type { McpServer } from '../mcpServer.js';
import type { LocalCliTool } from '../../tools/localCliTool.js';
import type { Logger } from '../../core/types/logger.types.js';
import type { FunctionDefinition, ToolDefinition } from '../../tools/localCliTool.js';

/**
 * Configuration options for LocalCliToolAdapter
 */
export interface LocalCliToolAdapterConfig {
  /** Optional prefix to add to all tool names */
  toolNamePrefix?: string;
}

/**
 * Adapter that maps LocalCliTool commands to MCP tools
 * This adapter provides a bridge between the LocalCliTool
 * implementation and the MCP server.
 */
export class LocalCliToolAdapter {
  private localCliTool: LocalCliTool;
  private logger: Logger;
  private config: LocalCliToolAdapterConfig;

  /**
   * Creates a new adapter for mapping LocalCliTool commands to MCP tools
   * 
   * @param localCliTool The LocalCliTool instance
   * @param config Configuration options
   * @param logger Logger instance for logging
   */
  constructor(localCliTool: LocalCliTool, config: LocalCliToolAdapterConfig = {}, logger: Logger) {
    this.localCliTool = localCliTool;
    this.config = config;
    this.logger = logger;
    
    this.logger.info('LocalCliToolAdapter initialized');
  }

  /**
   * Registers all LocalCliTool commands with an MCP server as tools
   * 
   * @param mcpServer The MCP server to register tools with
   */
  public registerTools(mcpServer: McpServer): void {
    // Get LocalCliTool tools and commands
    const toolDefinitions = this.localCliTool.getToolDefinitions();
    const commandMap = this.localCliTool.getCommandMap();
    
    this.logger.info(`Registering ${toolDefinitions.length} LocalCliTool commands as MCP tools`);
    
    // Register each tool with the MCP server
    for (const toolDef of toolDefinitions) {
      this.registerTool(mcpServer, toolDef, commandMap);
    }
  }
  
  /**
   * Registers a single LocalCliTool command as an MCP tool
   * 
   * @param mcpServer The MCP server to register the tool with
   * @param toolDef The tool definition from LocalCliTool
   * @param commandMap The command map from LocalCliTool
   */
  private registerTool(
    mcpServer: McpServer, 
    toolDef: ToolDefinition, 
    commandMap: Record<string, Function>
  ): void {
    const originalName = toolDef.function.name;
    const commandName = originalName as keyof typeof commandMap;
    const toolName = this.getToolName(originalName);
    
    // Get the handler for this command
    const handler = commandMap[commandName];
    
    if (!handler) {
      this.logger.warn(`No handler found for command ${commandName}, skipping registration`);
      return;
    }
    
    this.logger.debug(`Registering LocalCliTool command ${commandName} as MCP tool ${toolName}`);
    
    // Register the tool with the MCP server
    mcpServer.registerTool(
      toolName,
      toolDef.function.description || '',
      toolDef.function.parameters,
      async (args: any) => {
        try {
          this.logger.debug(`Executing MCP tool ${toolName} with args:`, args);
          const result = await this.localCliTool.execute(commandName as any, args);
          return result;
        } catch (error) {
          this.logger.error(`Error executing MCP tool ${toolName}:`, error);
          throw error;
        }
      }
    );
  }
  
  /**
   * Gets the MCP tool name for a LocalCliTool command, applying any configured prefix
   * 
   * @param commandName The original command name
   * @returns The MCP tool name
   */
  private getToolName(commandName: string): string {
    const prefix = this.config.toolNamePrefix || '';
    return `${prefix}${commandName}`;
  }
}