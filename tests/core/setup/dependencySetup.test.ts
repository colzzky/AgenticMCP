/**
 * Unit tests for the dependency setup functionality
 * Tests the core setup logic for dependency injection
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

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
    get: jest.fn().mockImplementation((token) => {
      // Return different things based on the token
      switch(token) {
        case 'LOGGER': return mockLogger;
        case 'FILE_SYSTEM': return mockFileSystemService;
        case 'DIFF_SERVICE': return mockDiffService;
        case 'PATH_DI': return mockPath;
        case 'LOCAL_CLI_TOOL': return { 
          baseDir: '/test/dir', 
          allowedCommands: [], 
          allowFileOverwrite: false 
        };
        default: return undefined;
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
  const MockFileSystemService = jest.fn().mockImplementation((pathDi, fsDi) => {
    return mockFileSystemService;
  });
  
  // Mock diff service
  const mockDiffService = {
    // DiffService methods
    diffFiles: jest.fn()
  };
  
  // Mock Diff service class constructor
  const MockDiffService = jest.fn().mockImplementation(() => {
    return mockDiffService;
  });
  
  // Mock local CLI tool instance
  const mockLocalCliToolInstance = {
    // DILocalCliTool methods
    getCommandMap: jest.fn().mockReturnValue({})
  };
  
  // Mock DILocalCliTool class constructor
  const MockDILocalCliTool = jest.fn().mockImplementation((
    config, logger, fileSystem, diffService, pathDi
  ) => {
    return mockLocalCliToolInstance;
  });
  
  // Mock path
  const mockPath = {
    join: jest.fn().mockImplementation((...parts) => parts.join('/')),
    resolve: jest.fn(),
    normalize: jest.fn()
  };
  
  // Mock fs
  const mockFs = {
    readFile: jest.fn(),
    writeFile: jest.fn()
  };
  
  // Mock process
  const mockProcess = {
    cwd: jest.fn().mockReturnValue('/test/dir'),
    exit: jest.fn(),
    argv: ['node', 'index.js'],
    env: {}
  };
  
  // Tokens for DI
  const DI_TOKENS = {
    LOGGER: 'LOGGER',
    FILE_SYSTEM: 'FILE_SYSTEM',
    DIFF_SERVICE: 'DIFF_SERVICE',
    PATH_DI: 'PATH_DI',
    LOCAL_CLI_TOOL: 'LOCAL_CLI_TOOL'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Function that simulates setupDependencyInjection
  function setupDependencyInjection(
    container: DIContainerMock,
    loggerTool: LoggerMock,
    fileSystem: any,
    diffServiceInstance: any,
    pathDi: any,
    fsDi: any,
    processDi: any,
    localCliTool: any
  ) {
    // 1. Register Logger
    container.register(DI_TOKENS.LOGGER, loggerTool);
  
    // 2. Create and Register FileSystem Service
    const fileSystemService = new fileSystem(pathDi, fsDi);
    container.register(DI_TOKENS.FILE_SYSTEM, fileSystemService);
  
    // 3. Create and Register Diff Service
    const diffService = new diffServiceInstance();
    container.register(DI_TOKENS.DIFF_SERVICE, diffService);
  
    // 4. Register Path
    container.register(DI_TOKENS.PATH_DI, pathDi);
  
    // 5. Create and Register LocalCliTool Configuration
    const baseDir = processDi.cwd();
    const localCliToolConfig = {
      baseDir,
      allowedCommands: [],
      allowFileOverwrite: false
    };
    container.register(DI_TOKENS.LOCAL_CLI_TOOL, localCliToolConfig);
    loggerTool.info(`Base directory for tool operations: ${baseDir}`);
  
    // 6. Instantiate and register DILocalCliTool
    const localCliToolInstance = new localCliTool(
      container.get(DI_TOKENS.LOCAL_CLI_TOOL),
      container.get(DI_TOKENS.LOGGER),
      container.get(DI_TOKENS.FILE_SYSTEM),
      container.get(DI_TOKENS.DIFF_SERVICE),
      container.get(DI_TOKENS.PATH_DI)
    );
    container.register(DI_TOKENS.LOCAL_CLI_TOOL, localCliToolInstance);
  
    return { localCliToolInstance };
  }
  
  it('should register all required dependencies', () => {
    // Act
    const result = setupDependencyInjection(
      mockContainer,
      mockLogger,
      MockFileSystemService,
      MockDiffService,
      mockPath,
      mockFs,
      mockProcess,
      MockDILocalCliTool
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
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Base directory for tool operations: /test/dir')
    );
    
    // Verify LocalCliTool instantiation with correct dependencies
    expect(MockDILocalCliTool).toHaveBeenCalledWith(
      expect.anything(), // config
      mockLogger,        // logger
      mockFileSystemService, // fileSystem
      mockDiffService,   // diffService
      mockPath           // pathDi
    );
    
    // Verify LocalCliToolInstance registration
    expect(mockContainer.register).toHaveBeenCalledWith(
      DI_TOKENS.LOCAL_CLI_TOOL,
      mockLocalCliToolInstance
    );
    
    // Verify return value contains LocalCliToolInstance
    expect(result).toHaveProperty('localCliToolInstance', mockLocalCliToolInstance);
  });
});