# Expanded Test Coverage Documentation

This document provides an overview of the expanded test coverage in the AgenticMCP codebase. We've systematically added tests for key architectural components to ensure robust functionality and make future changes safer.

## Test Coverage Overview

We've added comprehensive tests for the following core components:

### Core Dependency Injection System (DI)
- **tests/core/di/container.test.ts**: Tests for the DI container singleton implementation
- **tests/core/di/registry.test.ts**: Tests for the DI registry used for service registration

### Core Services
- **tests/core/config/configManager.test.ts**: Tests for application configuration management
- **tests/core/credentials/credentialManager.test.ts**: Tests for secure API key storage and management

### Context Management
- **tests/context/contextManager.test.ts**: Tests for the file-based context loading and processing system

### Tool Infrastructure
- **tests/tools/toolRegistry.test.ts**: Tests for the tool registration and management system
- **tests/tools/toolExecutor.test.ts**: Tests for the tool execution logic
- **tests/tools/localCliTool.test.ts**: Tests for the local CLI tool implementation

### Provider System
- **tests/providers/providerFactory.test.ts**: Tests for the LLM provider factory 
- **tests/providers/providerInitializer.test.ts**: Tests for the provider initialization system
- **tests/providers/openai/openaiProvider.basic.test.ts**: Tests for OpenAI provider basic functionality
- **tests/providers/openai/openaiProvider.toolCalling.test.ts**: Tests for OpenAI provider tool calling

### MCP Tools
- **tests/mcp/tools/processFileOperations.test.ts**: Tests for file operation processing in LLM responses
- **tests/mcp/tools/xmlPromptUtils.test.ts**: Tests for XML-based prompt construction
- **tests/mcp/tools/roleHandlers.test.ts**: Tests for role-based tool execution and XML prompt handling

## Testing Strategy

Our testing strategy follows these key principles:

1. **Dependency Injection**: Tests leverage dependency injection for better isolation and control over dependencies.
2. **Comprehensive Coverage**: Each component's public API is thoroughly tested, including edge cases and error handling.
3. **Mock Independence**: Tests use mocks that are independent of the implementation details, focusing on behavior.
4. **Isolated Testing**: Each test focuses on a specific unit of functionality, properly isolating it from other components.

## Testing Architecture

The test architecture is structured to match the source architecture, with test files corresponding to source files:

```
/tests
  /core           - Core infrastructure tests
    /di           - Dependency injection tests
    /config       - Configuration management tests
    /credentials  - Credential management tests
    /services     - General services tests
  /context        - Context management tests
  /providers      - LLM provider tests
    /openai       - OpenAI provider tests
    /anthropic    - Anthropic provider tests
    /google       - Google provider tests
  /tools          - Tool system tests
  /mcp            - MCP server tests
    /tools        - MCP tool tests
    /transports   - Transport tests
```

## Key Test Patterns

### 1. Dependency Injection Testing

Tests use constructor-based dependency injection to replace real dependencies with mocks:

```typescript
// Example from ConfigManager tests
const mockFileSystemDI: FileSystemDI = {
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
} as unknown as FileSystemDI;

const configManager = new ConfigManager('test-app', mockPathDI, mockFileSystemDI);
```

### 2. Mock Implementation Testing

Tests provide specific mock implementations of interfaces to control behavior:

```typescript
// Example from ToolExecutor tests
const mockToolRegistry = {
  getTool: jest.fn().mockImplementation((name) => {
    if (name === 'testTool') {
      return { name: 'testTool', description: 'Test tool', schema: {} };
    }
    return undefined;
  }),
};
```

### 3. Async Testing

Tests properly handle async operations using async/await:

```typescript
// Example from CredentialManager tests
it('should save and retrieve an API key', async () => {
  await credentialManager.saveApiKey('test-provider', 'test-key');
  const apiKey = await credentialManager.getApiKey('test-provider');
  expect(apiKey).toBe('test-key');
});
```

### 4. Error Case Testing

Tests verify proper handling of error conditions:

```typescript
// Example from FileContextManager tests
it('should handle errors in file operations', async () => {
  mockLocalCliTool.execute.mockRejectedValueOnce(new Error('File not found'));
  const result = await processFileOperations(response, mockLocalCliTool, mockLogger);
  expect(result).toContain('<file_operation_error>');
  expect(result).toContain('Error: File not found');
});
```

## Testing Challenges

### ESM Module Testing

Testing ES modules introduced challenges with mocking and module loading order. The project uses:

1. `NODE_OPTIONS=--experimental-vm-modules` to enable ES modules in Jest
2. File extensions in imports (e.g., `import { x } from './y.js'`) to maintain ES module compatibility
3. Imports in the proper order to ensure mocks are established before the modules being tested are loaded

### Complex Dependency Chains

Some components have complex dependency chains, requiring careful isolation in tests:

1. The `DIContainer` itself is used by many components, requiring special handling in tests
2. External modules like `keytar` for secure credential storage are mocked to avoid system dependencies
3. Provider-specific client libraries (OpenAI, Anthropic) are mocked to avoid API calls during testing

## Future Improvements

1. **Increase Coverage**: Continue adding tests for remaining components
2. **Integration Tests**: Add more integration tests that verify multiple components working together
3. **E2E Tests**: Add end-to-end tests for complete CLI workflows
4. **Snapshot Testing**: Consider adding snapshot tests for complex output structures
5. **Performance Tests**: Add performance tests for critical operations

## Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific file
npm test -- tests/core/di/container.test.ts

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch
```

## Test Guidelines

When adding new tests:

1. Follow the established pattern of the existing tests
2. Use dependency injection to control dependencies
3. Test both success and error paths
4. Verify all public methods and edge cases
5. Ensure tests are independent and don't rely on global state
6. Use meaningful test and variable names
7. Add appropriate comments for complex test logic

By following these guidelines, we maintain a high-quality test suite that provides confidence in the codebase and makes future changes safer and easier to implement.