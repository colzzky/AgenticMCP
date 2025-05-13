# ES Module Testing Guide

This document provides guidance on how to properly test ES modules in the AgenticMCP TypeScript project, particularly focusing on mocking Node.js built-in modules.

## Common Issues with ES Modules

1. **Default Export vs Named Export**: Node.js built-in modules like `node:path` and `node:fs/promises` don't provide a default export in ES module mode. Using incorrect import syntax can cause runtime errors.

2. **Module Mocking Order**: When testing ES modules, mocks must be registered before the modules are imported. This requires using dynamic imports with `await import()`.

3. **Jest Mock Implementation**: For ES modules, use `jest.mock` with the `{ virtual: true }` option or `jest.unstable_mockModule()` instead of `jest.mock()`.

## Best Practices

### 1. Use Named Imports for Node.js Built-in Modules

**Incorrect:**
```typescript
import path from 'node:path';
import fs from 'node:fs/promises';
```

**Correct:**
```typescript
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
```

### 2. Set Up Mocks Before Importing

**Pattern 1 - Static Module Mocks:**
```typescript
import { jest, describe, it, expect } from '@jest/globals';

// Create mock implementations
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Define mocks for modules
jest.mock('node:path', () => ({
  resolve: jest.fn((...parts) => parts.join('/')),
  join: jest.fn((...parts) => parts.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  isAbsolute: jest.fn((path) => path.startsWith('/')),
  sep: '/'
}), { virtual: true });

jest.mock('../src/core/utils/logger', () => mockLogger, { virtual: true });

// Import modules after mocking
import { YourClass } from '../src/your-module';
```

**Pattern 2 - Dynamic Module Mocks:**
```typescript
import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { setupNodeFsMock } from '../utils/node-module-mock';

// Create variables to hold imported modules
let YourClass;
let mockFs;

// Set up mocks and imports
beforeAll(async () => {
  // Create mock implementations
  mockFs = setupNodeFsMock();
  
  // Register mocks with Jest
  jest.unstable_mockModule('node:fs/promises', () => mockFs);
  
  // Import modules AFTER mocking
  const module = await import('../src/your-module');
  YourClass = module.YourClass;
});
```

### 3. Create Utility Functions for Common Mocks

Create a utilities file (e.g., `tests/utils/node-module-mock.ts`) to provide common mock implementations:

```typescript
import { jest } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';

export interface FsPromises {
  access: (path: string, mode?: number) => Promise<void>;
  stat: (path: string) => Promise<any>;
  readFile: (path: string, options?: any) => Promise<any>;
  writeFile: (path: string, data: string, options?: any) => Promise<void>;
  // ... other methods
}

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

  // Set up constants
  mock.constants = {
    R_OK: 4,
    W_OK: 2,
    F_OK: 0
  };

  return mock;
}
```

## Test Examples

### Example: Mocking Node Path Module

```typescript
// Mock the path module
const mockPathModule = {
  resolve: jest.fn((...parts) => parts.join('/')),
  join: jest.fn((...parts) => parts.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  relative: jest.fn((from, to) => to.replace(from, '')),
  isAbsolute: jest.fn((path) => path.startsWith('/')),
  sep: '/',
};

// Register mocks before imports
jest.mock('node:path', () => mockPathModule, { virtual: true });

// Import modules after mocking
import { MyFileProcessor } from '../src/file-processor';
```

### Example: Mocking Logger and Multiple Modules

```typescript
// Create mock implementations
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockFs = {
  access: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  // ... other methods
};

// Register mocks before imports
jest.mock('node:fs/promises', () => mockFs, { virtual: true });
jest.mock('../src/core/utils/logger', () => ({
  debug: mockLogger.debug,
  info: mockLogger.info,
  warn: mockLogger.warn,
  error: mockLogger.error,
  logger: mockLogger
}), { virtual: true });

// Import modules after mocking
import { FileManager } from '../src/file-manager';
```

## Jest Configuration for ES Modules

Ensure your Jest configuration (`jest.config.js`) is properly set up for ES modules:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Exclude example/utility tests to keep the test run focused
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/examples/',
    '/tests/utils/fs-keytar-mock-example.test.ts',
    '/tests/utils/mock-example.test.ts'
  ],
  
  // Other settings...
};
```

## Common Gotchas

1. **Error:** `SyntaxError: The requested module 'node:fs/promises' does not provide an export named 'default'`
   **Solution:** Use named import: `import * as fs from 'node:fs/promises'` instead of `import fs from 'node:fs/promises'`

2. **Error:** `Cannot find module '../src/utils/logger' from 'tests/jest.setup.js'`
   **Solution:** Ensure you're using the correct path for imports in your tests and that the virtual module mocks have the correct structure

3. **Error:** `TypeError: Cannot read properties of undefined (reading 'startsWith')`
   **Solution:** Ensure your mock implementations provide all necessary properties and methods that are used in the code under test