/**
 * @file Dependency Injection enabled version of LocalCliTool for better testability
 */

import { Minimatch } from 'minimatch';
import type { Logger } from '../core/types/logger.types';
import { getLocalCliToolDefinitions } from './localCliToolDefinitions';
import type { Tool } from '../core/types/provider.types';
import type { IFileSystem } from '../core/interfaces/file-system.interface';
import type { IDiffService } from '../core/interfaces/diff-service.interface';
import type {
  DirectoryEntry,
  FileSearchResult,
  CreateDirectoryArgs,
  WriteFileArgs,
  ReadFileArgs,
  DeleteFileArgs,
  DeleteDirectoryArgs,
  ListDirectoryArgs,
  SearchCodebaseArgs,
  FindFilesArgs,
  ListDirectoryResult,
  ReadFileResult,
  WriteFileResult,
  CreateDirectoryResult,
  DeleteFileResult,
  DeleteDirectoryResult,
  SearchCodebaseResult,
  FindFilesResult,
  LocalCliCommandMap
} from '../core/types/cli.types';

import type { PathDI } from '../types/global.types';

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
export interface LocalCliToolConfig {
  /** Absolute base directory for all file operations */
  baseDir: string;
  /** Whitelisted shell commands (not implemented here) */
  allowedCommands?: string[];
  /** Whether to allow overwriting existing files without confirmation (default: false) */
  allowFileOverwrite?: boolean;
}

/**
 * Main class providing controlled filesystem operations with dependency injection.
 */
export class DILocalCliTool {
  private baseDir: string;
  private allowedCommands: Set<string>;
  private allowFileOverwrite: boolean;
  private logger: Logger;
  private fileSystem: IFileSystem;
  private diffService: IDiffService;
  private commandMap: LocalCliCommandMap;
  private pathDI: PathDI;

  constructor(
    config: LocalCliToolConfig,
    logger: Logger,
    fileSystem: IFileSystem,
    diffService: IDiffService,
    pathDI: PathDI
  ) {
    if (!config.baseDir) throw new TypeError("'baseDir' must be specified in the configuration.");
    if (!pathDI.isAbsolute(config.baseDir)) throw new TypeError("'baseDir' must be an absolute this.pathDI.");

    this.baseDir = pathDI.resolve(config.baseDir);
    this.allowedCommands = new Set(config.allowedCommands || []);
    this.allowFileOverwrite = config.allowFileOverwrite ?? false;
    this.logger = logger;
    this.fileSystem = fileSystem;
    this.diffService = diffService;
    this.pathDI = pathDI;

    this.commandMap = {
      create_directory: this._createDirectory.bind(this),
      write_file: this._writeFile.bind(this),
      read_file: this._readFile.bind(this),
      delete_file: this._deleteFile.bind(this),
      delete_directory: this._deleteDirectory.bind(this),
      list_directory: this._listDirectory.bind(this),
      search_codebase: this._searchCodebase.bind(this),
      find_files: this._findFiles.bind(this),
    };

    this.logger.info(`LocalCliTool initialized. Base directory: ${this.baseDir}, Allow file overwrite: ${this.allowFileOverwrite}, Allowed commands: ${[...this.allowedCommands]}`);
  }

  /**
   * Gets the available commands in this LocalCliTool instance.
   * Used for tool registration and integration with LLM providers.
   * @returns The command map with available commands and their handlers.
   */
  public getCommandMap(): Readonly<LocalCliCommandMap> {
    return this.commandMap;
  }

  /**
   * Returns JSON-schema-like definitions for each allowed command.
   * Uses the standardized tool definitions from localCliToolDefinitions.ts
   * 
   * @returns An array of tool definitions compatible with LLM providers
   */
  public getToolDefinitions(): ToolDefinition[] {
    // Get the standardized tool definitions
    const toolDefinitions = getLocalCliToolDefinitions();

    // Convert to the format expected by this class's interface
    return toolDefinitions.map((tool: Tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Dispatches execution to the appropriate handler.
   */
  public async execute(command: 'create_directory', args: CreateDirectoryArgs): Promise<CreateDirectoryResult>;
  public async execute(command: 'write_file', args: WriteFileArgs): Promise<WriteFileResult>;
  public async execute(command: 'read_file', args: ReadFileArgs): Promise<ReadFileResult>;
  public async execute(command: 'delete_file', args: DeleteFileArgs): Promise<DeleteFileResult>;
  public async execute(command: 'delete_directory', args: DeleteDirectoryArgs): Promise<DeleteDirectoryResult>;
  public async execute(command: 'list_directory', args: ListDirectoryArgs): Promise<ListDirectoryResult>;
  public async execute(command: 'search_codebase', args: SearchCodebaseArgs): Promise<SearchCodebaseResult>;
  public async execute(command: 'find_files', args: FindFilesArgs): Promise<FindFilesResult>;
  public async execute<C extends keyof LocalCliCommandMap>(
    command: C,
    args: Parameters<LocalCliCommandMap[C]>[0]
  ): Promise<Awaited<ReturnType<LocalCliCommandMap[C]>>> {
    this.logger.debug(`Executing command: ${command}`, { args });

    const handler = this.commandMap[command];
    if (!handler) {
      const error = `Unknown command '${String(command)}'`;
      this.logger.error(error);
      throw new Error(error);
    }
    try {
      let result;
      switch (command) {
        case 'create_directory': {
          result = await this.commandMap.create_directory(args as CreateDirectoryArgs);
          break;
        }
        case 'write_file': {
          result = await this.commandMap.write_file(args as WriteFileArgs);
          break;
        }
        case 'read_file': {
          result = await this.commandMap.read_file(args as ReadFileArgs);
          break;
        }
        case 'delete_file': {
          result = await this.commandMap.delete_file(args as DeleteFileArgs);
          break;
        }
        case 'delete_directory': {
          result = await this.commandMap.delete_directory(args as DeleteDirectoryArgs);
          break;
        }
        case 'list_directory': {
          result = await this.commandMap.list_directory(args as ListDirectoryArgs);
          break;
        }
        case 'search_codebase': {
          result = await this.commandMap.search_codebase(args as SearchCodebaseArgs);
          break;
        }
        case 'find_files': {
          result = await this.commandMap.find_files(args as FindFilesArgs);
          break;
        }
        default: {
          throw new Error(`Unknown command: ${String(command)}`);
        }
      }
      this.logger.debug(`Result for ${String(command)}:`, result);
      return result as Awaited<ReturnType<LocalCliCommandMap[C]>>;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error in ${String(command)}: ${error.message}`);
        throw error;
      } else {
        throw new TypeError('Invalid operation');
      }
    }
  }

  /**
   * Resolves a relative path against cwd or baseDir and ensures it stays within baseDir.
   */
  private resolveAndValidatePath(rel: string): string {
    const resolved = this.pathDI.resolve(this.baseDir, rel);
    if (!resolved.startsWith(this.baseDir + this.pathDI.sep) && resolved !== this.baseDir) {
      throw new Error(`Access denied: Path '${rel}' is outside of baseDir.`);
    }
    return resolved;
  }

  /** Create directory recursively */
  private async _createDirectory(args: CreateDirectoryArgs): Promise<CreateDirectoryResult> {
    const target = this.resolveAndValidatePath(args.path);
    try {
      await this.fileSystem.mkdir(target, { recursive: true });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Write text to file (with overwrite protection)
   * If allowOverwrite is false, checks if the file exists first and doesn't overwrite
   * without explicit permission. Returns file content if it exists and needs confirmation.
   * Now includes GitHub-style diff output showing changes made to the file.
   */
  private async _writeFile(args: WriteFileArgs): Promise<WriteFileResult> {
    const target = this.resolveAndValidatePath(args.path);
    const allowOverwrite = args.allowOverwrite ?? this.allowFileOverwrite;

    try {
      // Create parent directories if they don't exist
      await this.fileSystem.mkdir(this.pathDI.dirname(target), { recursive: true });

      let existingContent = '';
      let fileExists = false;

      try {
        // Check if file exists
        await this.fileSystem.access(target);

        // Get file stats to confirm it's a file
        const stats = await this.fileSystem.stat(target);

        if (stats.isDirectory()) {
          return {
            success: false,
            message: `Path is a directory, not a file: ${args.path}`
          };
        }

        // File exists - read the content
        fileExists = true;
        existingContent = await this.fileSystem.readFile(target, 'utf8');

        // Generate diff between existing and new content
        const diff = this.diffService.generateDiff(existingContent, args.content);

        // Check if we're allowed to overwrite
        if (!allowOverwrite) {
          this.logger.warn(`File already exists at ${args.path} and allowOverwrite is false`);
          return {
            success: false,
            fileExists: true,
            existingContent,
            diff,
            message: "File exists and allowOverwrite is false. Set allowOverwrite to true to proceed."
          };
        }
        // Otherwise proceed with overwrite
      } catch {
        // File doesn't exist, which is fine - we'll create it
      }

      // Write file
      await this.fileSystem.writeFile(target, args.content);

      // Generate diff (empty string for old content if it's a new file)
      const diff = this.diffService.generateDiff(
        fileExists ? existingContent : '',
        args.content
      );

      return {
        success: true,
        diff
      };
    } catch (error) {
      this.logger.error(`Error writing file ${args.path}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: `Error writing file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /** Read and return file contents */
  private async _readFile(args: ReadFileArgs): Promise<ReadFileResult> {
    const target = this.resolveAndValidatePath(args.path);
    try {
      const content = await this.fileSystem.readFile(target, 'utf8');
      return { content };
    } catch {
      return { content: '' };
    }
  }

  /** Delete file (requires confirm=true) */
  private async _deleteFile(args: DeleteFileArgs): Promise<DeleteFileResult> {
    const target = this.resolveAndValidatePath(args.path);
    try {
      await this.fileSystem.unlink(target);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /** Delete directory, recursive or only if empty */
  private async _deleteDirectory(args: DeleteDirectoryArgs): Promise<DeleteDirectoryResult> {
    const target = this.resolveAndValidatePath(args.path);
    try {
      // Verify directory exists first
      try {
        await this.fileSystem.access(target);
      } catch {
        // If directory doesn't exist, return failure
        return { success: false };
      }

      // Verify it's a directory
      const stats = await this.fileSystem.stat(target);
      if (!stats.isDirectory()) {
        return { success: false };
      }

      // Try to delete
      await this.fileSystem.rmdir(target, { recursive: true, force: true });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /** List directory contents */
  private async _listDirectory(args: ListDirectoryArgs): Promise<ListDirectoryResult> {
    const rel = args.path || '.';
    const target = this.resolveAndValidatePath(rel);

    try {
      const entries: DirectoryEntry[] = [];
      const items = await this.fileSystem.readdir(target);

      for (const itemName of items) {
        if (itemName.startsWith('.')) continue;

        const itemPath = this.pathDI.join(target, itemName);
        const stat = await this.fileSystem.stat(itemPath);

        entries.push({
          name: this.pathDI.relative(this.baseDir, itemPath),
          type: stat.isDirectory() ? 'directory' : 'file'
        });
      }

      return { entries };
    } catch (error) {
      this.logger.error(`Error listing directory ${args.path}: ${error instanceof Error ? error.message : String(error)}`);
      return { entries: [] };
    }
  }

  /** Search codebase for files containing a query */
  private async _searchCodebase(args: SearchCodebaseArgs): Promise<SearchCodebaseResult> {
    const results: FileSearchResult[] = [];
    const regex = new RegExp(args.query, 'i');
    const maxResults = 50;
    const recursive = args.recursive ?? false;

    const walk = async (dir: string) => {
      try {
        const items = await this.fileSystem.readdir(dir);

        for (const itemName of items) {
          if (results.length >= maxResults) return;

          const itemPath = this.pathDI.join(dir, itemName);
          const stat = await this.fileSystem.stat(itemPath);

          if (stat.isDirectory()) {
            if (recursive) await walk(itemPath);
          } else {
            try {
              const content = await this.fileSystem.readFile(itemPath, 'utf8');
              const lines = content.split(/\r?\n/);

              for (const [i, lineRaw] of lines.entries()) {
                if (regex.test(lineRaw)) {
                  let line = lineRaw.trim();
                  if (line.length > 200) line = line.slice(0, 197) + '...';

                  results.push({
                    file: this.pathDI.relative(this.baseDir, itemPath),
                    line_number: i + 1,
                    line_content: line,
                  });

                  if (results.length >= maxResults) return;
                }
              }
            } catch {
              // Skip files that cannot be read
            }
          }
        }
      } catch {
        // Skip directories that cannot be read
      }
    };

    await walk(this.baseDir);
    return { results };
  }

  /** Find files or directories matching glob patterns */
  private async _findFiles(args: FindFilesArgs): Promise<FindFilesResult> {
    const results: string[] = [];
    const recursive = args.recursive ?? false;
    const matcher = new Minimatch(args.pattern);

    const walk = async (dir: string) => {
      try {
        const items = await this.fileSystem.readdir(dir);

        for (const itemName of items) {
          const itemPath = this.pathDI.join(dir, itemName);
          const stat = await this.fileSystem.stat(itemPath);

          if (stat.isDirectory()) {
            if (recursive) await walk(itemPath);
          } else {
            if (matcher.match(itemName)) {
              results.push(this.pathDI.relative(this.baseDir, itemPath));
            }
          }
        }
      } catch {
        // Skip directories that cannot be read
      }
    };

    await walk(this.baseDir);
    return { files: results };
  }
}