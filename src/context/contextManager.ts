import type { PathDI, FileSystemDI } from '../global.types';
import { Minimatch } from 'minimatch';
import {
  ContextManager,
  ContextSource,
  ContextItem,
  ContextProcessor
} from '../core/types/context.types';

/**
 * File-based implementation of ContextManager for loading context from the local filesystem.
 */
export class FileContextManager implements ContextManager {
  private sources: ContextSource[] = [];
  private items: ContextItem[] = [];
  private processors: ContextProcessor[] = [];

  pathDI: PathDI;
  fileSystemDI: FileSystemDI;

  /**
   * Creates a new FileContextManager with dependency injection
   * @param pathDI - Path DI instance
   * @param fileSystemDI - File system DI instance
   */
  constructor(pathDI: PathDI, fileSystemDI: FileSystemDI) {
    this.pathDI = pathDI;
    this.fileSystemDI = fileSystemDI;
  }

  /**
   * Add a context source (directory or file).
   * @param source - The context source to add.
   */
  async addSource(source: ContextSource): Promise<void> {
    this.sources.push(source);
    const newItems = await this.loadSource(source);
    this.items.push(...newItems);
  }

  /**
   * Add a context processor to the pipeline.
   */
  addProcessor(processor: ContextProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Loads and processes all context items from the added sources.
   */
  async loadContext(): Promise<void> {
    this.items = [];
    for (const source of this.sources) {
      const loaded = await this.loadSource(source);
      this.items.push(...loaded);
    }
    for (const processor of this.processors) {
      const processed: ContextItem[] = [];
      for (const item of this.items) {
        const result = await processor.process(item);
        if (Array.isArray(result)) {
          processed.push(...result);
        } else {
          processed.push(result);
        }
      }
      this.items = processed;
    }
  }

  /**
   * Get all loaded context items.
   */
  async getContextItems(): Promise<ContextItem[]> {
    return this.items;
  }

  /**
   * Get a specific context item by ID.
   */
  async getContextItemById(id: string): Promise<ContextItem | undefined> {
    return this.items.find(item => item.id === id);
  }

  /**
   * Remove all sources and context items.
   */
  async clearContext(): Promise<void> {
    this.sources = [];
    this.items = [];
    this.processors = [];
  }

  /**
   * Returns the total number of tokens for all loaded context items.
   */
  async getTotalTokens(): Promise<number> {
    return this.items.reduce((sum, item) => sum + (item.tokens ?? 0), 0);
  }

  /**
   * Loads context items from a given source (file or directory).
   */
  private async loadSource(source: ContextSource): Promise<ContextItem[]> {
    const stat = await this.fileSystemDI.stat(source.path);
    return stat.isDirectory()
      ? this.loadFromDirectory(source)
      : [await this.loadFromFile(source.path)];
  }

  /**
   * Loads context items from a directory, respecting glob patterns and recursion.
   */
  private async loadFromDirectory(source: ContextSource): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    const recursive = source.recursive ?? false;
    const maxDepth = source.maxDepth ?? 5;
    const patterns = source.globPatterns?.length ? source.globPatterns : ['**/*'];

    const walk = async (dir: string, depth: number) => {
      if (depth > maxDepth) return;
      const entries = await this.fileSystemDI.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = this.pathDI.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (recursive) await walk(fullPath, depth + 1);
        } else {
          if (patterns.some(pattern => new Minimatch(pattern).match(entry.name))) {
            items.push(await this.loadFromFile(fullPath));
          }
        }
      }
    };
    await walk(source.path, 0);
    return items;
  }

  /**
   * Loads a single file as a context item.
   */
  private async loadFromFile(filePath: string): Promise<ContextItem> {
    const content = await this.fileSystemDI.readFile(filePath, 'utf8');
    const stat = await this.fileSystemDI.stat(filePath);
    return {
      id: filePath,
      type: this.detectType(filePath),
      sourcePath: filePath,
      content,
      metadata: {
        extension: this.pathDI.extname(filePath),
        size: stat.size,
      },
    };
  }

  /**
   * Simple file type detection based on extension.
   */
  private detectType(filePath: string): string {
    const ext = this.pathDI.extname(filePath).toLowerCase();
    switch (ext) {
      case '.md': {
        return 'markdown';
      }
      case '.json': {
        return 'json';
      }
      case '.txt': {
        return 'text';
      }
      default: {
        return 'unknown';
      }
    }
  }
}

export default FileContextManager;
