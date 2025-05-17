/**
 * Unit tests for DI Registry
 * Tests the dependency injection registry functions
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  registerCoreDependencies, 
  registerContextDependencies, 
  registerToolDependencies,
  registerAllDependencies
} from '../../../src/core/di/registry.js';
import { DIContainer } from '../../../src/core/di/container.js';
import { DI_TOKENS } from '../../../src/core/di/tokens.js';

// Add a helper method to check if a singleton factory is registered
// This avoids testing the actual implementation which is hard to mock
function isSingletonRegistered(container: DIContainer, token: DI_TOKENS): boolean {
  try {
    // @ts-ignore - Accessing private property for testing
    return container['singletons'].has(token);
  } catch {
    return false;
  }
}

describe('DI Registry', () => {
  // Create mock instances
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };
  
  const mockPathDI = {
    join: jest.fn(),
    dirname: jest.fn(),
    resolve: jest.fn(),
    isAbsolute: jest.fn()
  };
  
  const mockFileSystemDI = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  };
  
  const mockProcessDI = {
    cwd: jest.fn(),
    argv: []
  };
  
  const mockFileSystem = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
    rmdir: jest.fn()
  };
  
  const MockDiffService = (jest.fn() as any).mockImplementation(() => ({
    generateDiff: jest.fn()
  }));
  
  // Get container instance and clear it before each test
  let container: DIContainer;
  
  beforeEach(() => {
    // Reset container and mocks
    container = DIContainer.getInstance();
    container.clear();
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    container.clear();
  });
  
  describe('registerCoreDependencies', () => {
    it('should register core dependencies in the container', () => {
      // Act
      registerCoreDependencies(container, mockLogger, mockPathDI, mockFileSystemDI);
      
      // Assert - verify dependencies are registered
      expect(container.get(DI_TOKENS.LOGGER)).toBe(mockLogger);
      expect(container.get(DI_TOKENS.PATH_DI)).toBe(mockPathDI);
      expect(container.get(DI_TOKENS.FILE_SYSTEM_DI)).toBe(mockFileSystemDI);
      
      // Verify the FILE_SYSTEM singleton is registered
      expect(isSingletonRegistered(container, DI_TOKENS.FILE_SYSTEM)).toBe(true);
    });
    
    it('should use the default container instance if none provided', () => {
      // Arrange
      const defaultContainer = DIContainer.getInstance();
      defaultContainer.clear();
      
      // Act
      registerCoreDependencies(undefined, mockLogger, mockPathDI, mockFileSystemDI);
      
      // Assert
      expect(defaultContainer.get(DI_TOKENS.LOGGER)).toBe(mockLogger);
      expect(defaultContainer.get(DI_TOKENS.PATH_DI)).toBe(mockPathDI);
      expect(defaultContainer.get(DI_TOKENS.FILE_SYSTEM_DI)).toBe(mockFileSystemDI);
      expect(isSingletonRegistered(defaultContainer, DI_TOKENS.FILE_SYSTEM)).toBe(true);
    });
  });
  
  describe('registerContextDependencies', () => {
    it('should register context dependencies in the container', () => {
      // Bypass the singleton pattern by directly registering the file system
      container.register(DI_TOKENS.FILE_SYSTEM, mockFileSystem);
      
      // Act
      registerContextDependencies(
        container, 
        mockLogger, 
        mockFileSystem, 
        mockPathDI, 
        mockFileSystemDI, 
        mockProcessDI
      );
      
      // Assert
      expect(container.get(DI_TOKENS.LOGGER)).toBe(mockLogger);
      expect(container.get(DI_TOKENS.FILE_SYSTEM)).toBe(mockFileSystem);
      expect(container.get(DI_TOKENS.PATH_DI)).toBe(mockPathDI);
      expect(container.get(DI_TOKENS.FILE_SYSTEM_DI)).toBe(mockFileSystemDI);
      expect(container.get(DI_TOKENS.PROCESS_DI)).toBe(mockProcessDI);
      
      // Verify FILE_PATH_PROCESSOR is registered as a singleton
      expect(isSingletonRegistered(container, DI_TOKENS.FILE_PATH_PROCESSOR)).toBe(true);
    });
    
    it('should use the default container instance if none provided', () => {
      // Arrange
      const defaultContainer = DIContainer.getInstance();
      defaultContainer.clear();
      
      // Bypass the singleton pattern by directly registering the file system
      defaultContainer.register(DI_TOKENS.FILE_SYSTEM, mockFileSystem);
      
      // Act
      registerContextDependencies(
        undefined, 
        mockLogger, 
        mockFileSystem, 
        mockPathDI, 
        mockFileSystemDI, 
        mockProcessDI
      );
      
      // Assert
      expect(defaultContainer.get(DI_TOKENS.LOGGER)).toBe(mockLogger);
      expect(defaultContainer.get(DI_TOKENS.FILE_SYSTEM)).toBe(mockFileSystem);
      expect(isSingletonRegistered(defaultContainer, DI_TOKENS.FILE_PATH_PROCESSOR)).toBe(true);
    });
  });
  
  describe('registerToolDependencies', () => {
    it('should register tool dependencies in the container', async () => {
      // Act
      await registerToolDependencies(container, MockDiffService);
      
      // Assert
      expect(isSingletonRegistered(container, DI_TOKENS.DIFF_SERVICE)).toBe(true);
    });
    
    it('should use the default container instance if none provided', async () => {
      // Arrange
      const defaultContainer = DIContainer.getInstance();
      defaultContainer.clear();
      
      // Act
      await registerToolDependencies(undefined, MockDiffService);
      
      // Assert
      expect(isSingletonRegistered(defaultContainer, DI_TOKENS.DIFF_SERVICE)).toBe(true);
    });
  });
  
  describe('registerAllDependencies', () => {
    // For registerAllDependencies we'll just verify it calls the other register functions
    it('should register core, context, and tool dependencies', async () => {
      // Act
      await registerAllDependencies(
        container,
        MockDiffService,
        mockLogger,
        mockFileSystem,
        mockPathDI,
        mockFileSystemDI,
        mockProcessDI
      );
      
      // Assert - verify key dependencies are in the container
      expect(container.get(DI_TOKENS.LOGGER)).toBe(mockLogger);
      expect(container.get(DI_TOKENS.FILE_SYSTEM)).toBe(mockFileSystem);
      expect(isSingletonRegistered(container, DI_TOKENS.DIFF_SERVICE)).toBe(true);
      expect(isSingletonRegistered(container, DI_TOKENS.FILE_PATH_PROCESSOR)).toBe(true);
    });
    
    it('should use the default container instance if none provided', async () => {
      // Arrange
      const defaultContainer = DIContainer.getInstance();
      defaultContainer.clear();
      
      // Act
      await registerAllDependencies(
        undefined,
        MockDiffService,
        mockLogger,
        mockFileSystem,
        mockPathDI,
        mockFileSystemDI,
        mockProcessDI
      );
      
      // Assert - verify key dependencies are in the default container
      expect(defaultContainer.get(DI_TOKENS.LOGGER)).toBe(mockLogger);
      expect(defaultContainer.get(DI_TOKENS.FILE_SYSTEM)).toBe(mockFileSystem);
      expect(isSingletonRegistered(defaultContainer, DI_TOKENS.DIFF_SERVICE)).toBe(true);
      expect(isSingletonRegistered(defaultContainer, DI_TOKENS.FILE_PATH_PROCESSOR)).toBe(true);
    });
  });
});