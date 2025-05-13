# Test File Template

This template provides a standardized structure for tests in the AgenticMCP TypeScript project.

## Basic Structure

```typescript
/**
 * @file Tests for [Component]
 */

import { jest } from '@jest/globals';
import { mockConsole, setupFsPromisesMock, setupKeytarMock, mockESModule } from '../utils/test-setup';

// Step 1: Set up mocks before importing the module under test
let mockFs: ReturnType<typeof setupFsPromisesMock>;
let mockKeytar: ReturnType<typeof setupKeytarMock>;
let ComponentUnderTest: any; // Replace with the actual type

// Step 2: Use beforeAll to set up mocks and dynamic imports
beforeAll(async () => {
  // Setup mocks
  mockFs = setupFsPromisesMock();
  mockKeytar = setupKeytarMock();
  
  // Register mocks
  mockESModule('node:fs/promises', mockFs, { virtual: true });
  mockESModule('keytar', mockKeytar, { virtual: true });
  
  // Mock logger or other dependencies
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  mockESModule('../src/core/utils/logger', { logger: mockLogger }, { virtual: true });
  
  // Import the module under test after mocks are set up
  const moduleUnderTest = await import('../src/path/to/module');
  ComponentUnderTest = moduleUnderTest.ComponentUnderTest;
});

// Step 3: Test constants
const TEST_CONSTANT_1 = 'value1';
const TEST_CONSTANT_2 = 'value2';

describe('ComponentUnderTest', () => {
  // Step 4: Test-specific variables
  let testInstance: any;
  let consoleSpy: ReturnType<typeof mockConsole>;
  
  // Step 5: Set up before each test
  beforeEach(() => {
    // Reset mocks
    jest.resetModules();
    jest.clearAllMocks();
    
    // Set up console mocks
    consoleSpy = mockConsole();
    
    // Set up mock implementations for this test
    mockFs.readFile.mockResolvedValue('test content');
    mockKeytar.getPassword.mockResolvedValue('test password');
    
    // Create the test instance
    testInstance = new ComponentUnderTest();
  });
  
  // Step 6: Clean up after each test
  afterEach(() => {
    // Clean up console mocks
    if (consoleSpy && typeof consoleSpy.restore === 'function') {
      consoleSpy.restore();
    }
  });
  
  // Step 7: Test cases grouped by method or functionality
  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test input';
      mockFs.readFile.mockResolvedValueOnce('specific response');
      
      // Act
      const result = await testInstance.methodName(input);
      
      // Assert
      expect(result).toBe('expected output');
      expect(mockFs.readFile).toHaveBeenCalledWith(input, expect.any(Object));
    });
    
    it('should handle errors', async () => {
      // Arrange
      const testError = new Error('Test error');
      mockFs.readFile.mockRejectedValueOnce(testError);
      
      // Act & Assert
      await expect(testInstance.methodName('input')).rejects.toThrow(testError);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});
```

## Specialized Test Patterns

### Testing Static Methods

```typescript
describe('staticMethod', () => {
  it('should work with static methods', () => {
    // Call static method directly
    const result = ComponentUnderTest.staticMethod('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing Private Methods

```typescript
describe('privateMethod', () => {
  it('should allow access to private methods using string indexing', () => {
    // Access private method using string indexing
    const privateMethod = testInstance['privateMethod'] as (input: string) => string;
    const result = privateMethod('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing Event Emitters

```typescript
describe('events', () => {
  it('should emit events', () => {
    // Set up event listener
    const eventSpy = jest.fn();
    testInstance.on('eventName', eventSpy);
    
    // Trigger event
    testInstance.methodThatEmitsEvent();
    
    // Check event was emitted
    expect(eventSpy).toHaveBeenCalledWith(expect.any(Object));
  });
});
```

## Best Practices

1. **Mock Before Import**: Always set up mocks before importing the module under test
2. **Reset Mocks**: Reset mocks in beforeEach to avoid test contamination
3. **Group Tests**: Group related tests using nested describe blocks
4. **Arrange-Act-Assert**: Structure test cases with Arrange-Act-Assert pattern
5. **Descriptive Names**: Use descriptive test names that explain the expected behavior
6. **Test Edge Cases**: Include tests for edge cases and error conditions
7. **Clean Up**: Properly clean up resources in afterEach or afterAll
8. **Avoid Redundancy**: Use helper functions for common test setup