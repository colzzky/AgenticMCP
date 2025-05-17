/**
 * Unit tests for DI Registry
 * Tests the dependency injection registry functions
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DI_TOKENS } from '../../../src/core/di/tokens.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { IFileSystem } from '../../../src/core/interfaces/file-system.interface.js';

// Create mock implementations
const mockRegister = jest.fn();
const mockRegisterSingleton = jest.fn();
const mockGet = jest.fn();
const mockGetSingleton = jest.fn();
const mockClear = jest.fn();

// Mock the DIContainer class
jest.mock('../../../src/core/di/container.js', () => {
  return {
    DIContainer: {
      getInstance: (jest.fn() as any).mockReturnValue({
        register: mockRegister,
        registerSingleton: mockRegisterSingleton,
        get: mockGet,
        getSingleton: mockGetSingleton,
        clear: mockClear
      })
    }
  };
});

// Instead of mocking modules that might cause issues with ESM, 
// let's focus on mocking the functions we're testing directly

// Import after mocking
import { 
  registerCoreDependencies,
  registerContextDependencies,
  registerToolDependencies,
  registerAllDependencies
} from '../../../src/core/di/registry.js';
import { DIContainer } from '../../../src/core/di/container.js';

// Mock DiffService class
const mockDiffService = (jest.fn() as any).mockImplementation(() => ({}));

describe('DI Registry', () => {
  // Common test setup
  const mockContainer = DIContainer.getInstance();
  const mockLogger = { 
    info: jest.fn(), 
    error: jest.fn(), 
    warn: jest.fn(), 
    debug: jest.fn(),
    setLogLevel: jest.fn()
  } as unknown as Logger;
  
  const mockFs = {
    readFile: jest.fn(),
    writeFile: jest.fn()
  } as unknown as IFileSystem;
  
  const mockPath = {
    join: jest.fn(),
    resolve: jest.fn()
  };
  
  const mockFileSystemDI = {
    readFile: jest.fn(),
    writeFile: jest.fn()
  };
  
  const mockProcess = {
    cwd: (jest.fn() as any).mockReturnValue('/test-dir'),
    env: {}
  } as unknown as NodeJS.Process;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCoreDependencies', () => {
    it('should register core dependencies correctly', () => {
      // Act
      registerCoreDependencies(mockContainer, mockLogger, mockPath, mockFileSystemDI);
      
      // Assert
      // Verify logger, path, and filesystem dependencies are registered
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.LOGGER, mockLogger);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.PATH_DI, mockPath);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.FILE_SYSTEM_DI, mockFileSystemDI);
      
      // Verify FILE_SYSTEM singleton is registered
      expect(mockRegisterSingleton).toHaveBeenCalledWith(
        DI_TOKENS.FILE_SYSTEM,
        expect.any(Function)
      );
    });
  });

  describe('registerContextDependencies', () => {
    it('should register context processing dependencies correctly', () => {
      // Act
      registerContextDependencies(
        mockContainer,
        mockLogger,
        mockFs,
        mockPath,
        mockFileSystemDI,
        mockProcess
      );
      
      // Assert
      // Verify all required dependencies are registered
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.LOGGER, mockLogger);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.FILE_SYSTEM, mockFs);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.PATH_DI, mockPath);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.FILE_SYSTEM_DI, mockFileSystemDI);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.PROCESS_DI, mockProcess);
      
      // Verify FILE_PATH_PROCESSOR singleton is registered
      expect(mockRegisterSingleton).toHaveBeenCalledWith(
        DI_TOKENS.FILE_PATH_PROCESSOR,
        expect.any(Function)
      );
    });
  });

  describe('registerToolDependencies', () => {
    it('should register tool dependencies correctly', async () => {
      // Act
      await registerToolDependencies(mockContainer, mockDiffService);
      
      // Assert
      // Verify DIFF_SERVICE singleton is registered
      expect(mockRegisterSingleton).toHaveBeenCalledWith(
        DI_TOKENS.DIFF_SERVICE,
        expect.any(Function)
      );
    });
  });

  describe('registerAllDependencies', () => {
    it('should register all dependencies', async () => {
      // Act
      await registerAllDependencies(
        mockContainer,
        mockDiffService,
        mockLogger,
        mockFs,
        mockPath,
        mockFileSystemDI,
        mockProcess
      );
      
      // Assert - verify correct calls to register functions
      // This is just verifying that the dependencies are passed correctly
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.LOGGER, mockLogger);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.PATH_DI, mockPath);
      expect(mockRegister).toHaveBeenCalledWith(DI_TOKENS.FILE_SYSTEM_DI, mockFileSystemDI);
      
      // Verify some key singletons
      expect(mockRegisterSingleton).toHaveBeenCalledWith(
        DI_TOKENS.FILE_SYSTEM,
        expect.any(Function)
      );
      
      expect(mockRegisterSingleton).toHaveBeenCalledWith(
        DI_TOKENS.DIFF_SERVICE,
        expect.any(Function)
      );
    });
  });
});