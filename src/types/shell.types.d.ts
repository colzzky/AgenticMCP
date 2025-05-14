import { SpawnDi } from "../types/global.types";
export interface ShellCommandWrapper {
    spawnDi: SpawnDi;
    /**
     * Executes a shell command from a whitelist and returns the output.
     * Rejects if the command is not in the whitelist.
     */
    execute(command: string, args?: string[]): Promise<ShellCommandResult>;
    /**
     * Returns the list of allowed commands.
     */
    getAllowedCommands(): string[];
}
export interface ShellCommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    code: number;
    error?: string;
}
