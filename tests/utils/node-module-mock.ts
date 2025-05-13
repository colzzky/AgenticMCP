/**
 * @file Specialized mocking utilities for Node.js built-in modules in ESM
 */

import { jest } from '@jest/globals';
import { mockDeep, MockProxy } from 'jest-mock-extended';

/**
 * Interface for node:fs/promises module
 */
export interface FsPromises {
  access: (path: string, mode?: number) => Promise<void>;
  stat: (path: string) => Promise<any>;
  readFile: (path: string, options?: any) => Promise<any>;
  writeFile: (path: string, data: string, options?: any) => Promise<void>;
  readdir: (path: string) => Promise<any[]>;
  unlink: (path: string) => Promise<void>;
  mkdir: (path: string, options?: any) => Promise<void>;
  rmdir: (path: string, options?: any) => Promise<void>;
  rm: (path: string, options?: any) => Promise<void>;
  constants: {
    R_OK: number;
    W_OK: number;
    F_OK: number;
  };
}

/**
 * Interface for node:os module
 */
export interface OsModule {
  platform: () => string;
  homedir: () => string;
  tmpdir: () => string;
  EOL: string;
  userInfo: () => any;
  // Add other methods as needed
}

/**
 * Setup mock for node:fs/promises module that works with ES modules
 * This creates a mock that correctly handles both named exports and the compatibility
 * issue with default exports in Node.js modules.
 * 
 * Usage:
 * ```
 * // In your test file
 * let mockFs: ReturnType<typeof setupNodeFsMock>;
 * 
 * beforeAll(async () => {
 *   mockFs = setupNodeFsMock();
 *   
 *   // Register the mock before any imports
 *   jest.unstable_mockModule('node:fs/promises', () => mockFs);
 *   
 *   // Then import your module that uses fs
 *   ({ YourClass } = await import('../../src/your-module'));
 * });
 * ```
 */
export function setupNodeFsMock(): FsPromises {
  const mock = mockDeep<FsPromises>();

  // Set up common implementations with proper types
  mock.readFile.mockImplementation((path, options) => {
    // Handle options.encoding to return string vs Buffer correctly
    if (options && typeof options === 'object' && 'encoding' in options) {
      return Promise.resolve('mock file content');
    }
    return Promise.resolve(Buffer.from('mock file content'));
  });

  // Set up constants that are needed
  mock.constants = {
    R_OK: 4,
    W_OK: 2,
    F_OK: 0
  };

  return mock;
}

/**
 * Setup mock for node:os module that works with ES modules
 * 
 * Usage:
 * ```
 * // In your test file
 * let mockOs: ReturnType<typeof setupNodeOsMock>;
 * 
 * beforeAll(async () => {
 *   mockOs = setupNodeOsMock();
 *   
 *   // Register the mock before any imports
 *   jest.unstable_mockModule('node:os', () => mockOs);
 *   
 *   // Then import your module that uses os
 *   ({ YourClass } = await import('../../src/your-module'));
 * });
 * ```
 */
export function setupNodeOsMock(): OsModule {
  const mock = mockDeep<OsModule>();

  // Set up default implementations
  mock.platform.mockReturnValue('darwin');
  mock.homedir.mockReturnValue('/mock/home/dir');
  mock.tmpdir.mockReturnValue('/mock/tmp/dir');
  mock.EOL = '\n';
  mock.userInfo.mockReturnValue({ 
    username: 'mockuser',
    uid: 1000,
    gid: 1000,
    shell: '/bin/bash',
    homedir: '/mock/home/dir'
  });

  return mock;
}

/**
 * Creates a mock logger module that can be used with ESM imports
 */
export function setupLoggerMock() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    setLogLevel: jest.fn()
  };
}