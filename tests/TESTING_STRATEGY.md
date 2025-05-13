# Testing Strategy for AgenticMCP TypeScript

## Current Test Status

We're currently facing challenges with our test suite due to the migration from CommonJS to ES modules. The main issues are:

1. **Module Mocking**: Jest's traditional mocking approach using `jest.mock()` doesn't work well with ES modules
2. **File System Access**: Tests are trying to access the real file system instead of mocks
3. **ES Module Imports**: Tests are using `require()` in some places, which doesn't work with ES modules

## Comprehensive Strategy

To fix our test suite, we need to take a multi-faceted approach:

### 1. Patch Key External Dependencies

For the most problematic external dependencies, we need direct patching at the Node.js level:

```typescript
// In jest.setup.js
// Patch fs/promises
const fsMock = {
  access: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  // ... other methods
};

// Use direct property replacement on Node.js modules
jest.unstable_mockModule('node:fs/promises', () => fsMock);
global.__mocks__ = {
  fs: fsMock,
  // Add other global mocks here
};
```

### 2. Update Test Files to Use ES Module Imports

All test files need to be updated to use ES module imports instead of CommonJS:

```typescript
// Before
const { ConfigManager } = require('../src/core/config/configManager');

// After
import { ConfigManager } from '../src/core/config/configManager';
```

### 3. Update Jest Configuration

Update `jest.config.js` to properly support ES modules:

```typescript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
  extensionsToTreatAsEsm: ['.ts'],
};
```

### 4. Use Class-Based Design Pattern for Better Testability

Where possible, refactor our code to use more class-based design with dependency injection:

```typescript
// Before
export class FileService {
  async readFile(path: string) {
    // Direct dependency on fs
    return fs.readFile(path, 'utf-8');
  }
}

// After
export class FileService {
  constructor(private fileSystem: IFileSystem) {}
  
  async readFile(path: string) {
    // Injected dependency
    return this.fileSystem.readFile(path, 'utf-8');
  }
}

// In tests
const mockFileSystem = { readFile: jest.fn() };
const service = new FileService(mockFileSystem);
```

### 5. Create Module Mock Utilities

We've already started creating enhanced utilities in `test-setup.ts`, but we need to ensure they're effective in our environment:

```typescript
// Updated mockESModule to patch at the Node.js level
export function mockESModule(modulePath, mockImplementation) {
  jest.unstable_mockModule(modulePath, () => mockImplementation);
  
  // Also apply to require cache if it exists
  if (require.cache && require.cache[require.resolve(modulePath)]) {
    require.cache[require.resolve(modulePath)].exports = mockImplementation;
  }
  
  // Store in global registry for retrieval
  global.__mocks__ = global.__mocks__ || {};
  global.__mocks__[modulePath] = mockImplementation;
}
```

### 6. Prioritize Tests by Importance

Fix tests in this order:

1. Core services tests (file system, config, credentials)
2. DI container and registry tests
3. Provider-specific tests
4. Command and tool tests
5. Integration tests

## Implementation Plan

### Phase 1: Infrastructure Setup

1. Update `jest.config.js` to support ES modules properly
2. Create a robust `jest.setup.js` file that patches core Node.js modules
3. Enhance `test-setup.ts` with better ES module mocking utilities

### Phase 2: Core Service Tests

1. Fix NodeFileSystem tests using direct module patching
2. Fix CredentialManager tests using keytarMock
3. Fix ConfigManager tests that rely on both

### Phase 3: DI and Registry Tests

1. Fix DIContainer tests to use ESM-compatible spies
2. Fix Registry tests by properly mocking dependencies
3. Update token-related tests

### Phase 4: Provider and Command Tests

1. Fix provider tests (Anthropic, OpenAI, etc.)
2. Fix command tests
3. Fix tool tests

### Phase 5: Improve Design for Testability

1. Apply dependency injection where possible
2. Create interfaces for external dependencies
3. Refactor code to be more testable

## Example Tests

We've created example tests in the `tests/examples/` directory that demonstrate the proper patterns for ES module testing. Use these as templates when fixing other tests.

## Documentation

We've also created `ES_MODULE_TESTING.md` with detailed guidance on testing ES modules in our codebase. Refer to this document for best practices and patterns.

## Conclusion

By systematically addressing these issues and following a structured approach, we can successfully migrate our test suite to work with ES modules. The key principles are:

1. Proper dependency injection
2. ES module compatible mocking
3. Type-safe test utilities
4. Consistent patterns across tests

This will not only fix our current issues but make our codebase more testable and maintainable in the future.