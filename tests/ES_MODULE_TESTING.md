# ES Module Testing Guide

This guide provides examples and best practices for testing ES modules in our TypeScript codebase. We'll focus on using Jest to test modules that use the native ES module system.

## Key Challenges with ES Module Testing

1. **Module Mocking**: Jest's standard `jest.mock()` doesn't work well with ES modules
2. **Import/Export**: ES modules use `import/export` syntax, not CommonJS' `require`
3. **Circular Dependencies**: ES modules handle circular dependencies differently
4. **Isolation**: ES modules are harder to mock and isolate for testing

## Our Testing Utilities

We've developed utilities in `test-setup.ts` to address these challenges:

1. `mockESModule()`: Unified mocking for both ES modules and CommonJS
2. `setupFsPromisesMock()`: Mock for node:fs/promises
3. `setupKeytarMock()`: Mock for keytar
4. `dynamicESModuleMock()`: Create mocks at test time
5. `createModuleSpy()`: Type-safe spy objects

## Basic Mocking Pattern

```typescript
import { jest } from '@jest/globals';
import { setupFsPromisesMock, setupKeytarMock } from '../utils/test-setup';

// Mock modules BEFORE importing what uses them
const mockFs = setupFsPromisesMock();
const mockKeytar = setupKeytarMock();

// NOW import the module that uses fs and keytar
import { ConfigManager } from '../src/core/config/configManager';

describe('ConfigManager', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Set up mock responses for this test
    mockFs.readFile.mockResolvedValue(JSON.stringify({ key: 'value' }));
    mockKeytar.getPassword.mockResolvedValue('test-secret');
  });
  
  it('should load config from file', async () => {
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();
    
    expect(mockFs.readFile).toHaveBeenCalled();
    expect(config).toHaveProperty('key', 'value');
  });
});
```

## Mocking Deep Imports

When you need to mock modules that are imported by the code you're testing:

```typescript
import { jest } from '@jest/globals';
import { mockESModule } from '../utils/test-setup';

// Mock a deep dependency
mockESModule('../src/core/utils', {
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
});

// Now import the module that uses the logger
import { SomeService } from '../src/services/someService';

describe('SomeService', () => {
  // Your tests here
});
```

## Dynamic Mocking

For complex cases where you need to create mocks at test time:

```typescript
import { jest } from '@jest/globals';
import { dynamicESModuleMock } from '../utils/test-setup';

describe('ComplexModule', () => {
  it('should handle complex dependencies', async () => {
    // Create a mock dynamically
    const complexMock = await dynamicESModuleMock('../src/complex/module', () => ({
      complexFunction: jest.fn().mockReturnValue('mocked result')
    }));
    
    // Import the module that uses the complex module
    const { ModuleUnderTest } = await import('../src/module/under/test');
    
    // Use the mocked module
    const result = ModuleUnderTest.doSomething();
    
    expect(complexMock.complexFunction).toHaveBeenCalled();
    expect(result).toBe('expected result');
  });
});
```

## Node file system testing

For modules that interact with the file system:

```typescript
import { jest } from '@jest/globals';
import { setupFsPromisesMock } from '../utils/test-setup';

// Set up the mock
const mockFs = setupFsPromisesMock();

// Import the file system adapter
import { NodeFileSystem } from '../src/core/adapters/node-file-system.adapter';

describe('NodeFileSystem', () => {
  let fileSystem: NodeFileSystem;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Create new instance for each test
    fileSystem = new NodeFileSystem();
    
    // Set up mock responses
    mockFs.readFile.mockResolvedValue('file content');
    mockFs.stat.mockResolvedValue({
      isDirectory: jest.fn().mockReturnValue(false),
      size: 1024
    });
  });
  
  it('should read file content', async () => {
    const content = await fileSystem.readFile('/test/path', 'utf-8');
    
    expect(mockFs.readFile).toHaveBeenCalledWith('/test/path', { encoding: 'utf-8' });
    expect(content).toBe('file content');
  });
});
```

## Keytar (Credentials) Testing

For modules that interact with keytar:

```typescript
import { jest } from '@jest/globals';
import { setupKeytarMock } from '../utils/test-setup';

// Set up the mock
const mockKeytar = setupKeytarMock();

// Import credentials manager
import { CredentialManager } from '../src/core/credentials/credentialManager';

describe('CredentialManager', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Set up mock responses
    mockKeytar.getPassword.mockResolvedValue('test-api-key');
    mockKeytar.setPassword.mockResolvedValue(undefined);
    mockKeytar.deletePassword.mockResolvedValue(true);
    mockKeytar.findCredentials.mockResolvedValue([
      { account: 'test', password: 'password' }
    ]);
  });
  
  it('should retrieve secret', async () => {
    const secret = await CredentialManager.getSecret({
      providerType: 'openai',
      accountName: 'default'
    });
    
    expect(mockKeytar.getPassword).toHaveBeenCalledWith('AgenticMCP-openai', 'default');
    expect(secret).toBe('test-api-key');
  });
});
```

## Common Pitfalls and Solutions

1. **Order Matters**: Always set up mocks before importing modules that use them
2. **Module Cache**: Use `jest.resetModules()` between tests to clear the module cache
3. **Deep Dependencies**: Be aware of modules imported by modules you're testing
4. **Type Safety**: Use proper TypeScript typing for your mocks
5. **Cleanup**: Reset mocks in `beforeEach` to ensure test isolation

## Best Practices

1. Keep test implementations simple and focused
2. Use type-safe mocks whenever possible
3. Test behavior, not implementation details
4. Use dependency injection where possible to simplify testing
5. Run tests with `--detectOpenHandles` to catch unresolved promises
6. Organize test files to mirror source code structure
7. Mock only what's necessary, use real implementations when possible

## Using unstable_mockModule

If you need to use `jest.unstable_mockModule` directly:

```typescript
// Example of direct usage (but prefer our utilities)
jest.unstable_mockModule('../src/module/path', () => ({
  exportedFunction: jest.fn().mockReturnValue('mocked value'),
  someClass: jest.fn().mockImplementation(() => ({
    classMethod: jest.fn().mockResolvedValue('mocked result')
  }))
}));

// Must reset modules to apply mock
jest.resetModules();

// Import after mocking
const { exportedFunction, someClass } = await import('../src/module/path');
```

## Troubleshooting

If your tests are failing with ES module issues:

1. Check that mocks are set up before importing modules
2. Ensure `jest.resetModules()` is called between tests
3. Verify mock implementations match the real module's interface
4. Check for circular dependencies in your module structure
5. Look for modules using both ES module and CommonJS patterns

---

By following these patterns and using our test utilities, you can effectively test ES modules while maintaining the benefits of Jest's mocking capabilities.