/**
 * @file Shared test utilities and setup for ES module testing
 */

import { jest } from '@jest/globals';

/**
 * Helper to mock console methods for testing
 */
export function mockConsole() {
  const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
  const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  
  return {
    info: mockConsoleInfo,
    warn: mockConsoleWarn,
    error: mockConsoleError,
    log: mockConsoleLog,
    
    // Helper to restore all mocks
    restore: () => {
      mockConsoleInfo.mockRestore();
      mockConsoleWarn.mockRestore();
      mockConsoleError.mockRestore();
      mockConsoleLog.mockRestore();
    }
  };
}

/**
 * Resets Jest modules and calls any additional cleanup functions
 */
export function resetTestEnvironment() {
  jest.resetModules();
  // Add any additional cleanup here
}

/**
 * Helper to create temporary values for testing
 * @param value The value to reset after test
 * @returns Object with methods to get the original value, set it for testing, and restore it
 */
export function makeTempValue<T>(value: T) {
  const original = value;
  
  return {
    get: () => original,
    set: (newValue: T) => {
      value = newValue;
    },
    restore: () => {
      value = original;
    }
  };
}

/**
 * Default mock for the logger
 */
export function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };
}

/**
 * Helper for mocking process.env values
 * @param envVars Key-value pairs of environment variables to mock
 * @returns Function to restore the original values
 */
export function mockEnv(envVars: Record<string, string>) {
  const originalEnv = { ...process.env };
  
  // Set mocked values
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  // Return function to restore original values
  return () => {
    Object.keys(envVars).forEach(key => {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  };
}

/**
 * Helper to mock fs/promises for ESM compatibility
 */
export function mockFsPromises() {
  return {
    access: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn(),
    rm: jest.fn(),
    constants: {
      R_OK: 4,
      W_OK: 2,
      F_OK: 0
    }
  };
}

/**
 * A mock keytar implementation
 */
export const mockKeytar = {
  getPassword: jest.fn(),
  setPassword: jest.fn(),
  deletePassword: jest.fn(),
  findCredentials: jest.fn()
};

// ----- ENHANCED ES MODULE MOCKING UTILITIES -----

/**
 * Type for the module factory function
 */
type ModuleFactory = () => any;

/**
 * Store of module mocks for tracking and cleanup
 */
const moduleRegistry = new Map<string, { mock: any, factory?: ModuleFactory }>();

/**
 * Enhanced module mocker for ES modules
 * This provides a unified way to mock modules that works in both test environments
 * 
 * @param modulePath Path to the module to mock
 * @param mockImplementation Mock implementation object or factory function
 * @param options Additional mocking options
 * @returns Function to reset the mock
 */
export function mockESModule(
  modulePath: string, 
  mockImplementation: any | ModuleFactory,
  options: { 
    virtual?: boolean,
    isESM?: boolean,
    factory?: boolean 
  } = {}
) {
  // Clear any existing mock for this module path
  jest.unmock(modulePath);
  
  const mockObj = typeof mockImplementation === 'function' && !options.factory
    ? mockImplementation()
    : mockImplementation;

  // Store the mock in our registry for later access
  moduleRegistry.set(modulePath, { 
    mock: mockObj,
    factory: options.factory ? mockImplementation as ModuleFactory : undefined
  });

  // For ES modules, use unstable_mockModule
  if (options.isESM) {
    // If it's a factory function and factory option is true, use the function directly
    if (typeof mockImplementation === 'function' && options.factory) {
      jest.unstable_mockModule(modulePath, mockImplementation as ModuleFactory);
    } else {
      // Otherwise, create a factory that returns the mockObj
      jest.unstable_mockModule(modulePath, () => mockObj);
    }
  } else {
    // For CommonJS modules, use jest.mock
    jest.mock(modulePath, () => mockObj, { virtual: options.virtual });
  }

  // Return a function to reset this specific mock
  return () => {
    jest.unmock(modulePath);
    moduleRegistry.delete(modulePath);
  };
}

/**
 * Get a mock from the registry
 * 
 * @param modulePath Path to the module
 * @returns The mock object or undefined if not found
 */
export function getMockedModule(modulePath: string) {
  return moduleRegistry.get(modulePath)?.mock;
}

/**
 * Clear all registered mocks
 * This should be called in beforeEach or afterEach
 */
export function clearAllMockedModules() {
  moduleRegistry.forEach((_, path) => {
    jest.unmock(path);
  });
  moduleRegistry.clear();
}

/**
 * Helper to create dynamic ES module mocks at test time
 * This is useful for mocking complex modules with circular dependencies
 * 
 * @param modulePath Path to the module to mock
 * @param moduleFactory Factory function that returns the module implementation
 */
export async function dynamicESModuleMock<T = any>(
  modulePath: string,
  moduleFactory: () => T
): Promise<T> {
  // Clean up any existing mocks first
  jest.unmock(modulePath);
  
  // Create the mock using unstable_mockModule
  jest.unstable_mockModule(modulePath, moduleFactory);
  
  // Force Jest to re-evaluate the module and use our mock
  jest.resetModules();
  
  // Import the mocked module
  const mockedModule = await import(modulePath) as T;
  return mockedModule;
}

/**
 * Mock node:fs/promises module
 * This provides a complete mock of the fs/promises module with type checking
 */
export function setupFsPromisesMock() {
  const fsMock = mockFsPromises();
  
  // Mock using both approaches to ensure compatibility
  mockESModule('node:fs/promises', fsMock, { virtual: true });
  jest.unstable_mockModule('node:fs/promises', () => fsMock);
  
  return fsMock;
}

/**
 * Mock keytar module
 * This provides a complete mock of the keytar module with all necessary methods
 */
export function setupKeytarMock() {
  const keytarMock = {
    getPassword: jest.fn(),
    setPassword: jest.fn(),
    deletePassword: jest.fn(),
    findCredentials: jest.fn()
  };
  
  // Mock using both approaches to ensure compatibility
  mockESModule('keytar', keytarMock, { virtual: true });
  jest.unstable_mockModule('keytar', () => keytarMock);
  
  return keytarMock;
}

/**
 * This function helps create ESM-compatible Jest spy factories
 * It wraps the unstable_mockModule API to make it easier to use
 * 
 * @example
 * // In your test file
 * const myServiceMock = createModuleSpy('../path/to/service', {
 *   myMethod: jest.fn().mockReturnValue('mock result')
 * });
 * 
 * // Test with the mock
 * expect(myServiceMock.myMethod).toHaveBeenCalledWith('some arg');
 */
export async function createModuleSpy<T extends Record<string, any>>(
  modulePath: string, 
  spies: Partial<T>
): Promise<T> {
  // Create factory function to generate the mock
  const mockFactory = () => spies;
  
  // Use unstable_mockModule to set up the mock
  jest.unstable_mockModule(modulePath, mockFactory);
  
  // Clear module cache and reimport the mocked module
  jest.resetModules();
  const mockedModule = await import(modulePath) as T;
  
  return mockedModule;
}

/**
 * Example usage pattern to include in your test files:
 *
 * ```typescript
 * // At the top of your test file
 * import { jest } from '@jest/globals';
 * import { setupFsPromisesMock, setupKeytarMock, dynamicESModuleMock } from '../utils/test-setup';
 * 
 * // Mock modules before importing the code that uses them
 * const mockFs = setupFsPromisesMock();
 * const mockKeytar = setupKeytarMock();
 * 
 * // Then in your tests
 * beforeEach(() => {
 *   jest.resetModules();
 *   jest.clearAllMocks();
 *   
 *   // Reset your mocks
 *   mockFs.readFile.mockReset();
 *   mockKeytar.getPassword.mockReset();
 * });
 * 
 * // For dynamic mocks that need to be created at test time
 * it('should do something', async () => {
 *   const myMock = await dynamicESModuleMock('./path/to/module', () => ({
 *     myFunction: jest.fn().mockReturnValue('mock result')
 *   }));
 *   
 *   // Test with myMock
 * });
 * ```
 */