// src/core/types/command.types.ts
import type { PathDI, FileSystemDI } from '../../global.types';

/**
 * Represents the execution context for a command.
 * This might include configuration, session data, or other relevant information.
 */
export interface CommandContext {
  // Example: Raw arguments passed to the command
  rawArgs?: string[];
  // Example: Parsed options
  options?: Record<string, unknown>; // Use unknown for safer type
  // Example: User configuration
  config?: unknown; // Use unknown for safer type
  // Example: Session ID for persistent operations
  sessionId?: string;
}

/**
 * Represents the output of a command execution.
 * This can be simple text, structured data, or an error.
 */
export interface CommandOutput {
  success: boolean;
  message?: string; // For simple text output or error messages
  data?: unknown; // For structured data output
  error?: Error; // For detailed error objects
}

/**
 * Defines the basic structure for a command.
 * Each command in the CLI will implement this interface.
 */
export interface Command {
  // Unique name of the command (e.g., "writer", "coder")
  name: string;
  // Short description of what the command does
  description: string;
  // Aliases for the command
  aliases?: string[];
  // Options specific to this command
  options?: Array<{
    flags: string; // e.g., "-f, --force"
    description: string;
    defaultValue?: unknown;
  }>;

  /**
   * Executes the command with the given context and arguments.
   * @param context - The execution context for the command.
   * @param args - The arguments passed to the command.
   * @returns A promise that resolves to the command's output.
   */
  execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput>;

  /**
   * Optional method to provide help/usage information for the command.
   * If not provided, a default help message might be generated.
   */
  getHelp?(): string;  

}
