# Core Services Testing Strategy

This document outlines the testing strategy for core services in the AgenticMCP project and provides guidance for expanding test coverage.

## Migration Status

We've been working on migrating tests to support ES modules. Here's where we stand:

1. **Test Utils**: Enhanced `test-setup.ts` with ES module compatible mocking utilities
2. **Example Tests**: Created example tests demonstrating proper patterns
3. **Documentation**: Created comprehensive ES module testing guides

## Key Learnings

1. **Module Mocking**: Traditional `jest.mock()` doesn't work fully with ES modules
2. **Order Matters**: Mocks must be set up BEFORE importing the modules
3. **Circular Dependencies**: ES modules handle circular references differently
4. **Node.js Integration**: Some Node.js modules require direct patching

## Modified Files

1. `tests/utils/test-setup.ts` - Enhanced with ES module utilities
2. `tests/core/credentials/credentialManager.test.ts` - Updated to use ES module imports
3. `tests/core/config/configManager.test.ts` - Updated mock imports
4. `tests/core/services/node-file-system.adapter.test.ts` - Updated mock pattern
5. `tests/core/di/registry.test.ts` - Fixed require statements

## Example Files Created

1. `tests/examples/credentials-mock-example.test.ts` - Credential testing pattern
2. `tests/examples/fs-mock-example.test.ts` - File system testing pattern

## Documentation Created

1. `tests/ES_MODULE_TESTING.md` - ES module testing guide
2. `tests/TESTING_STRATEGY.md` - Comprehensive strategy for fixing all tests

## Current Test Coverage

We've created initial tests for these core services:

1. **ConfigManager** - Configuration loading, saving, and retrieval
2. **CredentialManager** - Secure credential storage and retrieval
3. **FileSystem Interface/Adapter** - File system operations
4. **DI Container/Registry** - Dependency injection management
5. **Utils (Logger, Validation)** - Utility functions

## Test Issues to Resolve

There are several issues to address in the current tests:

1. **ES Modules Compatibility**
   - Replace CommonJS `require()` with ES Module `import` statements
   - Update Jest configuration to properly handle dynamic imports
   - Use ES Module syntax for mocks

2. **Mock Implementation Improvements**
   - Use `jest-mock-extended` for better type safety
   - Properly implement singleton mocks
   - Fix interaction between mocked modules

3. **Test File Organization**
   - Organize tests to mirror the source structure
   - Create shared test utilities for common operations

## Expanding Test Coverage

### Core Services to Test Next

1. **CommandRegistry**
   - Test command registration
   - Test command lookup
   - Test command execution

2. **ContextManager**
   - Test context loading
   - Test context processing
   - Test context optimization

3. **ToolRegistry and ToolExecutor**
   - Test tool registration
   - Test tool execution
   - Test error handling

### Testing Approach

All tests should follow these principles:

1. **Dependency Injection-Based**
   - Use constructor injection for dependencies
   - Mock dependencies using `jest-mock-extended`
   - Create in-memory implementations for complex dependencies

2. **Type-Safe Mocking**
   - Use `MockProxy<T>` and `mock<T>()` for type safety
   - Use `mockReset()` in `beforeEach()` hooks
   - Use `calledWith()` matchers for complex interactions

3. **Isolation**
   - Test each unit in isolation
   - Mock external dependencies
   - Avoid side effects

4. **Coverage Targets**
   - Aim for at least 80% line coverage
   - Focus on edge cases and error handling
   - Test both success and failure paths

## Creating In-Memory Test Implementations

For complex interfaces, create in-memory implementations:

1. **InMemoryFileSystem** - For testing file system operations
2. **InMemoryCredentialStore** - For testing credential operations
3. **InMemoryConfigStore** - For testing configuration operations

These implementations should:
- Implement the full interface
- Store data in memory
- Be reset between tests

## Jest Configuration for ES Modules

Ensure the Jest configuration supports ES modules:

```js
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
  // Other configuration...
};
```

## Example: Using ES Modules in Tests

```typescript
// Import from the project
import { ConfigManager } from '../../../src/core/config/configManager';
import { AppConfig } from '../../../src/core/types/config.types';

// Import from test utilities
import { InMemoryFileSystem } from '../../utils/in-memory-filesystem';

// Import from Jest
import { jest } from '@jest/globals';

// Import from jest-mock-extended
import { mock, mockReset, MockProxy } from 'jest-mock-extended';

// Mock ES modules
jest.mock('../../../src/core/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ConfigManager', () => {
  // Test implementation
});
```

## Remaining Challenges

We still have some challenges to overcome:

1. **Module Patching**: Need a more robust way to patch Node.js modules
2. **Real Dependencies**: Tests are accessing real file system and API calls
3. **Singleton State**: Some tests require proper handling of singleton state
4. **Mocking Imports**: Jest's mocking system doesn't fully work with ES modules

## Next Steps

1. **Create a proper Jest setup file**
   - Create `jest.setup.js` that patches core Node.js modules
   - Update Jest configuration to use this setup file
   - Add global mock registry for cross-file access

2. **Update Tests in Priority Order**
   - Fix core service tests (FileSystem, Credentials, Config)
   - Fix DI container and registry tests
   - Update provider-specific tests
   - Update command and tool tests

3. **Apply DI Patterns**
   - Refactor code to use more dependency injection
   - Create interfaces for external dependencies
   - Make code more testable by reducing direct dependencies

4. **Expand Test Coverage**
   - Add more edge cases
   - Test error conditions
   - Test integration between components

## Immediate Recommendations

To make immediate progress:

1. Use the example test files as templates
2. Follow the ES module testing guide
3. Apply the strategies in the testing strategy document
4. Use the enhanced test-setup.ts utilities
5. Consider adding a jest.setup.js file for global mocks