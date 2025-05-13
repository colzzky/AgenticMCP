/**
 * @file Commands for interacting with the tool system
 */

import { Command, CommandContext, CommandOutput } from '../core/types/command.types';
import { AgentCommand, CommandHandler, CommandParam } from '../core/commands/decorators';
import { info } from '../core/utils/logger';
import { ToolRegistry } from '../tools/toolRegistry';
import { ToolExecutor } from '../tools/toolExecutor';

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

  protected toolRegistry: InstanceType<typeof ToolRegistry>;
  protected toolExecutor: InstanceType<typeof ToolExecutor>;

  constructor(
    toolRegistry: InstanceType<typeof ToolRegistry>,
    toolExecutor: InstanceType<typeof ToolExecutor>
  ) {
    this.toolRegistry = toolRegistry;
    this.toolExecutor = toolExecutor;
  }

  /**
   * Execute the default tools command
   */
  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    info(`Executing tools command with args: ${JSON.stringify(args)}`);

    if (!this.toolRegistry) {
      return {
        success: false,
        message: 'Tool registry is not initialized',
        data: undefined
      };
    }

    // Get all registered tools
    const tools = this.toolRegistry.getAllTools();

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
    if (!this.toolRegistry) {
      return {
        success: false,
        message: 'Tool registry is not initialized',
        data: undefined
      };
    }

    const tools = this.toolRegistry.getAllTools();

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

    if (!this.toolExecutor) {
      return {
        success: false,
        message: 'Tool executor is not initialized',
        data: undefined
      };
    }

    try {
      info(`Executing tool '${toolName}' with args: ${JSON.stringify(args)}`);
      const result = await this.toolExecutor.executeTool(toolName, args);

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
    let output = '';
    output += 'Tool Commands\n\n';
    output += 'Usage:\n';
    output += '  agenticmcp tools [options]\n\n';
    output += 'Description:\n';
    output += '  Commands for working with the tool system.\n\n';
    output += 'Options:\n';
    output += '  -l, --list      List all registered tools\n';
    output += '  -e, --execute   Execute a specific tool\n\n';
    output += 'Examples:\n';
    output += '  agenticmcp tools\n';
    output += '  agenticmcp tools --list\n';
    output += '  agenticmcp tools --execute read_file { "path": "./example.txt" }\n';
    return output;
  }

}

export default ToolCommands;