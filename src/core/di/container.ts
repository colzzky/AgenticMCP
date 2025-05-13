import { DI_TOKENS } from "./tokens"

/**
 * @file Simple dependency injection container
 */

/**
 * Simple dependency injection container
 * Manages registered dependencies and their singleton instances
 */
export class DIContainer {
  private static instance: DIContainer;
  private dependencies: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();

  /**
   * Get singleton instance of the container
   */
  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Register a dependency with the container
   * @param token - Dependency token/identifier
   * @param dependency - The dependency implementation or factory
   */
  public register<T>(token: DI_TOKENS, dependency: T): void {
    this.dependencies.set(token, dependency);
  }

  /**
   * Get a dependency from the container
   * @param token - Dependency token/identifier
   * @returns The dependency implementation
   */
  public get<T>(token: DI_TOKENS): T {
    // Check if this is a singleton factory that hasn't been instantiated
    if (this.singletons.has(token)) {
      // If it's a singleton that hasn't been instantiated yet, return the factory
      if (this.singletons.get(token) === undefined) {
        return this.dependencies.get(token) as T;
      }
      // Otherwise return the singleton instance
      return this.singletons.get(token) as T;
    }

    // Get dependency definition
    const dependency = this.dependencies.get(token);
    if (!dependency) {
      throw new Error(`Dependency not found: ${token}`);
    }

    return dependency as T;
  }

  /**
   * Register a singleton factory with the container
   * @param token - Dependency token/identifier
   * @param factory - Factory function to create the singleton
   */
  public registerSingleton<T>(token: DI_TOKENS, factory: () => T): void {
    this.dependencies.set(token, factory);

    // Create singleton instance lazily when requested
    this.singletons.set(token, undefined); // Reserve the slot
  }

  /**
   * Get a singleton from the container, creating it if needed
   * @param token - Dependency token/identifier
   * @returns The singleton instance
   */
  public getSingleton<T>(token: DI_TOKENS): T {
    if (!this.singletons.has(token)) {
      throw new Error(`Singleton not registered: ${token}`);
    }

    // Create singleton instance if not already created
    if (this.singletons.get(token) === undefined) {
      const factory = this.dependencies.get(token) as () => T;
      this.singletons.set(token, factory());
    }

    return this.singletons.get(token) as T;
  }

  /**
   * Clear all registered dependencies and singletons
   * Useful for testing
   */
  public clear(): void {
    this.dependencies.clear();
    this.singletons.clear();
  }
}
