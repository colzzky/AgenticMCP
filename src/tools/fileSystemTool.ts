/**
 * @file Dependency Injection enabled version of LocalCliTool for better testability
 */

import { Minimatch } from 'minimatch';
import type { Logger } from '../core/types/logger.types';
import { getFileSystemToolDefinitions } from './fileSystemToolDefinitions';
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
  LocalCliCommandMap,
  EditFileArgs,
  EditFileResult,
  MoveFileArgs,
  MoveFileResult,
  ReadMultipleFilesArgs,
  ReadMultipleFilesResult,
  GetFileInfoArgs,
  GetFileInfoResult,
  DirectoryTreeArgs,
  DirectoryTreeResult,
  DirectoryTreeEntry,
} from '../core/types/cli.types';
import os from 'os';
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

/**
 * Main class providing controlled filesystem operations with dependency injection.
 */
export class FileSystemTool {
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
      get_directory_tree: this._getDirectoryTree.bind(this),
      get_file_info: this._getFileInfo.bind(this),
      read_multiple_files: this._readMultipleFiles.bind(this),
      write_file: this._writeFile.bind(this),
      edit_file: this._editFile.bind(this),
      move_file: this._moveFile.bind(this),
      read_file: this._readFile.bind(this),
      delete_file: this._deleteFile.bind(this),
      delete_directory: this._deleteDirectory.bind(this),
      list_directory: this._listDirectory.bind(this),
      search_codebase: this._searchCodebase.bind(this),
      find_files: this._findFiles.bind(this),
    };

    this.logger.debug(`LocalCliTool initialized. Base directory: ${this.baseDir}, Allow file overwrite: ${this.allowFileOverwrite}, Allowed commands: ${[...this.allowedCommands]}`);
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
   * Uses the standardized tool definitions from fileSystemToolDefinitions.ts
   * 
   * @returns An array of tool definitions compatible with LLM providers
   */
  public getToolDefinitions(): ToolDefinition[] {
    // Get the standardized tool definitions
    const toolDefinitions = getFileSystemToolDefinitions();

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
  public async execute(command: 'get_directory_tree', args: DirectoryTreeArgs): Promise<DirectoryTreeResult>;
  public async execute(command: 'get_file_info', args: GetFileInfoArgs): Promise<GetFileInfoResult>;
  public async execute(command: 'read_multiple_files', args: ReadMultipleFilesArgs): Promise<ReadMultipleFilesResult>;
  public async execute(command: 'write_file', args: WriteFileArgs): Promise<WriteFileResult>;
  public async execute(command: 'edit_file', args: EditFileArgs): Promise<EditFileResult>;
  public async execute(command: 'move_file', args: MoveFileArgs): Promise<MoveFileResult>;
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
        case 'get_directory_tree': {
          result = await this.commandMap.get_directory_tree(args as DirectoryTreeArgs);
          break;
        }
        case 'get_file_info': {
          result = await this.commandMap.get_file_info(args as GetFileInfoArgs);
          break;
        }
        case 'read_multiple_files': {
          result = await this.commandMap.read_multiple_files(args as ReadMultipleFilesArgs);
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
        case 'move_file': {
          result = await this.commandMap.move_file(args as MoveFileArgs);
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

  // Add these improvements to FileSystemTool
  private expandHome(filepath: string): string {
    if (filepath.startsWith('~/') || filepath === '~') {
      return this.pathDI.join(os.homedir(), filepath.slice(1));
    }
    return filepath;
  }

  private async validatePath(requestedPath: string): Promise<string> {
    const expandedPath = this.expandHome(requestedPath);
    const absolute = this.pathDI.isAbsolute(expandedPath)
      ? this.pathDI.resolve(expandedPath)
      : this.pathDI.resolve(process.cwd(), expandedPath);

    const normalizedPath = this.pathDI.normalize(absolute);

    // Check if path is within allowed directories
    if (!normalizedPath.startsWith(this.baseDir)) {
      throw new Error(`Access denied - path outside allowed directory: ${absolute}`);
    }

    // Handle symlinks by checking their real path
    try {
      const realPath = await this.fileSystem.realpath(absolute);
      const normalizedReal = this.pathDI.normalize(realPath);
      if (!normalizedReal.startsWith(this.baseDir)) {
        throw new Error("Access denied - symlink target outside allowed directory");
      }
      return realPath;
    } catch (error) {
      // For new files that don't exist yet, verify parent directory
      const parentDir = this.pathDI.dirname(absolute);
      try {
        const realParentPath = await this.fileSystem.realpath(parentDir);
        const normalizedParent = this.pathDI.normalize(realParentPath);
        if (!normalizedParent.startsWith(this.baseDir)) {
          throw new Error("Access denied - parent directory outside allowed directory");
        }
        return absolute;
      } catch {
        throw new Error(`Parent directory does not exist: ${parentDir}`);
      }
    }
  }

  async applyFileEdits(
    filePath: string,
    edits: Array<{ oldText: string, newText: string }>,
    dryRun = false
  ): Promise<string> {
    // Read file content and normalize line endings
    const content = this.diffService.normalizeLineEndings(await this.fileSystem.readFile(filePath, 'utf-8'));

    // Apply edits sequentially
    let modifiedContent = content;
    for (const edit of edits) {
      const normalizedOld = this.diffService.normalizeLineEndings(edit.oldText);
      const normalizedNew = this.diffService.normalizeLineEndings(edit.newText);

      // If exact match exists, use it
      if (modifiedContent.includes(normalizedOld)) {
        modifiedContent = modifiedContent.replace(normalizedOld, normalizedNew);
        continue;
      }

      // Otherwise, try line-by-line matching with flexibility for whitespace
      const oldLines = normalizedOld.split('\n');
      const contentLines = modifiedContent.split('\n');
      let matchFound = false;

      for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
        const potentialMatch = contentLines.slice(i, i + oldLines.length);

        // Compare lines with normalized whitespace
        const isMatch = oldLines.every((oldLine, j) => {
          const contentLine = potentialMatch[j];
          return oldLine.trim() === contentLine.trim();
        });

        if (isMatch) {
          // Preserve original indentation of first line
          const originalIndent = contentLines[i].match(/^\s*/)?.[0] || '';
          const newLines = normalizedNew.split('\n').map((line, j) => {
            if (j === 0) return originalIndent + line.trimStart();
            // For subsequent lines, try to preserve relative indentation
            const oldIndent = oldLines[j]?.match(/^\s*/)?.[0] || '';
            const newIndent = line.match(/^\s*/)?.[0] || '';
            if (oldIndent && newIndent) {
              const relativeIndent = newIndent.length - oldIndent.length;
              return originalIndent + ' '.repeat(Math.max(0, relativeIndent)) + line.trimStart();
            }
            return line;
          });

          contentLines.splice(i, oldLines.length, ...newLines);
          modifiedContent = contentLines.join('\n');
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        throw new Error(`Could not find exact match for edit:\n${edit.oldText}`);
      }
    }

    // Create unified diff
    const diff = this.diffService.createUnifiedDiff(content, modifiedContent, filePath);

    // Format diff with appropriate number of backticks
    let numBackticks = 3;
    while (diff.includes('`'.repeat(numBackticks))) {
      numBackticks++;
    }
    const formattedDiff = `${'`'.repeat(numBackticks)}diff\n${diff}${'`'.repeat(numBackticks)}\n\n`;

    if (!dryRun) {
      await this.fileSystem.writeFile(filePath, modifiedContent, 'utf-8');
    }

    return formattedDiff;
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
   * Write file
   */
  private async _writeFile(args: WriteFileArgs): Promise<WriteFileResult> {
    const target = this.resolveAndValidatePath(args.path);
    try {
      await this.fileSystem.writeFile(target, args.content, "utf-8");
      return { success: true, content: args.content, message: "File written successfully" };
    } catch {
      return { success: false, content: "", message: "Failed to write file" };
    }
  }

  /**
   * Write text to file (with overwrite protection)
   * If allowOverwrite is false, checks if the file exists first and doesn't overwrite
   * without explicit permission. Returns file content if it exists and needs confirmation.
   * Now includes GitHub-style diff output showing changes made to the file.
   */
  private async _editFile(args: EditFileArgs): Promise<EditFileResult> {
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
        // Check if we're allowed to overwrite
        if (!allowOverwrite) {
          this.logger.warn(`File already exists at ${args.path} and allowOverwrite is false`);
          return {
            success: false,
            fileExists: true,
            existingContent,
            message: "File exists and allowOverwrite is false. Set allowOverwrite to true to proceed."
          };
        }
        // Otherwise proceed with overwrite
      } catch {
        // File doesn't exist, which is fine - we'll create it
      }

      // Write file
      const validPath = await this.validatePath(args.path);
      const result = await this.applyFileEdits(validPath, args.edits, args.dryRun);

      return {
        success: true,
        diff: result,
        message: "File edited successfully"
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

  /** Find files or directories matching glob patterns with exclusions */
  private async _findFiles(args: FindFilesArgs): Promise<FindFilesResult> {
    const results: string[] = [];
    const recursive = args.recursive ?? true;
    const matcher = new Minimatch(args.pattern);
    const excludePatterns = args.exclude?.map(pattern => new Minimatch(pattern)) || [];

    const walk = async (dir: string) => {
      try {
        const items = await this.fileSystem.readdir(dir);

        for (const itemName of items) {
          const itemPath = this.pathDI.join(dir, itemName);
          const relativePath = this.pathDI.relative(this.baseDir, itemPath);

          // Check if path matches any exclude pattern
          const shouldExclude = excludePatterns.some(pattern => pattern.match(relativePath));
          if (shouldExclude) continue;

          const stat = await this.fileSystem.stat(itemPath);

          if (stat.isDirectory() && recursive) {
            await walk(itemPath);
          } else if (!stat.isDirectory() && matcher.match(itemName)) {
            results.push(relativePath);
          }
        }
      } catch {
        // Skip directories that cannot be read
      }
    };

    await walk(this.baseDir);
    return { files: results };
  }

  /** 
   * Get hierarchical directory structure 
   */
  private async _getDirectoryTree(args: DirectoryTreeArgs): Promise<DirectoryTreeResult> {
    const buildTree = async (currentPath: string, currentName: string): Promise<DirectoryTreeEntry> => {
      const validPath = await this.validatePath(currentPath);
      const stats = await this.fileSystem.stat(validPath);

      const entry: DirectoryTreeEntry = {
        name: currentName,
        type: stats.isDirectory() ? 'directory' : 'file'
      };

      if (stats.isDirectory()) {
        const items = await this.fileSystem.readdir(validPath);
        entry.children = await Promise.all(
          items
            .filter(name => !name.startsWith('.'))
            .map(async (name) => {
              const itemPath = this.pathDI.join(currentPath, name);
              return buildTree(itemPath, name);
            })
        );
      }

      return entry;
    };

    const targetPath = this.resolveAndValidatePath(args.path);
    const baseName = this.pathDI.basename(targetPath);
    const treeData = await buildTree(targetPath, baseName);

    return { tree: JSON.stringify(treeData, null, 2) };
  }

  /** 
   * Get detailed file information 
   */
  private async _getFileInfo(args: GetFileInfoArgs): Promise<GetFileInfoResult> {
    const validPath = this.resolveAndValidatePath(args.path);
    const stats = await this.fileSystem.stat(validPath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: stats.mode?.toString(8).slice(-3) || '644',
      path: args.path
    };
  }

  private async _readMultipleFiles(args: { paths: string[] }): Promise<{ content: string }> {
    const results = await Promise.all(
      args.paths.map(async (filePath: string) => {
        try {
          const validPath = await this.validatePath(filePath);
          const content = await this.fileSystem.readFile(validPath, "utf-8");
          return `<file>\n<file_path>${filePath}<file_path>:\n<file_contents>${content}<file_contents>\n<file>`;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return `${filePath}: Error - ${errorMessage}`;
        }
      }),
    );
    return {
      content: "Here's the contents of all files read - each file is wrapped in <file> tags, with the file path in <file_path> and the file contents in <file_contents>:\n\n" + results.join("\n\n"),
    };
  }

  private async _moveFile(args: MoveFileArgs): Promise<MoveFileResult> {
    const validSourcePath = await this.validatePath(args.source);
    const validDestPath = await this.validatePath(args.destination);
    await this.fileSystem.rename(validSourcePath, validDestPath);
    return {
      success: true,
      message: `Successfully moved ${args.source} to ${args.destination}`,
    };
  }


}