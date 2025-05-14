// src/tools/localShellCliTool.ts
import { ShellCommandWrapper, ShellCommandResult } from '../types/shell.types';
import { Logger } from '../core/types/logger.types';
import { getLocalShellCliToolDefinitions, SHELL_COMMANDS } from './localShellCliToolDefinitions';

export interface LocalShellCliToolConfig {
  allowedCommands: string[];
}

type ShellCommandMap = {
  [K in typeof SHELL_COMMANDS[number]]: (args: { args?: string[] }) => Promise<ShellCommandResult>
};

export class DILocalShellCliTool {
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

  public getToolDefinitions() {
    return getLocalShellCliToolDefinitions().filter(def =>
      this.allowedCommands.has(def.name)
    );
  }

  // Generic dispatcher for LLM/registry use
  public async execute(command: string, args: string[] = []): Promise<ShellCommandResult> {
    if (!this.allowedCommands.has(command)) {
      throw new Error(`Command '${command}' is not allowed.`);
    }
    return this.shellWrapper.execute(command, args);
  }
}
