// src/core/types/context.types.ts

/**
 * Represents a single item of context, such as a file or a web page.
 */
export interface ContextItem {
  id: string; // Unique identifier for the context item
  type: string; // Type of the context item
  sourcePath?: string; // Original path or URL of the item, if applicable
  content: string; // The actual content of the item
  metadata?: Record<string, unknown>; // Any additional metadata (e.g., language for code, last modified date)
  tokens?: number; // Optional: Number of tokens, if pre-calculated
}

/**
 * Defines a source from which context items can be retrieved.
 * Examples: a local directory, a Git repository URL, a list of URLs.
 */
export interface ContextSource {
  type: string; // Type of the context source
  path: string; // Path to the directory, URL of the repo, or identifier for the list
  globPatterns?: string[]; // Optional: Glob patterns to include/exclude files from a directory
  recursive?: boolean; // Optional: Whether to search recursively in a directory
  maxDepth?: number; // Optional: Max depth for recursive search
}

/**
 * Interface for a context processor that can transform or enrich context items.
 */
export interface ContextProcessor {
  process(item: ContextItem): Promise<ContextItem | ContextItem[]>; // No 'any' used
}

/**
 * Defines the interface for a Context Manager.
 * Responsible for loading, processing, and providing context items.
 */
export interface ContextManager { // No 'any' used
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
   * @returns A promise that resolves to an array of context items.
   */
  getContextItems(): Promise<ContextItem[]>;

  /**
   * Retrieves a specific context item by its ID.
   * @param id - The ID of the context item to retrieve.
   * @returns A promise that resolves to the context item if found, otherwise undefined.
   */
  getContextItemById(id: string): Promise<ContextItem | undefined>;

  /**
   * Clears all loaded context items and sources.
   * @returns A promise that resolves when context is cleared.
   */
  clearContext(): Promise<void>;

  /**
   * Returns the total number of tokens for all loaded context items.
   * (Requires token calculation during processing or on-demand)
   */
  getTotalTokens(): Promise<number>;
}
