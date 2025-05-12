import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Minimatch } from 'minimatch';
import type { Logger } from '../core/types/logger.types';
import { getLocalCliToolDefinitions } from './localCliToolDefinitions';
import type { Tool } from '../core/types/provider.types';
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
}

/**
 * Simple logger interface. You can plug in winston or another logger.
 */
/**
 * Main class providing controlled filesystem operations.
 */
export class LocalCliTool {
    private baseDir: string;
    private allowedCommands: Set<string>;
    private logger: Logger;
    private commandMap: LocalCliCommandMap;

    /**
     * Gets the available commands in this LocalCliTool instance.
     * Used for tool registration and integration with LLM providers.
     * @returns The command map with available commands and their handlers.
     */
    public getCommandMap(): Readonly<LocalCliCommandMap> {
        return this.commandMap;
    }

    constructor(config: LocalCliToolConfig, logger: Logger) {
        if (!config.baseDir) throw new Error("'baseDir' must be specified in the configuration.");
        if (!path.isAbsolute(config.baseDir)) throw new Error("'baseDir' must be an absolute path.");

        this.baseDir = path.resolve(config.baseDir);
        this.allowedCommands = new Set(config.allowedCommands || []);
        this.logger = logger;

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

        this.logger.info(`LocalCliTool initialized. Base directory: ${this.baseDir}, Allowed commands: ${[...this.allowedCommands]}`);
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
            }
            throw new Error('Unknown error occurred');
        }
    }

    /**
     * Resolves a relative path against cwd or baseDir and ensures it stays within baseDir.
     */
    private resolveAndValidatePath(rel: string): string {
        const resolved = path.resolve(this.baseDir, rel);
        if (!resolved.startsWith(this.baseDir + path.sep) && resolved !== this.baseDir) {
            throw new Error(`Access denied: Path '${rel}' is outside of baseDir.`);
        }
        return resolved;
    }

    /** Create directory recursively */
    private async _createDirectory(args: CreateDirectoryArgs): Promise<CreateDirectoryResult> {
        const target = this.resolveAndValidatePath(args.path);
        try {
            await fs.mkdir(target, { recursive: true });
            return { success: true };
        } catch {
            return { success: false };
        }
    }

    /** Write text to file (overwrites) */
    private async _writeFile(args: WriteFileArgs): Promise<WriteFileResult> {
        const target = this.resolveAndValidatePath(args.path);
        try {
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, args.content, 'utf8');
            return { success: true };
        } catch {
            return { success: false };
        }
    }

    /** Read and return file contents */
    private async _readFile(args: ReadFileArgs): Promise<ReadFileResult> {
        const target = this.resolveAndValidatePath(args.path);
        try {
            const content = await fs.readFile(target, 'utf8');
            return { content };
        } catch {
            return { content: '' };
        }
    }

    /** Delete file (requires confirm=true) */
    private async _deleteFile(args: DeleteFileArgs): Promise<DeleteFileResult> {
        const target = this.resolveAndValidatePath(args.path);
        try {
            await fs.unlink(target);
            return { success: true };
        } catch {
            return { success: false };
        }
    }

    /** Delete directory, recursive or only if empty */
    private async _deleteDirectory(args: DeleteDirectoryArgs): Promise<DeleteDirectoryResult> {
        const target = this.resolveAndValidatePath(args.path);
        try {
            await fs.rm(target, { recursive: true, force: true });
            return { success: true };
        } catch {
            return { success: false };
        }
    }

    /** List directory contents */
    private async _listDirectory(args: ListDirectoryArgs): Promise<ListDirectoryResult> {
        const rel = args.path || '.';
        const target = this.resolveAndValidatePath(rel);
        const entries: DirectoryEntry[] = [];
        const items = await fs.readdir(target, { withFileTypes: true });
        for (const item of items) {
            if (item.name.startsWith('.')) continue;
            const full = path.join(target, item.name);
            entries.push({ name: path.relative(this.baseDir, full), type: item.isDirectory() ? 'directory' : 'file' });
        }
        return { entries };
    }

    /** Search codebase for files containing a query */
    private async _searchCodebase(args: SearchCodebaseArgs): Promise<SearchCodebaseResult> {
        const results: FileSearchResult[] = [];
        const regex = new RegExp(args.query, 'i');
        const maxResults = 50;
        const recursive = args.recursive ?? false;
        const walk = async (dir: string) => {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                const full = path.join(dir, item.name);
                if (item.isDirectory()) {
                    if (recursive) await walk(full);
                } else {
                    const content = await fs.readFile(full, 'utf8').catch(() => '');
                    if (content) {
                        const lines = content.split(/\r?\n/);
                        for (const [i, lineRaw] of lines.entries()) {
                            if (regex.test(lineRaw)) {
                                let line = lineRaw.trim();
                                if (line.length > 200) line = line.slice(0, 197) + '...';
                                results.push({
                                    file: path.relative(this.baseDir, full),
                                    line_number: i + 1,
                                    line_content: line,
                                });
                                if (results.length >= maxResults) return;
                            }
                        }
                    }
                }
            }
        };
        await walk(this.baseDir);
        return { results };
    }

    /** Find files or directories matching glob patterns */
    private async _findFiles(args: FindFilesArgs): Promise<FindFilesResult> {
        const results: string[] = [];
        const recursive = args.recursive ?? false;
        const walk = async (dir: string) => {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                const full = path.join(dir, item.name);
                if (item.isDirectory()) {
                    if (recursive) await walk(full);
                } else {
                    // eslint-disable-next-line unicorn/prefer-regexp-test
                    if (new Minimatch(args.pattern).match(item.name)) {
                        results.push(path.relative(this.baseDir, full));
                    }
                }
            }
        };
        await walk(this.baseDir);
        return { files: results };
    }
}
