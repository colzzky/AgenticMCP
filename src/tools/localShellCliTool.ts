// src/tools/localShellCliTool.ts
import { ShellCommandWrapper, ShellCommandResult } from '../types/shell.types';
import { Logger } from '../core/types/logger.types';
import { type ShellCommandName } from './localShellCliToolDefinitions';
import { type CommandHandler, type CommandMap } from '../core/types/cli.types';
import { ToolDefinition } from './types';
import { Tool } from '../core/types/provider.types';

export interface LocalShellCliToolConfig {
  allowedCommands: string[];
}

type ShellCommandMap = CommandMap & {
  [K in ShellCommandName]: CommandHandler<{ args?: string[] }, ShellCommandResult>;
};

export class LocalShellCliTool {
  private shellWrapper: ShellCommandWrapper;
  private logger: Logger;
  private allowedCommands: Set<string>;
  private commandMap: ShellCommandMap;

  constructor(config: LocalShellCliToolConfig, shellWrapper: ShellCommandWrapper, logger: Logger) {
    this.shellWrapper = shellWrapper;
    this.logger = logger;
    this.allowedCommands = new Set(config.allowedCommands);

    // Dynamically build command map for each allowed shell command
    this.commandMap = {} as ShellCommandMap;
    for (const cmd of config.allowedCommands) {
      this.commandMap[cmd as keyof ShellCommandMap] = async ({ args = [] }) => {
        this.logger.debug(`Executing shell command: ${cmd} ${args.join(' ')}`);
        return this.shellWrapper.execute(cmd, args);
      };
    }
    this.logger.debug(`LocalShellCliTool initialized. Allowed commands: ${[...this.allowedCommands].join(', ')}`);
  }

  public getCommandMap(): Readonly<ShellCommandMap> {
    return this.commandMap;
  }

  public getTools(): Tool[] {
    return [
      {
        type: 'function',
        name: 'shell_command',
        description: 'Execute a shell command',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
            },
            args: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['command'],
        },
      }
    ]
  }

  public getToolDefinitions(): ToolDefinition[] {
    return this.getTools().map((tool: Tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.parameters,
      },
    }));
  }

  // Generic dispatcher for LLM/registry use
  public async execute(command: string, args: string[] = []): Promise<ShellCommandResult> {
    if (!this.allowedCommands.has(command)) {
      throw new Error(`Command '${command}' is not allowed.`);
    }
    return this.shellWrapper.execute(command, args);
  }
}
