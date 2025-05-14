// @ts-ignore 
/**
 * Unit tests for mainDI function
 * Tests the fully dependency-injected version of the main function
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mainDI, MainDependencies, SetupDependencyInjectionFn, SetupToolSystemFn, SetupProviderSystemFn, SetupCliCommandsFn, RunProgramFn } from '../src/mainDI.js';

// Test helper to create mocked version of dependencies
function createMockDependencies(): MainDependencies & { 
  mockCommandInstance: any;
  callOrder: string[];
} {
  // Create a command mock
  const mockCommandInstance = {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    parseAsync: jest.fn().mockResolvedValue(undefined),
    outputHelp: jest.fn(),
    on: jest.fn().mockReturnThis(),
  };
  
  // Track function call order
  const callOrder: string[] = [];
  const recordCall = (name: string, fn: jest.Mock) => {
    return (...args: any[]) => {
      callOrder.push(name);
      return fn(...args);
    };
  };
  
  // Mock local CLI tool instance and other components
  const mockLocalCliToolInstance = {};
  const mockToolRegistry = {};
  const mockToolExecutor = {};
  const mockToolResultFormatter = {};
  const mockConfigManager = {};
  const mockProviderInitializer = {};
  const mockProviderFactory = {};
  
  // Create all mocks
  const mockLogger = {
    info: jest.fn().mockImplementation(() => {}),
    error: jest.fn().mockImplementation(() => {}),
    debug: jest.fn().mockImplementation(() => {}),
    warn: jest.fn().mockImplementation(() => {}),
    setLogLevel: jest.fn().mockImplementation(() => {}),
  } as const;
  
  const mockProcess = {
    cwd: jest.fn().mockReturnValue('/test/dir'),
    exit: jest.fn(),
    argv: ['node', 'index.js'],
    env: {},
  };
  
  const mockSetupDependencyInjection = jest.fn().mockImplementation(
    recordCall('setupDependencyInjection', jest.fn().mockReturnValue({ 
      localCliToolInstance: mockLocalCliToolInstance 
    }))
  ) as unknown as SetupDependencyInjectionFn;
  
  const mockSetupToolSystem = jest.fn().mockImplementation(
    recordCall('setupToolSystem', jest.fn().mockReturnValue({
      toolRegistry: mockToolRegistry,
      toolExecutor: mockToolExecutor,
      toolResultFormatter: mockToolResultFormatter,
    }))
  ) as unknown as SetupToolSystemFn;
  
  const mockSetupProviderSystem = jest.fn().mockImplementation(
    recordCall('setupProviderSystem', jest.fn().mockReturnValue({
      configManager: mockConfigManager,
      providerInitializer: mockProviderInitializer,
      providerFactory: mockProviderFactory,
    }))
  ) as unknown as SetupProviderSystemFn;
  
  const mockSetupCliCommands = jest.fn().mockImplementation(
    recordCall('setupCliCommands', jest.fn())
  ) as unknown as SetupCliCommandsFn;
  
  const mockRunProgram = jest.fn().mockImplementation(
    recordCall('runProgram', jest.fn().mockResolvedValue(undefined))
  ) as unknown as RunProgramFn;
  
  const mockDIContainer = {
    getInstance: jest.fn().mockReturnValue({
      register: jest.fn(),
      get: jest.fn(),
    }),
  };
  
  // Return all mock dependencies
  return {
    // The command instance and call order are returned for test assertions
    mockCommandInstance,
    callOrder,
    
    // Core dependencies
    pkg: {
      version: '1.0.0',
      description: 'Test Description',
    },
    logger: mockLogger,
    process: mockProcess as unknown as NodeJS.Process,
    path: {
      join: jest.fn().mockImplementation((...parts) => parts.join('/')),
      resolve: jest.fn().mockReturnValue('/resolved/path'),
    } as any,
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    } as any,
    
    // Setup functions
    setupDependencyInjection: mockSetupDependencyInjection,
    setupToolSystem: mockSetupToolSystem,
    setupProviderSystem: mockSetupProviderSystem,
    setupCliCommands: mockSetupCliCommands,
    runProgram: mockRunProgram,
    
    // Classes and factories
    Command: jest.fn().mockImplementation(() => mockCommandInstance),
    DIContainer: mockDIContainer,
    FileSystemService: jest.fn(),
    DiffService: jest.fn(),
    DILocalCliTool: jest.fn(),
    ToolRegistry: jest.fn(),
    ToolExecutor: jest.fn(),
    ToolResultFormatter: jest.fn(),
    ConfigManager: jest.fn(),
    ProviderInitializer: jest.fn(),
    ProviderFactory: jest.fn().mockImplementation(() => ({
      setToolRegistry: jest.fn(),
    })),
    NodeFileSystem: jest.fn().mockImplementation(() => ({})),
    DefaultFilePathProcessorFactory: jest.fn().mockImplementation(() => ({})),
    DIFilePathProcessor: jest.fn(),
    McpCommands: jest.fn(),
    LLMCommand: jest.fn(),
    ToolCommands: jest.fn(),
    McpServer: jest.fn(),
    BaseMcpServer: jest.fn(),
    StdioServerTransport: jest.fn(),
    CredentialManager: jest.fn(),
    RoleBasedToolsRegistrarFactory: {
      createDefault: jest.fn().mockReturnValue({}),
    },
    
    // Configuration
    defaultAppConfig: {
      appName: 'test-app',
    } as any,
  };
}

describe('mainDI - Dependency Injected Main Function', () => {
  let deps: ReturnType<typeof createMockDependencies>;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    deps = createMockDependencies();
    
    // Set global process for each test
    globalThis.process = deps.process;
  });
  
  it('should initialize all components in the correct order', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // Verify Command is initialized with version and description
    expect(deps.Command).toHaveBeenCalled();
    expect(deps.mockCommandInstance.version).toHaveBeenCalledWith(deps.pkg.version);
    expect(deps.mockCommandInstance.description).toHaveBeenCalledWith(deps.pkg.description);
    
    // Verify role registrar is created
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();
    
    // Verify DI container is initialized
    expect(deps.DIContainer.getInstance).toHaveBeenCalled();
    
    // Verify all setup functions are called
    expect(deps.setupDependencyInjection).toHaveBeenCalled();
    expect(deps.setupToolSystem).toHaveBeenCalled();
    expect(deps.setupProviderSystem).toHaveBeenCalled();
    expect(deps.setupCliCommands).toHaveBeenCalled();
    expect(deps.runProgram).toHaveBeenCalled();
    
    // Verify execution order is correct
    expect(deps.callOrder).toEqual([
      'setupDependencyInjection',
      'setupToolSystem',
      'setupProviderSystem',
      'setupCliCommands',
      'runProgram'
    ]);
    
    // Verify logger is passed to setup functions
    expect(deps.setupDependencyInjection.mock.calls[0][1]).toBe(deps.logger);
    expect(deps.setupToolSystem.mock.calls[0][4]).toBe(deps.logger);
    expect(deps.setupProviderSystem.mock.calls[0][3]).toBe(deps.logger);
  });
  
  it('should handle errors properly', async () => {
    // Make runProgram throw an error
    const testError = new Error('Test error');
    deps.runProgram.mockImplementationOnce(() => {
      throw testError;
    });
    
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // Verify error is logged
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled error in main function: Test error')
    );
    
    // Verify process.exit is called with error code
    expect(deps.process.exit).toHaveBeenCalledWith(1);
  });
  
  it('should pass the correct parameters to setupDependencyInjection', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // Get the arguments passed to setupDependencyInjection
    const args = deps.setupDependencyInjection.mock.calls[0];
    
    // Verify the correct arguments are passed
    expect(args[0]).toBe(deps.DIContainer.getInstance());
    expect(args[1]).toBe(deps.logger);
    expect(args[2]).toBe(deps.FileSystemService);
    expect(args[3]).toBe(deps.DiffService);
    expect(args[4]).toBe(deps.path);
    expect(args[5]).toBe(deps.fs);
    expect(args[6]).toBe(deps.process);
    expect(args[7]).toBe(deps.DILocalCliTool);
  });
  
  it('should pass the correct parameters to setupProviderSystem', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // Get the arguments passed to setupProviderSystem
    const args = deps.setupProviderSystem.mock.calls[0];
    
    // Verify the correct arguments are passed
    expect(args[0]).toBe(deps.ConfigManager);
    expect(args[1]).toBe(deps.ProviderInitializer);
    // args[2] is toolRegistry which comes from setupToolSystem result
    expect(args[3]).toBe(deps.logger);
    expect(args[4]).toBe(deps.path);
    expect(args[5]).toBe(deps.fs);
    expect(args[6]).toBe(deps.defaultAppConfig);
    expect(args[7]).toBe(deps.ProviderFactory);
  });

  // Tests related to Core Framework (KNOWLEDGE.md section 1)
  it('should properly initialize the Core Framework components', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // Verify Configuration Management is initialized (lines 11-14 in KNOWLEDGE.md)
    // Since we don't directly call ConfigManager constructor in the main function,
    // we verify it's passed to the setupProviderSystem function
    expect(deps.setupProviderSystem).toHaveBeenCalledWith(
      deps.ConfigManager, // ConfigManager is passed to the setup function
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    
    // Verify Logging is used in the setup process (lines 26-29 in KNOWLEDGE.md)
    // We don't explicitly need to check logger.info, we just verify logger is passed to critical functions
    expect(deps.setupToolSystem.mock.calls[0][4]).toBe(deps.logger);
    expect(deps.setupProviderSystem.mock.calls[0][3]).toBe(deps.logger);
    
    // Verify DI container is properly utilized (lines 246-249 in KNOWLEDGE.md)
    expect(deps.DIContainer.getInstance).toHaveBeenCalled();
    
    // Verify FileSystemService and DiffService are used in DI setup
    expect(deps.setupDependencyInjection).toHaveBeenCalledWith(
      expect.anything(),
      deps.logger,
      deps.FileSystemService, // FileSystem for configuration management
      deps.DiffService, // DiffService for content comparison
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });
  
  // Tests related to Provider System (KNOWLEDGE.md section 2)
  it('should properly initialize the Provider System components', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // Verify Provider Factory integration (lines 33-36 in KNOWLEDGE.md)
    // The provider factory instance is created in the main function
    expect(deps.ProviderFactory).toHaveBeenCalledWith(
      expect.anything(), // configManager
      deps.logger // logger is passed to ProviderFactory
    );
    
    // Verify provider system setup is called with necessary components
    expect(deps.setupProviderSystem).toHaveBeenCalledWith(
      deps.ConfigManager,
      deps.ProviderInitializer,
      expect.anything(), // toolRegistry from previous step
      deps.logger,
      deps.path,
      deps.fs,
      deps.defaultAppConfig,
      deps.ProviderFactory
    );
  });
  
  // Tests related to Tool Integration (KNOWLEDGE.md section 5) 
  it('should properly set up the Tool Calling System', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // Verify Tool System setup is called with necessary components
    expect(deps.setupToolSystem).toHaveBeenCalledWith(
      expect.anything(), // localCliToolInstance from previous step
      deps.ToolRegistry,  // Tool Registry is passed to setup function
      deps.ToolExecutor,  // Tool Executor is passed to setup function
      deps.ToolResultFormatter, // Tool Result Formatter is passed
      deps.logger
    );
    
    // Verify RoleBasedTools are set up (part of tool calling system)
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();
    
    // Verify dynamic tool calling workflow setup (lines 92-98 in KNOWLEDGE.md)
    // This is done by verifying that the setupCliCommands connects everything together
    expect(deps.setupCliCommands).toHaveBeenCalledWith(
      expect.anything(), // program
      deps.path,
      deps.fs,
      deps.McpCommands,
      deps.LLMCommand,
      deps.ToolCommands,
      expect.anything(), // configManager
      deps.logger,
      expect.anything(), // toolRegistry
      expect.anything(), // toolExecutor
      deps.process,
      expect.anything(), // filePathProcessorFactory
      expect.anything(), // providerFactoryInstance
      deps.McpServer,
      deps.BaseMcpServer,
      deps.StdioServerTransport,
      deps.ProviderFactory,
      deps.CredentialManager,
      expect.anything() // roleRegistrar
    );
  });
  
  // Tests for Architecture Patterns (KNOWLEDGE.md section on Architectural Patterns)
  it('should implement key architectural patterns properly', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // 1. Test Dependency Injection pattern (lines 246-249)
    const container = deps.DIContainer.getInstance();
    expect(deps.setupDependencyInjection.mock.calls[0][0]).toBe(container);
    
    // 2. Test Adapter Pattern indirectly through provider setup (lines 250-252)
    expect(deps.setupProviderSystem).toHaveBeenCalled();
    
    // 3. Test Factory Pattern through factory invocations (lines 253-255)
    expect(deps.ProviderFactory).toHaveBeenCalled();
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();
    
    // 4. Test DefaultFilePathProcessorFactory creation (another factory pattern)
    expect(deps.DefaultFilePathProcessorFactory).toHaveBeenCalledWith(
      deps.path,
      expect.anything(), // nfsInstance
      deps.fs,
      deps.process,
      deps.DIFilePathProcessor
    );
    
    // 5. Verify the sequence follows the Key Workflows section (lines 263-285)
    expect(deps.callOrder).toEqual([  
      'setupDependencyInjection',
      'setupToolSystem',
      'setupProviderSystem',
      'setupCliCommands',
      'runProgram'
    ]);
  });
  
  // Test features specific to KNOWLEDGE.md requirements
  it('should set up components needed for features described in KNOWLEDGE.md', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);
    
    // 1. Test MCP support (Model Context Protocol) - a key component in KNOWLEDGE.md
    expect(deps.setupCliCommands).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      deps.McpCommands, // MCP Commands class
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      deps.McpServer, // MCP Server implementation
      deps.BaseMcpServer, // Base MCP Server for standardization
      deps.StdioServerTransport, // StdioServerTransport for I/O
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    
    // 2. Test NodeFileSystem adapter creation for local tool operations (lines 159-162)
    expect(deps.NodeFileSystem).toHaveBeenCalledWith(deps.path, deps.fs);
    
    // 3. Test the creation of DefaultFilePathProcessorFactory for context management (lines 142-156)
    expect(deps.DefaultFilePathProcessorFactory).toHaveBeenCalled();
    
    // 4. Verify command system components are passed to setupCliCommands
    expect(deps.setupCliCommands).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      deps.LLMCommand, // LLM Command for provider interactions
      deps.ToolCommands, // Tool Commands for tool integration
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });
});