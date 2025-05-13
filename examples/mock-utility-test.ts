/**
 * @file Example of correct ES module mocking techniques
 */

import { jest } from '@jest/globals';

/**
 * CORRECT: How to mock a Node.js built-in module
 */
function mockNodeModuleCorrectly() {
  jest.mock('node:path', () => {
    // Use the actual node implementation as a base
    const originalPath = jest.requireActual('path');
    
    // Return an object with all properties from the original module
    // plus any overrides for specific methods
    return {
      ...originalPath,
      resolve: jest.fn((...args) => args.join('/')),
      join: jest.fn((...args) => args.join('/')),
      isAbsolute: jest.fn((path) => path.startsWith('/'))
    };
  });
}

/**
 * INCORRECT: How NOT to mock a Node.js module 
 */
function mockNodeModuleIncorrectly() {
  // This will fail because it doesn't include all the methods
  // and properties from the original module
  jest.mock('node:path', () => ({
    resolve: jest.fn(),
    join: jest.fn()
  }));
}

/**
 * CORRECT: How to use unstable_mockModule for dynamic ES modules
 */
async function mockEsModuleCorrectly() {
  // Create the mock first
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn() 
  };
  
  // Register the mock
  jest.unstable_mockModule('../src/core/utils/logger', () => mockLogger);
  
  // THEN import the module that uses the mock
  const moduleToTest = await import('../src/some-module-that-uses-logger');
  
  // Now you can test with the imported module
  // moduleToTest.someFunction();
  // expect(mockLogger.info).toHaveBeenCalled();
}

/**
 * INCORRECT: How NOT to use dynamic imports
 */
async function mockEsModuleIncorrectly() {
  // WRONG: Importing before mocking
  const moduleToTest = await import('../src/some-module-that-uses-logger');
  
  // This mock won't affect the already imported module
  jest.unstable_mockModule('../src/core/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }));
}

/**
 * CORRECT: Using mock proxy for type-safe testing
 */
function useMockProxyCorrectly() {
  import { mock, MockProxy } from 'jest-mock-extended';
  import type { Logger } from '../src/core/types/logger.types';
  
  // Create a type-safe mock with all methods as jest.fn()
  const logger: MockProxy<Logger> = mock<Logger>();
  
  // Now you can mock specific implementations
  logger.info.mockImplementation((message) => {
    console.log(`[TEST INFO] ${message}`);
  });
  
  // Or assert on calls
  // someFunction(logger);
  // expect(logger.info).toHaveBeenCalledWith('expected message');
}

/**
 * BEST PRACTICE: Complete Test Pattern for ES Modules
 */
async function completeEsModuleTestPattern() {
  // 1. Import test utilities
  import { jest } from '@jest/globals';
  import { mock, MockProxy } from 'jest-mock-extended';
  
  // 2. Declare module variables - these will be populated after mocking
  let SomeClass;
  let otherExport;
  
  // 3. Create mocks
  const mockDependency = {
    method1: jest.fn(),
    method2: jest.fn()
  };
  
  // 4. Setup before tests
  beforeAll(async () => {
    // Register mocks
    jest.unstable_mockModule('../src/dependency', () => mockDependency);
    
    // Import modules AFTER mocking
    const moduleToTest = await import('../src/module-to-test');
    SomeClass = moduleToTest.SomeClass;
    otherExport = moduleToTest.otherExport;
  });
  
  // 5. Reset between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // 6. Write tests
  describe('SomeClass', () => {
    it('calls dependency methods', () => {
      const instance = new SomeClass();
      instance.doSomething();
      expect(mockDependency.method1).toHaveBeenCalled();
    });
  });
}