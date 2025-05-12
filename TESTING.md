# Testing Best Practices in AgenticMCP

This document outlines improved testing approaches to move away from hard-coded mocks to more maintainable, dependency-injection based tests.

## Issues with Current Approach

The current approach has several problems:

1. **Hard-Coded Mocks**: Hard-coded mocks in `__mocks__` directory don't adapt to implementation changes
2. **Testing Implementation Details**: Tests are tightly coupled to implementation, not behavior
3. **Brittle Tests**: When implementation changes, the tests break even when the behavior is correct
4. **Maintenance Burden**: Mocks need to be manually updated when implementation changes

## Improved Testing Approaches

### 1. Dependency Injection (DI)

Classes should accept their dependencies as constructor parameters:

```typescript
// GOOD
export class DILocalCliTool {
  constructor(config: LocalCliToolConfig, logger: Logger, fileSystem: IFileSystem) {
    // ...
  }
}

// BAD
export class LocalCliTool {
  constructor(config: LocalCliToolConfig, logger: Logger) {
    // Directly depends on built-in fs module
    this.fs = require('fs').promises;
  }
}
```

### 2. Interface-Based Dependencies

Define interfaces for dependencies:

```typescript
export interface IFileSystem {
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  // ...
}
```

### 3. Mock Implementations for Tests

Use in-memory implementations for tests:

```typescript
class InMemoryFileSystem implements IFileSystem {
  private files = new Map<string, string>();

  async readFile(path: string): Promise<string> {
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    return this.files.get(path)!;
  }

  async writeFile(path: string, data: string): Promise<void> {
    this.files.set(path, data);
  }
  
  // ... other methods
}
```

### 4. DI-Enabled Tests

Write tests that use DI:

```typescript
describe('DILocalCliTool', () => {
  let mockLogger;
  let mockFs;
  let cliTool;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    
    mockFs = new InMemoryFileSystem();
    
    // Set up test files
    mockFs.createFile('/test/file1.txt', 'Test content');
    
    cliTool = new DILocalCliTool({ baseDir: '/test' }, mockLogger, mockFs);
  });

  it('should read a file', async () => {
    const result = await cliTool.execute('read_file', { path: 'file1.txt' });
    expect(result).toEqual({ content: 'Test content' });
  });
});
```

### 5. Simple Mocks over Complex Mocking Libraries

For simpler components, use direct object mocks:

```typescript
const mockClient = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        // test response
      })
    }
  }
};
```

### 6. Mocking External APIs

For complex external APIs:

1. Create a wrapper/adapter around the API
2. Mock the adapter, not the API directly
3. Test behavior, not implementation details

## Examples in the Codebase

1. **DILocalCliTool**: Enhanced version with dependency injection for file operations
2. **InMemoryFileSystem**: In-memory implementation of the filesystem interface for testing
3. **simple-di-openai.test.ts**: Simple direct mocking approach for testing OpenAI provider
4. **di-openai-shared-test-utils.ts**: DI-friendly shared test utilities
5. **di-localCliTool.test.ts**: Tests for the DI version of LocalCliTool
6. **di-openaiProviderToolCalling.test.ts**: DI version of tool calling tests
7. **sharedTestUtils.ts**: DI-friendly replacement for openaiProvider.sharedTestUtils.ts

### Migration Status

We're currently migrating tests away from hard-coded mocks. Files with these annotations are using the new approach:

- Files with `di-` prefix are using dependency injection
- Files with a `@deprecated` annotation are using the old approach and should be updated

## Module Mocking Challenges

When working with ESM modules in Jest, there are some challenges with module mocking:

1. **Manual Mocking Limitations**: Module mocks in `__mocks__` directories don't always work well with ESM
2. **Import Order**: The module mock must be set up before the real module is imported
3. **Spy Creation**: Creating spies for module functions is more complex than in CommonJS

### Solutions

These approaches have proven effective:

1. **Direct Object Mocking**: Create simple mock objects directly in test files
   ```typescript
   const mockClient = {
     chat: {
       completions: {
         create: jest.fn().mockResolvedValue({/*...*/})
       }
     }
   };
   ```

2. **Constructor Injection**: Pass mock objects via constructor instead of relying on module mocks
   ```typescript
   const provider = new OpenAIProvider(mockConfigManager, mockOpenAIConstructor);
   ```

3. **Console Spies**: For logging tests, spy on console methods
   ```typescript
   jest.spyOn(console, 'error').mockImplementation(() => {});
   ```

## Migration Path

1. Create DI versions of components with hard dependencies
2. Create interfaces for external dependencies
3. Create test implementations of dependencies
4. Replace hard-coded mocks with DI-friendly tests
5. Gradually phase out `__mocks__` directory

## Step-by-Step Testing Example

### 1. Create interface for dependency

```typescript
// src/core/interfaces/file-system.interface.ts
export interface IFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  // ...other methods
}
```

### 2. Update class to use DI

```typescript
// src/components/file-processor.ts
export class FileProcessor {
  constructor(private fileSystem: IFileSystem) {}

  async processFile(path: string): Promise<string> {
    const content = await this.fileSystem.readFile(path);
    // Process content...
    return result;
  }
}
```

### 3. Create in-memory implementation for testing

```typescript
// tests/utils/in-memory-filesystem.ts
export class InMemoryFileSystem implements IFileSystem {
  private files = new Map<string, string>();

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }
}
```

### 4. Write DI-friendly tests

```typescript
// tests/components/file-processor.test.ts
describe('FileProcessor', () => {
  let mockFs: InMemoryFileSystem;
  let processor: FileProcessor;

  beforeEach(() => {
    mockFs = new InMemoryFileSystem();
    processor = new FileProcessor(mockFs);

    // Set up test files
    mockFs.writeFile('/test/file.txt', 'test content');
  });

  it('should process file', async () => {
    const result = await processor.processFile('/test/file.txt');
    expect(result).toBe('PROCESSED: test content');
  });
});

## Further Resources

- [Jest Mock Extended](https://github.com/marchaos/jest-mock-extended) - For type-safe mocking
- [Test Doubles](https://martinfowler.com/bliki/TestDouble.html) - Martin Fowler's article on test doubles
- [Integration Tests](https://martinfowler.com/bliki/IntegrationTest.html) - Integration vs. unit testing