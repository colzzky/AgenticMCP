/**
 * @file Tests for DI registry
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { MockProxy, mock } from 'jest-mock-extended';
import { setupNodeFsMock, setupLoggerMock } from '../../utils/node-module-mock';

// Set up mocks using utilities
const mockFs = setupNodeFsMock();
const mockLogger = setupLoggerMock();

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

// Register mocks for node modules
jest.mock('node:fs/promises', () => ({
  access: mockFs.access,
  stat: mockFs.stat,
  readFile: mockFs.readFile,
  readdir: mockFs.readdir,
  writeFile: mockFs.writeFile,
  unlink: mockFs.unlink,
  mkdir: mockFs.mkdir,
  rmdir: mockFs.rmdir,
  rm: mockFs.rm
}), { virtual: true });

// Define mocks for application modules
jest.mock('../../../src/core/adapters/node-file-system.adapter', () => ({
  NodeFileSystem: mockNodeFileSystem
}), { virtual: true });

jest.mock('../../../src/context/di-file-path-processor', () => ({
  DIFilePathProcessor: mockDIFilePathProcessor
}), { virtual: true });

jest.mock('../../../src/tools/services/diff-service', () => ({
  DiffService: mockDiffService
}), { virtual: true });

jest.mock('../../../src/core/utils/logger', () => mockLogger, { virtual: true });

// Import modules after setting up mocks
import { DIContainer } from '../../../src/core/di/container';
import { DI_TOKENS } from '../../../src/core/di/tokens';
import { registerCoreDependencies, registerContextDependencies, registerToolDependencies, registerAllDependencies } from '../../../src/core/di/registry';
import type { IFileSystem } from '../../../src/core/interfaces/file-system.interface';
import type { Logger } from '../../../src/core/types/logger.types';

describe('DI Registry', () => {
  // Ensure all tests can use async/await for async registry functions

  let container: MockProxy<DIContainer>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock container
    container = mock<DIContainer>();
  });

  describe('registerCoreDependencies', () => {
    it('should register core dependencies', () => {
      registerCoreDependencies(container);

      // Verify logger registration
      expect(container.register).toHaveBeenCalledWith(
        DI_TOKENS.LOGGER,
        expect.anything()
      );

      // Verify filesystem singleton registration
      expect(container.registerSingleton).toHaveBeenCalledWith(
        DI_TOKENS.FILE_SYSTEM,
        expect.any(Function)
      );
    });

    it('should use singleton factory to create NodeFileSystem', () => {
      // Call register function
      registerCoreDependencies(container);

      // Extract the factory function
      const registerSingletonCalls = container.registerSingleton.mock.calls;
      expect(registerSingletonCalls.length).toBeGreaterThan(0);

      // Find the FileSystem registration
      const fileSystemCall = registerSingletonCalls.find(call => call[0] === DI_TOKENS.FILE_SYSTEM);
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
      const mockFileSystem = mock<IFileSystem>();
      const mockContextLogger = mock<Logger>();

      // Set up mock implementations - Reset first to clear any existing implementation
      container.getSingleton.mockReset();
      container.get.mockReset();

      // Configure the mock implementation properly
      container.getSingleton.mockImplementation((token) => {
        if (token === DI_TOKENS.FILE_SYSTEM) {
          return mockFileSystem;
        }
        return undefined;
      });

      container.get.mockImplementation((token) => {
        if (token === DI_TOKENS.LOGGER) {
          return mockContextLogger;
        }
        return undefined;
      });

      // Call the function to register dependencies
      registerContextDependencies(container);

      // Verify file path processor registration
      expect(container.registerSingleton).toHaveBeenCalledWith(
        DI_TOKENS.FILE_PATH_PROCESSOR,
        expect.any(Function)
      );

      // Verify dependencies are retrieved - get the factory function
      const factory = container.registerSingleton.mock.calls.find(
        call => call[0] === DI_TOKENS.FILE_PATH_PROCESSOR
      )?.[1] as (() => any);

      // Call the factory to verify getSingleton and get are called
      factory();

      // Now verify the dependencies were retrieved
      expect(container.getSingleton).toHaveBeenCalledWith(DI_TOKENS.FILE_SYSTEM);
      expect(container.get).toHaveBeenCalledWith(DI_TOKENS.LOGGER);
    });

    it('should use existing dependencies when creating DIFilePathProcessor', () => {
      // Mock filesystem and logger
      const mockFileSystem = mock<IFileSystem>();
      const mockContextLogger = mock<Logger>();

      // Set up mock implementations - Reset first to clear any existing implementation
      container.getSingleton.mockReset();
      container.get.mockReset();

      // Configure the mock implementation properly
      container.getSingleton.mockImplementation((token) => {
        if (token === DI_TOKENS.FILE_SYSTEM) {
          return mockFileSystem;
        }
        return undefined;
      });

      container.get.mockImplementation((token) => {
        if (token === DI_TOKENS.LOGGER) {
          return mockContextLogger;
        }
        return undefined;
      });

      registerContextDependencies(container);

      // Extract the factory function
      const registerSingletonCalls = container.registerSingleton.mock.calls;
      const processorCall = registerSingletonCalls.find(call => call[0] === DI_TOKENS.FILE_PATH_PROCESSOR);
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
      registerToolDependencies(container);

      // Verify diff service registration
      expect(container.registerSingleton).toHaveBeenCalledWith(
        DI_TOKENS.DIFF_SERVICE,
        expect.any(Function)
      );
    });
  });

  describe('registerAllDependencies', () => {
    it('should register all dependency types', () => {
      // Call the function
      registerAllDependencies(container);

      // Verify all registrations were made
      expect(container.register).toHaveBeenCalled();
      expect(container.registerSingleton).toHaveBeenCalledTimes(3); // FileSystem, FilePathProcessor, DiffService
    });
  });
});