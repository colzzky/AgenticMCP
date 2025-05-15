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
  const mockCommandInstance = {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    parseAsync: jest.fn().mockResolvedValue(undefined),
    outputHelp: jest.fn(),
    on: jest.fn().mockReturnThis(),
  };

  const callOrder: string[] = [];
  const recordCall = (name: string, fn: jest.Mock) => {
    return (...args: any[]) => {
      callOrder.push(name);
      return fn(...args);
    };
  };

  // Additional mocks for new DI requirements
  const mockLocalShellCliToolInstance = {};
  const mockSpawn = {};
  const mockKeytar = {};
  const mockDILocalShellCliTool = jest.fn();
  const mockDefaultShellCommandWrapper = jest.fn();
  const mockSHELL_COMMANDS = Object.freeze(["ls", "echo"]);

  // Mock CredentialManager as a class
  const mockCredentialManagerInstance = {};
  const mockCredentialManager = jest.fn().mockImplementation(() => mockCredentialManagerInstance);

  // Mock NodeFileSystem and DefaultFilePathProcessorFactory
  const mockNodeFileSystemInstance = {};
  const mockNodeFileSystem = jest.fn().mockImplementation(() => mockNodeFileSystemInstance);
  const mockFilePathProcessorFactoryInstance = {};
  const mockDefaultFilePathProcessorFactory = jest.fn().mockImplementation(() => mockFilePathProcessorFactoryInstance);

  // Mock local CLI tool instance and other components
  const mockLocalCliToolInstance = {};
  const mockToolRegistry = {};
  const mockToolExecutor = {};
  const mockToolResultFormatter = {};
  const mockConfigManager = {};
  const mockProviderInitializer = {};
  // Track ProviderFactory instantiation and arguments
  const mockProviderFactoryInstance = {};
  const mockProviderFactory = jest.fn().mockImplementation((configManager, logger) => {
    mockProviderFactory.calledWith = [configManager, logger];
    return mockProviderFactoryInstance;
  });

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
      localCliToolInstance: mockLocalCliToolInstance,
      localShellCliToolInstance: mockLocalShellCliToolInstance
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
    recordCall('setupProviderSystem', jest.fn((configManager, providerInitializer, toolRegistry, logger, path, fs, defaultAppConfig, ProviderFactoryCtor, credentialManagerInstance) => {
      // Simulate real DI: instantiate ProviderFactory
      const providerFactoryInstance = ProviderFactoryCtor(configManager, logger);
      return {
        configManager: mockConfigManager,
        providerInitializer: mockProviderInitializer,
        providerFactory: ProviderFactoryCtor,
        providerFactoryInstance,
      };
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

  return {
    mockCommandInstance,
    callOrder,
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
    spawn: mockSpawn,
    keytar: mockKeytar,
    setupDependencyInjection: mockSetupDependencyInjection,
    setupToolSystem: mockSetupToolSystem,
    setupProviderSystem: mockSetupProviderSystem,
    setupCliCommands: mockSetupCliCommands,
    runProgram: mockRunProgram,
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
    NodeFileSystem: mockNodeFileSystem,
    DefaultFilePathProcessorFactory: mockDefaultFilePathProcessorFactory,
    DIFilePathProcessor: jest.fn(),
    McpCommands: jest.fn(),
    LLMCommand: jest.fn(),
    ToolCommands: jest.fn(),
    McpServer: jest.fn(),
    BaseMcpServer: jest.fn(),
    StdioServerTransport: jest.fn(),
    CredentialManager: mockCredentialManager,
    RoleBasedToolsRegistrarFactory: {
      createDefault: jest.fn().mockReturnValue({}),
    },
    DILocalShellCliTool: mockDILocalShellCliTool,
    DefaultShellCommandWrapper: mockDefaultShellCommandWrapper,
    SHELL_COMMANDS: mockSHELL_COMMANDS,
    defaultAppConfig: {
      appName: 'test-app',
    } as any,
  };
}

describe('mainDI - Dependency Injected Main Function', () => {
  let deps: ReturnType<typeof createMockDependencies>;

  beforeEach(() => {
    deps = createMockDependencies();
  });

  it('should initialize core components and follow expected workflow', async () => {
    await mainDI(deps);
    expect(deps.Command).toHaveBeenCalled();
    expect(deps.mockCommandInstance.version).toHaveBeenCalled();
    expect(deps.mockCommandInstance.description).toHaveBeenCalled();
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();
    expect(deps.DIContainer.getInstance).toHaveBeenCalled();
    expect(deps.setupDependencyInjection).toHaveBeenCalled();
    expect(deps.setupToolSystem).toHaveBeenCalled();
    expect(deps.setupProviderSystem).toHaveBeenCalled();
    expect(deps.setupCliCommands).toHaveBeenCalled();
    expect(deps.runProgram).toHaveBeenCalled();
    expect(deps.callOrder).toEqual(
      expect.arrayContaining([
        'setupDependencyInjection',
        'setupToolSystem',
        'setupProviderSystem',
        'setupCliCommands',
        'runProgram'
      ])
    );
    const anySetupCallIncludesLogger = [
      deps.setupDependencyInjection,
      deps.setupToolSystem,
      deps.setupProviderSystem
    ].some(fn => fn.mock.calls.some(call => call.includes(deps.logger)));
    expect(anySetupCallIncludesLogger).toBe(true);
  });

  it('should handle errors properly', async () => {
    const testError = new Error('Test error');
    deps.runProgram.mockImplementationOnce(() => { throw testError; });
    await mainDI(deps);
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled error in main function: Test error')
    );
    expect(deps.process.exit).toHaveBeenCalledWith(1);
  });

  it('should provide required dependencies to setup functions', async () => {
    await mainDI(deps);
    const diCall = deps.setupDependencyInjection.mock.calls[0];
    expect(diCall).toContain(deps.DIContainer.getInstance());
    expect(diCall).toContain(deps.logger);
    const diCallContainsServices = diCall.some(arg => arg === deps.FileSystemService) &&
      diCall.some(arg => arg === deps.DiffService);
    expect(diCallContainsServices).toBe(true);
    const diCallContainsSystemDeps = diCall.some(arg => arg === deps.path ||
      arg === deps.fs ||
      arg === deps.process);
    expect(diCallContainsSystemDeps).toBe(true);
  });

  it('should pass the correct parameters to setupProviderSystem', async () => {
    await mainDI(deps);
    const args = deps.setupProviderSystem.mock.calls[0];
    expect(args[0]).toBe(deps.ConfigManager);
    expect(args[1]).toBe(deps.ProviderInitializer);
    expect(args[3]).toBe(deps.logger);
    expect(args[4]).toBe(deps.path);
    expect(args[5]).toBe(deps.fs);
    expect(args[6]).toBe(deps.defaultAppConfig);
    expect(args[7]).toBe(deps.ProviderFactory);
    expect(args[8]).toBeInstanceOf(Object); // CredentialManager instance
  });

  it('should properly initialize Core Framework components', async () => {
    await mainDI(deps);
    const providerSystemCalls = deps.setupProviderSystem.mock.calls[0] || [];
    expect(providerSystemCalls).toContain(deps.ConfigManager);
    const coreSetupFunctions = [
      deps.setupDependencyInjection,
      deps.setupToolSystem,
      deps.setupProviderSystem
    ];
    const loggerUsedInSetup = coreSetupFunctions.some(fn =>
      fn.mock.calls.some(call => call.includes(deps.logger))
    );
    expect(loggerUsedInSetup).toBe(true);
    expect(deps.DIContainer.getInstance).toHaveBeenCalled();
    const serviceClassesUsed = coreSetupFunctions.some(fn =>
      fn.mock.calls.some(call =>
        call.includes(deps.FileSystemService) || call.includes(deps.DiffService)
      )
    );
    expect(serviceClassesUsed).toBe(true);
  });

  it('should properly initialize the Provider System components', async () => {
    await mainDI(deps);
    // ProviderFactory is passed as a constructor to setupProviderSystem, not called in mainDI directly
    expect(deps.setupProviderSystem).toHaveBeenCalledWith(
      deps.ConfigManager,
      deps.ProviderInitializer,
      expect.anything(),
      deps.logger,
      deps.path,
      deps.fs,
      deps.defaultAppConfig,
      deps.ProviderFactory,
      expect.anything()
    );
    // The mock ProviderFactory should have been instantiated by setupProviderSystem
    expect(deps.ProviderFactory).toHaveBeenCalledWith(deps.ConfigManager, deps.logger);
  });

  it('should properly set up Tool Calling System components', async () => {
    await mainDI(deps);
    expect(deps.setupToolSystem).toHaveBeenCalled();
    const toolSystemCall = deps.setupToolSystem.mock.calls[0] || [];
    const coreToolClassesUsed = [
      deps.ToolRegistry,
      deps.ToolExecutor,
      deps.ToolResultFormatter
    ].some(toolClass => toolSystemCall.includes(toolClass));
    expect(coreToolClassesUsed).toBe(true);
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();
    const cliCommandsCall = deps.setupCliCommands.mock.calls[0] || [];
    const commandClassesIncluded = [
      deps.McpCommands,
      deps.LLMCommand,
      deps.ToolCommands
    ].some(cmdClass => cliCommandsCall.includes(cmdClass));
    expect(commandClassesIncluded).toBe(true);
    const serverClassesIncluded = [
      deps.McpServer,
      deps.BaseMcpServer,
      deps.StdioServerTransport
    ].some(serverClass => cliCommandsCall.includes(serverClass));
    expect(serverClassesIncluded).toBe(true);
  });

  it('should implement key architectural patterns properly', async () => {
    await mainDI(deps);
    const container = deps.DIContainer.getInstance();
    expect(deps.setupDependencyInjection.mock.calls[0][0]).toBe(container);
    expect(deps.setupProviderSystem).toHaveBeenCalled();
    // ProviderFactory is not called directly in mainDI, but should be instantiated in setupProviderSystem
    expect(deps.ProviderFactory).toHaveBeenCalledWith(deps.ConfigManager, deps.logger);
    expect(deps.RoleBasedToolsRegistrarFactory.createDefault).toHaveBeenCalled();
    expect(deps.DefaultFilePathProcessorFactory).toHaveBeenCalledWith(
      deps.path,
      expect.any(Object), // nfsInstance
      deps.fs,
      deps.process,
      deps.DIFilePathProcessor
    );
    expect(deps.callOrder).toEqual([
      'setupDependencyInjection',
      'setupToolSystem',
      'setupProviderSystem',
      'setupCliCommands',
      'runProgram'
    ]);
  });

  it('should set up components needed for features described in KNOWLEDGE.md', async () => {
    await mainDI(deps);
    // Only check that setupCliCommands is called with the correct number of arguments and key classes
    expect(deps.setupCliCommands).toHaveBeenCalled();
    const cliArgs = deps.setupCliCommands.mock.calls[0];
    expect(cliArgs.length).toBeGreaterThanOrEqual(18);
    expect(cliArgs).toEqual(
      expect.arrayContaining([
        deps.McpCommands,
        deps.LLMCommand,
        deps.ToolCommands,
        deps.McpServer,
        deps.BaseMcpServer,
        deps.StdioServerTransport
      ])
    );
    expect(deps.NodeFileSystem).toHaveBeenCalledWith(deps.path, deps.fs);
    expect(deps.DefaultFilePathProcessorFactory).toHaveBeenCalled();
  });
});
