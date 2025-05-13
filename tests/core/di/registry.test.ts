/**
 * @file Tests for DI registry
 */

import { jest } from '@jest/globals';
import { MockProxy, mock, mockReset } from 'jest-mock-extended';
import {
  registerCoreDependencies,
  registerContextDependencies,
  registerToolDependencies,
  registerAllDependencies
} from '../../../src/core/di/registry';
import { DIContainer } from '../../../src/core/di/container';
import { DI_TOKENS } from '../../../src/core/di/tokens';
import { IFileSystem } from '../../../src/core/interfaces/file-system.interface';
import { Logger } from '../../../src/core/types/logger.types';
import { mockESModule } from '../../utils/test-setup';

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

// Use mockModule to create the mocks
mockESModule('../../../src/core/adapters/node-file-system.adapter', {
  NodeFileSystem: mockNodeFileSystem
});

mockESModule('../../../src/context/di-file-path-processor', {
  DIFilePathProcessor: mockDIFilePathProcessor
});

mockESModule('../../tools/services/diff-service', {
  DiffService: mockDiffService
}, { virtual: true });

mockESModule('../../../src/core/utils', {
  logger: mockLogger
}, { virtual: true });

describe('DI Registry', () => {
  let container: MockProxy<DIContainer>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.resetModules();
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
      const mockFs = mock<IFileSystem>();
      const mockContextLogger = mock<Logger>();
      
      // Use any to bypass type checking temporarily
      (container.getSingleton as any).mockImplementation((token: string) => {
        if (token === DI_TOKENS.FILE_SYSTEM) {
          return mockFs;
        }
        return undefined;
      });
      
      (container.get as any).mockImplementation((token: string) => {
        if (token === DI_TOKENS.LOGGER) {
          return mockContextLogger;
        }
        return undefined;
      });
      
      registerContextDependencies(container);
      
      // Verify file path processor registration
      expect(container.registerSingleton).toHaveBeenCalledWith(
        DI_TOKENS.FILE_PATH_PROCESSOR,
        expect.any(Function)
      );
      
      // Verify dependencies are retrieved
      expect(container.getSingleton).toHaveBeenCalledWith(DI_TOKENS.FILE_SYSTEM);
      expect(container.get).toHaveBeenCalledWith(DI_TOKENS.LOGGER);
    });

    it('should use existing dependencies when creating DIFilePathProcessor', () => {
      // Mock filesystem and logger
      const mockFs = mock<IFileSystem>();
      const mockContextLogger = mock<Logger>();
      
      // Mock dependency retrieval - use any to bypass type checking temporarily
      (container.getSingleton as any).mockImplementation((token: string) => {
        if (token === DI_TOKENS.FILE_SYSTEM) {
          return mockFs;
        }
        return undefined;
      });
      
      (container.get as any).mockImplementation((token: string) => {
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
      expect(mockDIFilePathProcessor).toHaveBeenCalledWith(mockContextLogger, mockFs);
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
      // Mock individual registration functions
      const mockRegisterCore = jest.spyOn(
        {registerCoreDependencies},
        'registerCoreDependencies'
      ).mockImplementation(() => {});

      const mockRegisterContext = jest.spyOn(
        {registerContextDependencies},
        'registerContextDependencies'
      ).mockImplementation(() => {});

      const mockRegisterTools = jest.spyOn(
        {registerToolDependencies},
        'registerToolDependencies'
      ).mockImplementation(() => {});
      
      registerAllDependencies(container);
      
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