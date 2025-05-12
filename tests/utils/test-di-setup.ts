/**
 * @file Test utilities for dependency injection setup
 * Provides functions to create test containers with mock implementations
 */

import { jest } from '@jest/globals';
import { DIContainer } from '../../src/core/di/container';
import { DI_TOKENS } from '../../src/core/di/tokens';
import { IFileSystem } from '../../src/core/interfaces/file-system.interface';
import { TestFileSystem } from './test-fs.adapter';
import { DIFilePathProcessor } from '../../src/context/di-file-path-processor';
import type { Logger } from '../../src/core/types/logger.types';

/**
 * Mock logger implementation for testing
 */
export class TestLogger implements Logger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  getLastLog(level: 'debug' | 'info' | 'warn' | 'error'): string {
    const calls = this[level].mock.calls;
    if (calls.length > 0) {
      return calls[calls.length - 1][0] as string;
    }
    return '';
  }
}

/**
 * Create a test DI container with mock implementations
 * @returns Test DI container instance
 */
// Store an instance of TestFileSystem to be shared across tests
let sharedTestFileSystem: TestFileSystem;

export function createTestContainer(): DIContainer {
  // Get the container instance but clear it for testing
  const container = DIContainer.getInstance();
  container.clear(); // Clear any existing registrations
  
  // Create test implementations
  const testLogger = new TestLogger();
  
  // Create or reuse the test file system instance
  if (!sharedTestFileSystem) {
    sharedTestFileSystem = new TestFileSystem();
  } else {
    // Reset the file system state for a fresh test
    sharedTestFileSystem.reset();
  }
  
  // Register test implementations
  container.register(DI_TOKENS.LOGGER, testLogger);
  container.register(DI_TOKENS.FILE_SYSTEM, sharedTestFileSystem);
  
  // Register file path processor
  container.register(DI_TOKENS.FILE_PATH_PROCESSOR, new DIFilePathProcessor(
    testLogger,
    sharedTestFileSystem
  ));
  
  return container;
}

/**
 * Test DI container utility class
 * Provides a fluent interface for test setup
 */
export class TestDIContainer {
  public readonly container: DIContainer;
  
  constructor() {
    this.container = createTestContainer();
  }
  
  /**
   * Get the test file system implementation
   * @returns The test file system instance
   */
  getFileSystem(): TestFileSystem {
    return this.container.get(DI_TOKENS.FILE_SYSTEM) as TestFileSystem;
  }
  
  /**
   * Get the test logger implementation
   * @returns The test logger instance
   */
  getLogger(): TestLogger {
    return this.container.get(DI_TOKENS.LOGGER) as TestLogger;
  }
  
  /**
   * Add a test file to the mock file system
   * @param path - File path
   * @param content - File content
   * @returns This instance for chaining
   */
  withFile(path: string, content: string): TestDIContainer {
    const fs = this.getFileSystem();
    fs.addFile(path, content);
    return this;
  }
  
  /**
   * Add a test directory to the mock file system
   * @param path - Directory path
   * @returns This instance for chaining
   */
  withDirectory(path: string): TestDIContainer {
    const fs = this.getFileSystem();
    fs.addDirectory(path);
    return this;
  }
  
  /**
   * Register a mock implementation for a DI token
   * @param token - DI token
   * @param implementation - Mock implementation
   * @returns This instance for chaining
   */
  withMock(token: string, implementation: unknown): TestDIContainer {
    this.container.register(token, implementation);
    return this;
  }
  
  /**
   * Register a mock singleton implementation for a DI token
   * @param token - DI token
   * @param factory - Factory function that returns the mock implementation
   * @returns This instance for chaining
   */
  withSingletonMock(token: string, factory: () => unknown): TestDIContainer {
    this.container.registerSingleton(token, factory);
    return this;
  }
}
