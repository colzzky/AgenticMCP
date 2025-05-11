import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Minimatch } from 'minimatch';
import type { Logger } from '../core/types/logger.types';
import type { DirectoryEntry, FileSearchResult } from '../core/types/cli.types';
/**
 * Definition interfaces for exposing tool functions programmatically.
 */
export interface FunctionDefinition {
    name: string;
    description: string;
    parameters: Record<string, any>;
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
    private commandMap: Record<string, any>;

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
     */
    public getToolDefinitions(): ToolDefinition[] {
        const schemas: Record<string, any> = {
            create_directory: {
                description: 'Creates a new directory at the specified path.',
                parameters: {
                    type: 'object',
                    properties: { path: { type: 'string', description: 'Relative path for directory.' } },
                    required: ['path'],
                },
            },
            write_file: {
                description: 'Writes content to a specified file.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path for file.' },
                        content: { type: 'string', description: 'Text content to write.' },
                    },
                    required: ['path', 'content'],
                },
            },
            read_file: {
                description: 'Reads the content of a specified file.',
                parameters: {
                    type: 'object',
                    properties: { path: { type: 'string', description: 'Relative path for file.' } },
                    required: ['path'],
                },
            },
            delete_file: {
                description: 'Deletes a specified file (needs confirm flag).',
                parameters: {
                    type: 'object',
                    properties: { path: { type: 'string' }, confirm: { type: 'boolean', default: false } },
                    required: ['path'],
                },
            },
            delete_directory: {
                description: 'Deletes a specified directory.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string' },
                        recursive: { type: 'boolean', default: true },
                    },
                    required: ['path'],
                },
            },
            list_directory: {
                description: 'Lists the contents of a specified directory.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', default: '.' },
                        recursive: { type: 'boolean', default: false },
                        show_hidden: { type: 'boolean', default: false },
                    },
                    required: [],
                },
            },
            search_codebase: {
                description: 'Searches for a text or regex within files.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        directory: { type: 'string', default: '.' },
                        file_patterns: { type: 'array', items: { type: 'string' }, default: ['*'] },
                        case_sensitive: { type: 'boolean', default: false },
                        max_results: { type: 'number', default: 50 },
                    },
                    required: ['query'],
                },
            },
            find_files: {
                description: 'Finds files or directories matching glob patterns.',
                parameters: {
                    type: 'object',
                    properties: {
                        patterns: { type: 'array', items: { type: 'string' }, default: ['*'] },
                        directory: { type: 'string', default: '.' },
                        file_type: { type: 'string', enum: ['file', 'directory', 'any'], default: 'any' },
                        recursive: { type: 'boolean', default: true },
                        max_depth: { type: 'number' },
                        max_results: { type: 'number', default: 50 },
                    },
                    required: ['patterns'],
                },
            },
        };

        return Object.entries(schemas)
            .filter(([name]) => name in this.commandMap)
            .map(([name, schema]) => ({ type: 'function', function: { name, description: schema.description, parameters: schema.parameters } }));
    }

    /**
     * Dispatches execution to the appropriate handler.
     */
    public async execute(
        command: string,
        args: string[] = [],
        cwd?: string,
        kwargs: Record<string, any> = {}
    ): Promise<any> {
        this.logger.debug(`Executing command: ${command}`, { args, kwargs });

        const handler = this.commandMap[command];
        if (!handler) {
            const error = `Unknown command '${command}'`;
            this.logger.error(error);
            return { success: false, error };
        }

        try {
            const result = await handler(cwd, kwargs);
            this.logger.debug(`Result for ${command}:`, result);
            return result;
        } catch (error: any) {
            this.logger.error(`Error in ${command}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Resolves a relative path against cwd or baseDir and ensures it stays within baseDir.
     */
    private resolveAndValidatePath(rel: string, cwd?: string): string {
        const base = cwd ? path.resolve(this.baseDir, cwd) : this.baseDir;
        const resolved = path.resolve(base, rel);
        if (!resolved.startsWith(this.baseDir + path.sep) && resolved !== this.baseDir) {
            throw new Error(`Access denied: Path '${rel}' is outside of baseDir.`);
        }
        return resolved;
    }

    /** Create directory recursively */
    private async _createDirectory(cwd: string | undefined, kwargs: { path: string }) {
        const target = this.resolveAndValidatePath(kwargs.path, cwd);
        try {
            await fs.mkdir(target, { recursive: true });
            return { success: true, path: target };
        } catch (error: any) {
            return { success: false, error: error.message, path: target };
        }
    }

    /** Write text to file (overwrites) */
    private async _writeFile(cwd: string | undefined, kwargs: { path: string; content: string }) {
        const target = this.resolveAndValidatePath(kwargs.path, cwd);
        try {
            await fs.mkdir(path.dirname(target), { recursive: true });
            const bytes = Buffer.from(kwargs.content, 'utf8').length;
            await fs.writeFile(target, kwargs.content, 'utf8');
            return { success: true, path: target, bytes_written: bytes };
        } catch (error: any) {
            return { success: false, error: error.message, path: target };
        }
    }

    /** Read and return file contents */
    private async _readFile(cwd: string | undefined, kwargs: { path: string }) {
        const target = this.resolveAndValidatePath(kwargs.path, cwd);
        try {
            const content = await fs.readFile(target, 'utf8');
            return { success: true, path: target, content };
        } catch (error: any) {
            return { success: false, error: error.message, path: target };
        }
    }

    /** Delete file (requires confirm=true) */
    private async _deleteFile(cwd: string | undefined, kwargs: { path: string; confirm?: boolean }) {
        const target = this.resolveAndValidatePath(kwargs.path, cwd);
        if (!kwargs.confirm) {
            return { success: false, error: 'File deletion not confirmed', path: target };
        }
        try {
            await fs.unlink(target);
            return { success: true, path: target };
        } catch (error: any) {
            return { success: false, error: error.message, path: target };
        }
    }

    /** Delete directory, recursive or only if empty */
    private async _deleteDirectory(
        cwd: string | undefined,
        kwargs: { path: string; recursive?: boolean }
    ) {
        const target = this.resolveAndValidatePath(kwargs.path, cwd);
        const recursive = kwargs.recursive ?? true;
        try {
            return recursive ? await fs.rm(target, { recursive: true, force: true }) : await fs.rmdir(target), { success: true, path: target };
        } catch (error: any) {
            return { success: false, error: error.message, path: target };
        }
    }

    /** List directory contents */
    private async _listDirectory(
        cwd: string | undefined,
        kwargs: { path?: string; recursive?: boolean; show_hidden?: boolean }
    ) {
        const rel = kwargs.path || '.';
        const target = this.resolveAndValidatePath(rel, cwd);
        const showHidden = kwargs.show_hidden ?? false;
        const recursive = kwargs.recursive ?? false;
        try {
            const entries: any[] = [];
            const walk = async (dir: string) => {
                const items = await fs.readdir(dir, { withFileTypes: true });
                for (const item of items) {
                    if (!showHidden && item.name.startsWith('.')) continue;
                    const full = path.join(dir, item.name);
                    entries.push({ name: path.relative(this.baseDir, full), type: item.isDirectory() ? 'directory' : 'file' });
                    if (recursive && item.isDirectory()) await walk(full);
                }
            };
            await walk(target);
            return { success: true, path: target, entries };
        } catch (error: any) {
            return { success: false, error: error.message, path: target };
        }
    }

    /** Search for text or regex in files under a directory */
    private async _searchCodebase(
        cwd: string | undefined,
        kwargs: {
            query: string;
            directory?: string;
            file_patterns?: string[];
            case_sensitive?: boolean;
            max_results?: number;
            recursive?: boolean;
        }
    ) {
        const dirRel = kwargs.directory || '.';
        const targetDir = this.resolveAndValidatePath(dirRel, cwd);
        const patterns = kwargs.file_patterns || ['*.*'];
        const maxResults = Math.min(kwargs.max_results ?? 50, 100);
        const flags = kwargs.case_sensitive ? '' : 'i';
        const regex = new RegExp(kwargs.query, flags);
        const results: any[] = [];
        let filesChecked = 0;

        const recursive = kwargs.recursive ?? true; 

        const walk = async (dir: string) => {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                if (['.git', '__pycache__', 'node_modules'].includes(item.name)) continue;
                const full = path.join(dir, item.name);
                if (patterns.some(pat => new Minimatch(pat).match(item.name))) {
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
                if (!recursive || !item.isDirectory()) return;
                await walk(full);
            }
        };
        try {
            await walk(targetDir);
            return { success: true, results, truncated: results.length >= maxResults };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /** Find files matching patterns */
    private async _findFiles(
        cwd: string | undefined,
        kwargs: {
            patterns: string[];
            directory?: string;
            file_type?: 'file' | 'directory' | 'any';
            recursive?: boolean;
            max_depth?: number;
            max_results?: number;
        }
    ) {
        const dirRel = kwargs.directory || '.';
        const targetDir = this.resolveAndValidatePath(dirRel, cwd);
        const patterns = kwargs.patterns;
        const recursive = kwargs.recursive ?? true;
        const maxDepth = kwargs.max_depth;
        const maxResults = Math.min(kwargs.max_results ?? 50, 100);
        const fileType = kwargs.file_type || 'any';
        const results: any[] = [];

        const walk = async (dir: string, depth = 0) => {
            if (maxDepth !== undefined && depth > maxDepth) return;
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                if (['.git', 'dist', 'node_modules'].includes(item.name)) continue;
                const full = path.join(dir, item.name);
                const isDir = item.isDirectory();
                if (patterns.some(pat => new Minimatch(pat).match(item.name)) &&
                    (fileType === 'any' ||
                        (fileType === 'file' && !isDir) ||
                        (fileType === 'directory' && isDir))
                ) {
                    const info: any = { path: path.relative(this.baseDir, full), type: isDir ? 'directory' : 'file' };
                    if (!isDir) {
                        const stat = await fs.stat(full).catch(() => '');
                        if (stat && typeof stat !== 'string') {
                            info.size_bytes = stat.size;
                        }
                    }
                    results.push(info);
                    if (results.length >= maxResults) return;
                }
                if (!recursive || !isDir) return;
                await walk(full, depth + 1);
            }
        };
        try {
            await walk(targetDir, 0);
            return { success: true, results, truncated: results.length >= maxResults };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
