/**
 * Unit tests for the dependency setup functionality
 * Tests the core setup logic for dependency injection
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { setupDependencyInjection } from '@/core/setup';
import { DI_TOKENS } from '@/core/di/tokens';

// Define interface for our dependency injection container
interface DIContainerMock {
  register: jest.Mock;
  get: jest.Mock;
}

// Define Logger interface
interface LoggerMock {
  info: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
  warn: jest.Mock;
  setLogLevel: jest.Mock;
}

describe('Dependency Injection Setup', () => {
  // Create mock for DIContainer
  const mockContainer: DIContainerMock = {
    register: jest.fn(),
    get: (jest.fn() as any).mockImplementation((token) => {
      // Return different things based on the token
      switch(token) {
        case 'LOGGER': { return mockLogger;
        }
        case 'FILE_SYSTEM': { return mockFileSystemService;
        }
        case 'DIFF_SERVICE': { return mockDiffService;
        }
        case 'PATH_DI': { return mockPath;
        }
        case 'LOCAL_CLI_TOOL': { return { 
          baseDir: '/test/dir', 
          allowedCommands: [], 
          allowFileOverwrite: false 
        };
        }
        default: { return undefined;
        }
      }
    })
  };
  
  // Create mock for Logger
  const mockLogger: LoggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    setLogLevel: jest.fn()
  };
  
  // Mock file system service
  const mockFileSystemService = {
    // FileSystemService methods
    readFile: jest.fn(),
    writeFile: jest.fn()
  };
  
  // Mock FileSystem service class constructor
  const MockFileSystemService = (jest.fn() as any).mockImplementation((pathDi, fsDi) => {
    return mockFileSystemService;
  });
  
  // Mock diff service
  const mockDiffService = {
    // DiffService methods
    diffFiles: jest.fn()
  };
  
  // Mock Diff service class constructor
  const MockDiffService = (jest.fn() as any).mockImplementation(() => {
    return mockDiffService;
  });
  
  // Mock local CLI tool instance
  const mockLocalCliToolInstance = {
    // FileSystemTool methods
    getCommandMap: (jest.fn() as any).mockReturnValue({})
  };
  
  // Mock FileSystemTool class constructor
  const MockFileSystemTool = (jest.fn() as any).mockImplementation((
    config, logger, fileSystem, diffService, pathDi
  ) => {
    return mockLocalCliToolInstance;
  });

  // Mock local shell CLI tool instance
  const mockLocalShellCliToolInstance = {
    // DILocalShellCliTool methods
    getCommandMap: (jest.fn() as any).mockReturnValue({})
  };

  // Mock DILocalShellCliTool class constructor
  const MockDILocalShellCliTool = (jest.fn() as any).mockImplementation((
    config, logger, fileSystem, diffService, pathDi
  ) => {
    return mockLocalShellCliToolInstance;
  });
  
  // Mock path
  const mockPath = {
    join: (jest.fn() as any).mockImplementation((...parts) => parts.join('/')),
    resolve: jest.fn(),
    normalize: jest.fn()
  };
  
  // Mock fs
  const mockFs = {
    readFile: jest.fn(),
    writeFile: jest.fn()
  };

  // Mock spawn
  const mockSpawn = {
    spawn: jest.fn()
  };
  
  // Mock process
  const mockProcess = {
    cwd: (jest.fn() as any).mockReturnValue('/test/dir'),
    exit: jest.fn(),
    argv: ['node', 'index.js'],
    env: {}
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should register all required dependencies', () => {
    // Act
    const result = setupDependencyInjection(
      mockContainer as any,
      mockLogger as any,
      MockFileSystemService as any,
      MockDiffService as any,
      mockPath as any,
      mockFs as any,
      mockProcess as any,
      mockSpawn as any,
      MockFileSystemTool as any,
      MockDILocalShellCliTool as any
    );

    // Assert
    // Verify logger registration
    expect(mockContainer.register).toHaveBeenCalledWith(DI_TOKENS.LOGGER, mockLogger);
    
    // Verify FileSystem service creation and registration
    expect(MockFileSystemService).toHaveBeenCalledWith(mockPath, mockFs);
    expect(mockContainer.register).toHaveBeenCalledWith(
      DI_TOKENS.FILE_SYSTEM,
      mockFileSystemService
    );
    
    // Verify Diff service creation and registration
    expect(MockDiffService).toHaveBeenCalled();
    expect(mockContainer.register).toHaveBeenCalledWith(
      DI_TOKENS.DIFF_SERVICE,
      mockDiffService
    );
    
    // Verify Path registration
    expect(mockContainer.register).toHaveBeenCalledWith(DI_TOKENS.PATH_DI, mockPath);
    
    // Verify LocalCliTool config creation and registration
    expect(mockProcess.cwd).toHaveBeenCalled();
    expect(mockContainer.register).toHaveBeenCalledWith(
      DI_TOKENS.LOCAL_CLI_TOOL,
      expect.objectContaining({
        baseDir: '/test/dir',
        allowedCommands: expect.any(Array)
      })
    );
    
    // Verify logging of base directory
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Base directory for tool operations: /test/dir')
    );
    
    // Verify FileSystemTool is used
    expect(MockFileSystemTool).toHaveBeenCalled();
    
    // In the implementation, FileSystemTool is instantiated using dependencies from the container,
    // not directly from the parameters, so we just check that it was called
    
    // Verify LocalCliToolInstance registration
    expect(mockContainer.register).toHaveBeenCalledWith(
      DI_TOKENS.LOCAL_CLI_TOOL,
      mockLocalCliToolInstance
    );
    
    // Verify DILocalShellCliTool is used
    expect(MockDILocalShellCliTool).toHaveBeenCalled();
    
    // Verify LocalShellCliToolInstance registration
    expect(mockContainer.register).toHaveBeenCalledWith(
      DI_TOKENS.LOCAL_SHELL_CLI_TOOL,
      mockLocalShellCliToolInstance
    );
    
    // Verify return value contains both instances
    expect(result).toHaveProperty('localCliToolInstance', mockLocalCliToolInstance);
    expect(result).toHaveProperty('localShellCliToolInstance', mockLocalShellCliToolInstance);
  });
});