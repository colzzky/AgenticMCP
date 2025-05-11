// src/core/types/context.types.ts

/**
 * Represents a single item of context, such as a file or a web page.
 */
export interface ContextItem {
  id: string; // Unique identifier for the context item
  type: 'file' | 'url' | 'text' | 'code_snippet' | string; // Type of the context item
  sourcePath?: string; // Original path or URL of the item, if applicable
  content: string; // The actual content of the item
  metadata?: Record<string, any>; // Any additional metadata (e.g., language for code, last modified date)
  tokens?: number; // Optional: Number of tokens, if pre-calculated
}

/**
 * Defines a source from which context items can be retrieved.
 * Examples: a local directory, a Git repository URL, a list of URLs.
 */
export interface ContextSource {
  type: 'directory' | 'git_repository' | 'url_list' | 'file_list' | string;
  path: string; // Path to the directory, URL of the repo, or identifier for the list
  globPatterns?: string[]; // Optional: Glob patterns to include/exclude files from a directory
  recursive?: boolean; // Optional: Whether to search recursively in a directory
  maxDepth?: number; // Optional: Max depth for recursive search
}

/**
 * Interface for a context processor that can transform or enrich context items.
 */
export interface ContextProcessor {
  process(item: ContextItem): Promise<ContextItem | ContextItem[]>;
}

/**
 * Defines the interface for a Context Manager.
 * Responsible for loading, processing, and providing context items.
 */
export interface ContextManager {
  /**
   * Adds a context source to the manager.
   * @param source - The context source to add.
   */
  addSource(source: ContextSource): Promise<void>;

  /**
   * Adds a context processor to the pipeline.
   * @param processor - The context processor to add.
   */
  addProcessor(processor: ContextProcessor): void;

  /**
   * Loads and processes all context items from the added sources.
   * @returns A promise that resolves when all context is loaded and processed.
   */
  loadContext(): Promise<void>;

  /**
   * Retrieves all loaded context items.
   * @returns An array of context items.
   */
  getContextItems(): ContextItem[];

  /**
   * Retrieves a specific context item by its ID.
   * @param id - The ID of the context item to retrieve.
   * @returns The context item if found, otherwise undefined.
   */
  getContextItemById(id: string): ContextItem | undefined;

  /**
   * Clears all loaded context items and sources.
   */
  clearContext(): void;

  /**
   * Returns the total number of tokens for all loaded context items.
   * (Requires token calculation during processing or on-demand)
   */
  getTotalTokens(): Promise<number>;
}
