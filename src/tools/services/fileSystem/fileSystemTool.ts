import type { Logger } from '../../../core/types/logger.types';
import { getFileSystemToolDefinitions } from './fileSystemToolDefinitions';
import type { ToolDefinition, FileSystemToolConfig } from '../../types';
import type { Tool } from '../../../core/types/provider.types';
import type { IFileSystem } from '../../../core/interfaces/file-system.interface';
import type { IDiffService } from '../../../core/interfaces/diff-service.interface';
import type { PathDI } from '../../../types/global.types';
import type { LocalCliCommandMap } from '../../../core/types/cli.types';
import {
  createDirectory,
  getDirectoryTree,
  getFileInfo,
  listDirectory,
  deleteDirectory
} from './handlers/directory';
import {
  writeFile,
  editFile,
  readFile,
  deleteFile,
  readMultipleFiles
} from './handlers/file';
import { moveFile } from './handlers/move';
import { searchCodebase, findFiles } from './handlers/search';
import { expandHome, resolveAndValidatePath } from './helpers/pathHelpers';

export * from '../../types';

export class FileSystemTool {
  private baseDir: string;
  private allowedCommands: Set<string>;
  private allowFileOverwrite: boolean;
  private logger: Logger;
  private fileSystem: IFileSystem;
  private diffService: IDiffService;
  private pathDI: PathDI;
  private commandMap: LocalCliCommandMap;

  constructor(
    config: FileSystemToolConfig,
    logger: Logger,
    fileSystem: IFileSystem,
    diffService: IDiffService,
    pathDI: PathDI
  ) {
    config.baseDir = config.baseDir || pathDI.resolve(process.cwd());
    if (!pathDI.isAbsolute(config.baseDir)) throw new TypeError("'baseDir' must be an absolute path.");

    this.baseDir = pathDI.resolve(config.baseDir);
    this.allowedCommands = new Set(config.allowedCommands || []);
    this.allowFileOverwrite = config.allowFileOverwrite ?? false;
    this.logger = logger;
    this.fileSystem = fileSystem;
    this.diffService = diffService;
    this.pathDI = pathDI;

    this.commandMap = {
      create_directory: (args) => createDirectory(this, args),
      get_directory_tree: (args) => getDirectoryTree(this, args),
      get_file_info: (args) => getFileInfo(this, args),
      read_multiple_files: (args) => readMultipleFiles(this, args),
      write_file: (args) => writeFile(this, args),
      edit_file: (args) => editFile(this, args),
      move_file: (args) => moveFile(this, args),
      read_file: (args) => readFile(this, args),
      delete_file: (args) => deleteFile(this, args),
      delete_directory: (args) => deleteDirectory(this, args),
      list_directory: (args) => listDirectory(this, args),
      search_codebase: (args) => searchCodebase(this, args),
      find_files: (args) => findFiles(this, args),
    };

    this.logger.debug(`FileSystemTool initialized with baseDir: ${this.baseDir}`);

  }

  public setBaseDir(baseDir: string): void {
    this.baseDir = baseDir;
  }

  public setAllowFileOverwrite(allowFileOverwrite: boolean): void {
    this.allowFileOverwrite = allowFileOverwrite;
  }

  public getCommandMap(): Readonly<LocalCliCommandMap> {
    return this.commandMap;
  }

  public getTools(): Tool[] {
    return getFileSystemToolDefinitions();
  }

  public getToolDefinitions(): ToolDefinition[] {
    const toolDefinitions = getFileSystemToolDefinitions();
    return toolDefinitions.map((tool: Tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.parameters,
      },
    }));
  }

  public async execute<C extends keyof LocalCliCommandMap>(
    command: C,
    args: any
  ): Promise<Awaited<ReturnType<LocalCliCommandMap[C]>>> {
    const handler = this.commandMap[command];
    if (!handler) throw new Error(`Unknown command: ${String(command)}`);
    try {
      return await handler(args) as Awaited<ReturnType<LocalCliCommandMap[C]>>;
    } catch (error) {
      this.logger.error(`Error in ${String(command)}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // --- These allow friend handlers access to private members (bad: TS can't do package-private) ---
  _expandHome(path: string) { return expandHome(this, path); }
  _resolveAndValidatePath(rel: string) { return resolveAndValidatePath(this, rel); }
  get _baseDir() { return this.baseDir; }
  get _fileSystem() { return this.fileSystem; }
  get _logger() { return this.logger; }
  get _diffService() { return this.diffService; }
  get _pathDI() { return this.pathDI; }
  get _allowFileOverwrite() { return this.allowFileOverwrite; }
}
