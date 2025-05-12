/**
 * @file Commands for interacting with the tool system
 */

import { Command, CommandContext, CommandOutput } from '../core/types/command.types';
import { AgentCommand, CommandHandler, CommandParam } from '../core/commands/decorators';
import { info } from '../core/utils/logger';

/**
 * Tool command for listing and executing tools
 */
@AgentCommand({
  name: 'tools',
  description: 'Commands for working with the tool system',
  aliases: ['tool'],
  category: 'core'
})
export class ToolCommands implements Command {
  name = 'tools';
  description = 'Commands for working with the tool system';
  aliases = ['tool'];
  options = [];

  /**
   * Execute the default tools command
   */
  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    info(`Executing tools command with args: ${JSON.stringify(args)}`);

    // Access the tool registry from the global context
    const toolRegistry = globalThis.toolRegistry;

    if (!toolRegistry) {
      return {
        success: false,
        message: 'Tool registry is not initialized',
        data: undefined
      };
    }
    
    // Get all registered tools
    const tools = toolRegistry.getAllTools();
    
    return {
      success: true,
      message: `Found ${tools.length} registered tools`,
      data: {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description || 'No description'
        }))
      }
    };
  }

  /**
   * List all available tools
   */
  @CommandHandler({
    name: 'list',
    description: 'List all registered tools'
  })
  async listTools(): Promise<CommandOutput> {
    const toolRegistry = globalThis.toolRegistry;

    if (!toolRegistry) {
      return {
        success: false,
        message: 'Tool registry is not initialized',
        data: undefined
      };
    }
    
    const tools = toolRegistry.getAllTools();
    
    return {
      success: true,
      message: `Found ${tools.length} registered tools`,
      data: {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description || 'No description',
          parameters: tool.parameters
        }))
      }
    };
  }

  /**
   * Execute a specific tool
   */
  @CommandHandler({
    name: 'execute',
    description: 'Execute a specific tool'
  })
  async executeTool(
    @CommandParam('name') toolName: string,
    @CommandParam('args') args: Record<string, unknown>
  ): Promise<CommandOutput> {
    const toolExecutor = globalThis.toolExecutor;
    
    if (!toolExecutor) {
      return {
        success: false,
        message: 'Tool executor is not initialized',
        data: undefined
      };
    }
    
    try {
      info(`Executing tool '${toolName}' with args: ${JSON.stringify(args)}`);
      const result = await toolExecutor.executeTool(toolName, args);
      
      return {
        success: true,
        message: `Tool '${toolName}' executed successfully`,
        data: { result }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        message: `Failed to execute tool '${toolName}': ${errorMessage}`,
        data: undefined
      };
    }
  }

  /**
   * Get help for this command
   */
  getHelp(): string {
    return `
Tool Commands

Usage:
  agenticmcp tools 
  agenticmcp tools list
  agenticmcp tools execute <name> <args>

Commands:
  list                    List all registered tools
  execute <name> <args>   Execute a specific tool with arguments

Examples:
  agenticmcp tools
  agenticmcp tools list
  agenticmcp tools execute read_file { "path": "./example.txt" }
    `;
  }
}

export default ToolCommands;