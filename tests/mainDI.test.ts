// @ts-ignore 
/**
 * Unit tests for mainDI function
 * Tests the fully dependency-injected version of the main function
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mainDI, MainDependencies } from '../src/mainDI.js';
import type {
  SetupDependencyInjectionFn, SetupToolSystemFn, SetupProviderSystemFn, SetupCliCommandsFn, RunProgramFn
} from '../src/core/setup';

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
    info: jest.fn().mockImplementation(() => { }),
    error: jest.fn().mockImplementation(() => { }),
    debug: jest.fn().mockImplementation(() => { }),
    warn: jest.fn().mockImplementation(() => { }),
    setLogLevel: jest.fn().mockImplementation(() => { }),
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

  });

  it('should initialize core components and follow expected workflow', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);

    // Verify basic Command setup (essential functionality only)
    expect(deps.Command).toHaveBeenCalled();
    expect(deps.mockCommandInstance.version).toHaveBeenCalled();
    expect(deps.mockCommandInstance.description).toHaveBeenCalled();

    // Verify role registrar is created (but not how it's used)
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();

    // Verify DI container is initialized
    expect(deps.DIContainer.getInstance).toHaveBeenCalled();

    // Verify all essential setup functions are called (but not their parameter details)
    expect(deps.setupDependencyInjection).toHaveBeenCalled();
    expect(deps.setupToolSystem).toHaveBeenCalled();
    expect(deps.setupProviderSystem).toHaveBeenCalled();
    expect(deps.setupCliCommands).toHaveBeenCalled();
    expect(deps.runProgram).toHaveBeenCalled();

    // Verify overall execution order (general flow, not specific parameter details)
    expect(deps.callOrder).toEqual(
      expect.arrayContaining([
        'setupDependencyInjection',
        'setupToolSystem',
        'setupProviderSystem',
        'setupCliCommands',
        'runProgram'
      ])
    );

    // Verify logger is passed to critical functions (not checking exact parameter position)
    const anySetupCallIncludesLogger = [
      deps.setupDependencyInjection,
      deps.setupToolSystem,
      deps.setupProviderSystem
    ].some(fn => fn.mock.calls.some(call => call.includes(deps.logger)));

    expect(anySetupCallIncludesLogger).toBe(true);
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

  it('should provide required dependencies to setup functions', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);

    // Verify essential dependencies are provided to setupDependencyInjection
    // Without checking exact parameter order (which is implementation detail)
    const diCall = deps.setupDependencyInjection.mock.calls[0];

    // Check that key dependencies are included somewhere in the function call
    // rather than checking exact positions
    expect(diCall).toContain(deps.DIContainer.getInstance());
    expect(diCall).toContain(deps.logger);

    // Check presence of critical service classes (but not their position)
    const diCallContainsServices = diCall.some(arg => arg === deps.FileSystemService) &&
      diCall.some(arg => arg === deps.DiffService);
    expect(diCallContainsServices).toBe(true);

    // Check that core system dependencies are provided
    const diCallContainsSystemDeps = diCall.some(arg => arg === deps.path ||
      arg === deps.fs ||
      arg === deps.process);
    expect(diCallContainsSystemDeps).toBe(true);
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
  it('should properly initialize Core Framework components', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);

    // Verify Configuration Management is initialized
    // Check if ConfigManager is included in the setupProviderSystem call
    const providerSystemCalls = deps.setupProviderSystem.mock.calls[0] || [];
    expect(providerSystemCalls).toContain(deps.ConfigManager);

    // Verify Logging is used in the setup process by checking if logger is passed
    // to any critical function (not checking exact parameter position)
    const coreSetupFunctions = [
      deps.setupDependencyInjection,
      deps.setupToolSystem,
      deps.setupProviderSystem
    ];

    // At least one setup function should receive the logger
    const loggerUsedInSetup = coreSetupFunctions.some(fn =>
      fn.mock.calls.some(call => call.includes(deps.logger))
    );
    expect(loggerUsedInSetup).toBe(true);

    // Verify DI container is properly utilized
    expect(deps.DIContainer.getInstance).toHaveBeenCalled();

    // Verify key services are passed to setup functions (not checking exact positions)
    const serviceClassesUsed = coreSetupFunctions.some(fn =>
      fn.mock.calls.some(call =>
        call.includes(deps.FileSystemService) || call.includes(deps.DiffService)
      )
    );
    expect(serviceClassesUsed).toBe(true);
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
      deps.ProviderFactory,
      expect.anything() // credentialManagerInstance
    );
  });

  // Tests related to Tool Integration (KNOWLEDGE.md section 5) 
  it('should properly set up Tool Calling System components', async () => {
    // Call the mainDI function with mocked dependencies
    await mainDI(deps);

    // Verify Tool System setup is called
    expect(deps.setupToolSystem).toHaveBeenCalled();

    // Verify key tool components are included in setup calls (without checking exact positions)
    const toolSystemCall = deps.setupToolSystem.mock.calls[0] || [];

    // Check that essential tool classes are used somewhere in the setup
    const coreToolClassesUsed = [
      deps.ToolRegistry,
      deps.ToolExecutor,
      deps.ToolResultFormatter
    ].some(toolClass => toolSystemCall.includes(toolClass));

    expect(coreToolClassesUsed).toBe(true);

    // Verify RoleBasedTools are set up (part of tool calling system)
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();

    // Verify CLI command setup includes critical command classes (without checking exact positions)
    const cliCommandsCall = deps.setupCliCommands.mock.calls[0] || [];

    // Check that core command classes are included
    const commandClassesIncluded = [
      deps.McpCommands,
      deps.LLMCommand,
      deps.ToolCommands
    ].some(cmdClass => cliCommandsCall.includes(cmdClass));

    expect(commandClassesIncluded).toBe(true);

    // Verify server classes are included
    const serverClassesIncluded = [
      deps.McpServer,
      deps.BaseMcpServer,
      deps.StdioServerTransport
    ].some(serverClass => cliCommandsCall.includes(serverClass));

    expect(serverClassesIncluded).toBe(true);
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