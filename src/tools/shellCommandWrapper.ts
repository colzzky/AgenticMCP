// src/tools/shellCommandWrapper.ts
import { ShellCommandWrapper, ShellCommandResult } from '../types/shell.types';
import { Logger } from '../core/types/logger.types';
import { SpawnDi } from '../types/global.types';

export class DefaultShellCommandWrapper implements ShellCommandWrapper {
  spawnDi: SpawnDi;
  private allowedCommands: Set<string>;
  private logger: Logger;

  constructor(spawnDi: SpawnDi, allowedCommands: string[], logger: Logger) {
    this.spawnDi = spawnDi;
    this.allowedCommands = new Set(allowedCommands);
    this.logger = logger;
  }

  getAllowedCommands(): string[] {
    return [...this.allowedCommands];
  }

  async execute(command: string, args: string[] = []): Promise<ShellCommandResult> {
    if (!this.allowedCommands.has(command)) {
      const msg = `Command '${command}' is not allowed.`;
      this.logger.warn(msg);
      return { success: false, stdout: '', stderr: '', code: 126, error: msg };
    }
    return new Promise((resolve) => {
      const proc = this.spawnDi(command, args, { shell: true });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        resolve({ success: code === 0, stdout, stderr, code: code ?? -1 });
      });
      proc.on('error', (err) => {
        this.logger.error(`Shell command error: ${err}`);
        resolve({ success: false, stdout, stderr, code: -1, error: err.message });
      });
    });
  }
}
