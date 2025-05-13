# ES Module Testing Guide

This document provides guidance on how to properly mock ES modules in Jest tests. It covers the utilities available in `test-setup.ts` and provides examples of how to use them.

## Utilities Available

The `test-setup.ts` file provides the following utilities:

1. **mockESModule** - A flexible utility for mocking modules in both CommonJS and ES Module environments
2. **dynamicESModuleMock** - Creates dynamic ES module mocks at test time
3. **setupFsPromisesMock** - Sets up a complete mock for the `node:fs/promises` module
4. **setupKeytarMock** - Sets up a complete mock for the `keytar` module
5. **createModuleSpy** - Creates type-safe spy objects for modules

## Mocking Strategy

When testing ES modules, it's important to:

1. Mock dependencies **before** importing modules that use them
2. Clear mocks between tests to avoid test contamination
3. Use the appropriate mocking utility for your needs

## Common Patterns

### Mocking node:fs/promises

```typescript
import { jest } from '@jest/globals';
import { setupFsPromisesMock } from '../utils/test-setup';

// Setup mock before importing any modules that use fs/promises
const mockFs = setupFsPromisesMock();

// Define test suite
describe('FileSystem Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockFs.readFile.mockReset();
    mockFs.writeFile.mockReset();
  });

  it('should read a file', async () => {
    // Setup mock implementation
    mockFs.readFile.mockResolvedValueOnce('file content');
    
    // Import the module under test
    const { readFile } = await import('../src/fileModule');
    
    // Call the function
    const result = await readFile('/path/to/file.txt');
    
    // Assertions
    expect(result).toBe('file content');
    expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.txt', expect.any(Object));
  });
});
```

### Mocking keytar

```typescript
import { jest } from '@jest/globals';
import { setupKeytarMock } from '../utils/test-setup';

// Setup mock before importing any modules that use keytar
const mockKeytar = setupKeytarMock();

describe('Credential Manager Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockKeytar.getPassword.mockReset();
    mockKeytar.setPassword.mockReset();
  });

  it('should get a credential', async () => {
    // Setup mock implementation
    mockKeytar.getPassword.mockResolvedValueOnce('password123');
    
    // Import the module under test
    const { getCredential } = await import('../src/credentialModule');
    
    // Call the function
    const result = await getCredential('service', 'account');
    
    // Assertions
    expect(result).toBe('password123');
    expect(mockKeytar.getPassword).toHaveBeenCalledWith('service', 'account');
  });
});
```

### Mocking Custom Modules

```typescript
import { jest } from '@jest/globals';
import { dynamicESModuleMock } from '../utils/test-setup';

describe('Custom Module Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should use a custom module', async () => {
    // Create a mock for a dependency
    const dependencyMock = await dynamicESModuleMock('../src/dependency', () => ({
      fetch: jest.fn().mockResolvedValue({ data: 'mocked data' }),
      process: jest.fn().mockReturnValue('processed')
    }));
    
    // Import the module under test after mocking its dependency
    const { getData } = await import('../src/module');
    
    // Call the function
    const result = await getData();
    
    // Assertions
    expect(dependencyMock.fetch).toHaveBeenCalled();
    expect(result).toContain('mocked data');
  });
});
```

## Best Practices

1. **Always mock before importing** - Ensure your mocks are set up before importing any modules that use them
2. **Reset between tests** - Use `beforeEach` to reset modules and mocks
3. **Use type-safe mocks** - Leverage TypeScript to ensure your mocks implement the correct interface
4. **Verify mock calls** - Check that your mocks were called with the expected arguments
5. **Test error cases** - Mock error conditions to test error handling
6. **Use the right tool for the job** - Choose the appropriate mocking utility based on your needs

## Troubleshooting

If you encounter issues with module mocking:

1. **Check import order** - Ensure mocks are set up before importing modules
2. **Verify mock implementation** - Ensure mock functions return the expected values
3. **Use `jest.resetModules()`** - Clear the module cache between tests
4. **Check for circular dependencies** - These can cause issues with mocking
5. **Use dynamic imports** - Import modules inside test functions to ensure mocks are applied

## Example Test

See `mock-example.test.ts` for a complete example of how to use these utilities.