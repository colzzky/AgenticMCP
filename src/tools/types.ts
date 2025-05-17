
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: object;
}

export interface ToolDefinition {
  type: 'function';
  function: FunctionDefinition;
}

/**
 * Configuration for LocalCliTool
 */
export interface FileSystemToolConfig {
  /** Absolute base directory for all file operations */
  baseDir: string;
  /** Whitelisted shell commands (not implemented here) */
  allowedCommands?: string[];
  /** Whether to allow overwriting existing files without confirmation (default: false) */
  allowFileOverwrite?: boolean;
}

export interface FileInfo {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: string;
  path: string;
}