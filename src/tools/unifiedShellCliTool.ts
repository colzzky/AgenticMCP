// src/tools/unifiedShellCliTool.ts
import { ShellCommandWrapper, ShellCommandResult } from '../types/shell.types.js';
import { Logger } from '../core/types/logger.types.js';
import { SHELL_COMMANDS } from './localShellCliToolDefinitions.js';
import { getUnifiedShellToolDefinition } from './unifiedShellToolDefinition.js';

export interface UnifiedShellCliToolConfig {
  allowedCommands: string[];
}

export class UnifiedShellCliTool {
  private shellWrapper: ShellCommandWrapper;
  private logger: Logger;
  private allowedCommands: Set<string>;

  constructor(config: UnifiedShellCliToolConfig, shellWrapper: ShellCommandWrapper, logger: Logger) {
    this.shellWrapper = shellWrapper;
    this.logger = logger;
    this.allowedCommands = new Set(config.allowedCommands);
    
    this.logger.debug(`UnifiedShellCliTool initialized. Allowed commands: ${[...this.allowedCommands].join(', ')}`);
  }

  public getToolDefinition() {
    // Return a single tool definition for the shell command
    return getUnifiedShellToolDefinition();
  }

  public async execute(args: { command: string; args?: string[] }): Promise<ShellCommandResult> {
    const { command, args: commandArgs = [] } = args;
    
    if (!this.allowedCommands.has(command)) {
      const msg = `Command '${command}' is not allowed.`;
      this.logger.warn(msg);
      return { success: false, stdout: '', stderr: '', code: 126, error: msg };
    }
    
    this.logger.debug(`Executing shell command: ${command} ${commandArgs.join(' ')}`);
    return this.shellWrapper.execute(command, commandArgs);
  }

  public getAllowedCommands(): string[] {
    return [...this.allowedCommands];
  }
}