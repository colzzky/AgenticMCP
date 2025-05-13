# Module Importing in ES Module Tests

## Problem

The current test suite has several issues with ES Module imports that need to be fixed:

1. Conflicts between global Jest mocks and test-specific mocks
2. Missing default exports for Node.js built-in modules
3. Issues with the order of mocking and imports

## Solution

We need to follow a specific pattern for ES Module testing:

1. Create mocks and register them with Jest BEFORE importing modules
2. Use dynamic imports (`await import()`) to import modules AFTER mocking
3. Ensure all modules support both named exports and default exports
4. Clean up mocks between tests

## Implementation

1. Create a node-module-mock.ts utility for ES Module testing
2. Update test files to follow the correct pattern
3. Fix jest.setup.js to be more compatible with ES modules

## Example Workflow

```typescript
// In test file:
import { jest } from '@jest/globals';
import { setupNodeFsMock, setupLoggerMock } from '../utils/node-module-mock';

// Declare module variables
let MyModule: typeof import('../../src/path/to/my-module').MyModule;
let OtherModule: typeof import('../../src/path/to/other-module').OtherModule;

// Setup mocks
const mockLogger = setupLoggerMock();
const mockFs = setupNodeFsMock();

// Setup module imports and mocks
beforeAll(async () => {
  // Register mocks with Jest
  jest.unstable_mockModule('node:fs/promises', () => mockFs);
  jest.unstable_mockModule('../../src/core/utils/logger', () => mockLogger);
  
  // Import modules after mocking
  const myModule = await import('../../src/path/to/my-module');
  MyModule = myModule.MyModule;
  
  const otherModule = await import('../../src/path/to/other-module');
  OtherModule = otherModule.OtherModule;
});

describe('MyModule Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should work with mocked modules', () => {
    // ... test code here
  });
});
```

## Next Steps

1. Follow this pattern for all test files
2. Ensure all modules can be imported with dynamic imports
3. Update jest.setup.js to avoid conflicts with test-specific mocks