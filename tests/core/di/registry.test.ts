/**
 * @file Tests for DI registry
 */

import { jest } from '@jest/globals';
import { MockProxy, mock } from 'jest-mock-extended';
import { setupNodeFsMock } from '../../utils/node-module-mock';

// We need to set up mocks before importing the code under test
let mockFs: ReturnType<typeof setupNodeFsMock>;

// Keep references to dynamically imported modules
let Registry: typeof import('../../../src/core/di/registry');
let Container: typeof import('../../../src/core/di/container');
let Tokens: typeof import('../../../src/core/di/tokens');
let FileSystemInterface: typeof import('../../../src/core/interfaces/file-system.interface');
let LoggerTypes: typeof import('../../../src/core/types/logger.types');

// Create mocked implementations
const mockNodeFileSystem = jest.fn().mockImplementation(() => ({
  /* Mocked filesystem implementation */
}));

const mockDIFilePathProcessor = jest.fn().mockImplementation(() => ({
  /* Mocked file path processor implementation */
}));

const mockDiffService = jest.fn().mockImplementation(() => ({
  /* Mocked diff service implementation */
}));

// Mock the logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup dynamic import to get all the modules
beforeAll(async () => {
  // Setup the fs mock first
  mockFs = setupNodeFsMock();

  // Register mocks with Jest
  jest.unstable_mockModule('node:fs/promises', () => mockFs);

  // Mock modules before importing them
  jest.unstable_mockModule('../../../src/core/adapters/node-file-system.adapter', () => ({
    NodeFileSystem: mockNodeFileSystem
  }));

  jest.unstable_mockModule('../../../src/context/di-file-path-processor', () => ({
    DIFilePathProcessor: mockDIFilePathProcessor
  }));

  jest.unstable_mockModule('../../../src/tools/services/diff-service', () => ({
    DiffService: mockDiffService
  }));

  jest.unstable_mockModule('../../../src/core/utils/logger', () => mockLogger);

  // Import modules after registering mocks
  Registry = await import('../../../src/core/di/registry');
  Container = await import('../../../src/core/di/container');
  Tokens = await import('../../../src/core/di/tokens');
  FileSystemInterface = await import('../../../src/core/interfaces/file-system.interface');
  LoggerTypes = await import('../../../src/core/types/logger.types');
});

describe('DI Registry', () => {
  let container: MockProxy<Container.DIContainer>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock container
    container = mock<Container.DIContainer>();
  });

  describe('registerCoreDependencies', () => {
    it('should register core dependencies', () => {
      Registry.registerCoreDependencies(container);

      // Verify logger registration
      expect(container.register).toHaveBeenCalledWith(
        Tokens.DI_TOKENS.LOGGER,
        expect.anything()
      );

      // Verify filesystem singleton registration
      expect(container.registerSingleton).toHaveBeenCalledWith(
        Tokens.DI_TOKENS.FILE_SYSTEM,
        expect.any(Function)
      );
    });

    it('should use singleton factory to create NodeFileSystem', () => {
      // Call register function
      Registry.registerCoreDependencies(container);

      // Extract the factory function
      const registerSingletonCalls = container.registerSingleton.mock.calls;
      expect(registerSingletonCalls.length).toBeGreaterThan(0);

      // Find the FileSystem registration
      const fileSystemCall = registerSingletonCalls.find(call => call[0] === Tokens.DI_TOKENS.FILE_SYSTEM);
      expect(fileSystemCall).toBeDefined();

      // Get the factory function
      const factory = fileSystemCall?.[1] as (() => any);

      // Call the factory
      const result = factory();

      // Verify that the NodeFileSystem constructor was called
      expect(mockNodeFileSystem).toHaveBeenCalled();
    });
  });

  describe('registerContextDependencies', () => {
    it('should register context dependencies', () => {
      // Mock dependency retrieval
      const mockFileSystem = mock<FileSystemInterface.IFileSystem>();
      const mockContextLogger = mock<LoggerTypes.Logger>();

      // Use any to bypass type checking temporarily
      (container.getSingleton as any).mockImplementation((token: string) => {
        if (token === Tokens.DI_TOKENS.FILE_SYSTEM) {
          return mockFileSystem;
        }
        return undefined;
      });

      (container.get as any).mockImplementation((token: string) => {
        if (token === Tokens.DI_TOKENS.LOGGER) {
          return mockContextLogger;
        }
        return undefined;
      });

      Registry.registerContextDependencies(container);

      // Verify file path processor registration
      expect(container.registerSingleton).toHaveBeenCalledWith(
        Tokens.DI_TOKENS.FILE_PATH_PROCESSOR,
        expect.any(Function)
      );

      // Verify dependencies are retrieved
      expect(container.getSingleton).toHaveBeenCalledWith(Tokens.DI_TOKENS.FILE_SYSTEM);
      expect(container.get).toHaveBeenCalledWith(Tokens.DI_TOKENS.LOGGER);
    });

    it('should use existing dependencies when creating DIFilePathProcessor', () => {
      // Mock filesystem and logger
      const mockFileSystem = mock<FileSystemInterface.IFileSystem>();
      const mockContextLogger = mock<LoggerTypes.Logger>();

      // Mock dependency retrieval - use any to bypass type checking temporarily
      (container.getSingleton as any).mockImplementation((token: string) => {
        if (token === Tokens.DI_TOKENS.FILE_SYSTEM) {
          return mockFileSystem;
        }
        return undefined;
      });

      (container.get as any).mockImplementation((token: string) => {
        if (token === Tokens.DI_TOKENS.LOGGER) {
          return mockContextLogger;
        }
        return undefined;
      });

      Registry.registerContextDependencies(container);

      // Extract the factory function
      const registerSingletonCalls = container.registerSingleton.mock.calls;
      const processorCall = registerSingletonCalls.find(call => call[0] === Tokens.DI_TOKENS.FILE_PATH_PROCESSOR);
      expect(processorCall).toBeDefined();

      // Get the factory function
      const factory = processorCall?.[1] as (() => any);

      // Call the factory
      factory();

      // Verify DIFilePathProcessor was created with the right dependencies
      expect(mockDIFilePathProcessor).toHaveBeenCalledWith(mockContextLogger, mockFileSystem);
    });
  });

  describe('registerToolDependencies', () => {
    it('should register tool dependencies', () => {
      Registry.registerToolDependencies(container);

      // Verify diff service registration
      expect(container.registerSingleton).toHaveBeenCalledWith(
        Tokens.DI_TOKENS.DIFF_SERVICE,
        expect.any(Function)
      );
    });
  });

  describe('registerAllDependencies', () => {
    it('should register all dependency types', () => {
      // Mock individual registration functions
      const mockRegisterCore = jest.spyOn(
        Registry,
        'registerCoreDependencies'
      ).mockImplementation(() => {});

      const mockRegisterContext = jest.spyOn(
        Registry,
        'registerContextDependencies'
      ).mockImplementation(() => {});

      const mockRegisterTools = jest.spyOn(
        Registry,
        'registerToolDependencies'
      ).mockImplementation(() => {});

      Registry.registerAllDependencies(container);

      // Verify all registration functions were called with the container
      expect(mockRegisterCore).toHaveBeenCalledWith(container);
      expect(mockRegisterContext).toHaveBeenCalledWith(container);
      expect(mockRegisterTools).toHaveBeenCalledWith(container);

      // Restore mocks
      mockRegisterCore.mockRestore();
      mockRegisterContext.mockRestore();
      mockRegisterTools.mockRestore();
    });
  });
});