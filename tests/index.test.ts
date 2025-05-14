/**
 * Unit tests for the main and mainDI functions in src/index.ts/mainDI.ts
 * These tests focus on confirming behavioral flow, DI flexibility, and error handling.
 * Mocks are created with jest-mock-extended for type safety and future-proofing.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';
import type { MainDependencies } from '../src/mainDI';
import { mainDI } from '../src/mainDI';

// Helper: Create a fully mocked MainDependencies object
function createMockDeps() {
  const deps = mockDeep<MainDependencies>();
  // Provide minimal required values for non-object fields
  deps.pkg.version = '1.0.0';
  deps.pkg.description = 'Test AgenticMCP';
  deps.SHELL_COMMANDS = ['ls', 'echo'];
  deps.defaultAppConfig = {} as any; // Acceptable for config object
  
  // Mock the Commander program properly
  const mockCommandInstance = {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    parseAsync: jest.fn().mockResolvedValue(undefined),
    outputHelp: jest.fn(),
    on: jest.fn().mockReturnThis()
  };
  
  // Set up Command constructor mock
  deps.Command = jest.fn().mockImplementation(() => mockCommandInstance) as any;
  
  return deps;
}

describe('mainDI Dependency Injection', () => {
  let deps: ReturnType<typeof createMockDeps>;
  let mockCommandInstance: any;
  let originalExit: any;
  
  beforeEach(() => {
    jest.resetModules();
    deps = createMockDeps();
    
    // Reset all mocks
    mockReset(deps);
    
    // Create a proper mock for the Command instance
    mockCommandInstance = {
      version: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      parseAsync: jest.fn().mockResolvedValue(undefined),
      outputHelp: jest.fn(),
      on: jest.fn().mockReturnThis()
    };
    
    // Set up Command constructor mock
    deps.Command = jest.fn().mockImplementation(() => mockCommandInstance) as any;
    
    // Mock the RoleBasedToolsRegistrarFactory
    deps.RoleBasedToolsRegistrarFactory = {
      createDefault: jest.fn().mockReturnValue({})
    } as any;
    
    // Always mock process.exit
    originalExit = deps.process.exit;
    deps.process.exit = jest.fn() as any;
  });
  
  afterEach(() => {
    // Restore process.exit
    deps.process.exit = originalExit;
  });

  it('runs the main flow and calls all setup functions in order', async () => {
    // Arrange: Set up mock return values and call order tracking
    const callOrder: string[] = [];
    
    deps.setupDependencyInjection.mockImplementation((...args) => {
      callOrder.push('setupDependencyInjection');
      return { localCliToolInstance: {}, localShellCliToolInstance: {} };
    });
    deps.setupToolSystem.mockImplementation((...args) => {
      callOrder.push('setupToolSystem');
      return { toolRegistry: {}, toolExecutor: {}, toolResultFormatter: {} };
    });
    deps.setupProviderSystem.mockImplementation((...args) => {
      callOrder.push('setupProviderSystem');
      return { configManager: {}, providerInitializer: {}, providerFactory: {} };
    });
    deps.setupCliCommands.mockImplementation((...args) => {
      callOrder.push('setupCliCommands');
    });
    deps.runProgram.mockImplementation(async (...args) => {
      callOrder.push('runProgram');
    });

    // Act
    await mainDI(deps);

    // Assert: All setup functions are called in order
    expect(callOrder).toEqual([
      'setupDependencyInjection',
      'setupToolSystem',
      'setupProviderSystem',
      'setupCliCommands',
      'runProgram',
    ]);
    // Logger is passed to each setup function
    expect(deps.setupDependencyInjection.mock.calls[0][1]).toBe(deps.logger);
    expect(deps.setupToolSystem.mock.calls[0][5]).toBe(deps.logger); // Updated index
    expect(deps.setupProviderSystem.mock.calls[0][3]).toBe(deps.logger);
    expect(deps.setupCliCommands.mock.calls[0][7]).toBe(deps.logger);
    expect(deps.runProgram.mock.calls[0][2]).toBe(deps.logger);
  });

  it('logs and exits on error thrown by runProgram', async () => {
    // Arrange
    const testError = new Error('Test error');
    testError.stack = 'Fake stack trace';
    
    // Mock the required functions to avoid "undefined" errors before the error throw
    deps.setupDependencyInjection.mockReturnValue({ localCliToolInstance: {}, localShellCliToolInstance: {} });
    deps.setupToolSystem.mockReturnValue({ toolRegistry: {}, toolExecutor: {}, toolResultFormatter: {} });
    deps.setupProviderSystem.mockReturnValue({ configManager: {}, providerInitializer: {}, providerFactory: {} });
    
    // Set up the error throw
    deps.runProgram.mockImplementation(async () => {
      throw testError;
    });
    
    // Act
    await mainDI(deps);
    
    // Assert
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled error in main function: Test error')
    );
    
    // Check that process.exit was called with 1
    expect(deps.process.exit).toHaveBeenCalledWith(1);
  });

  it('allows full replacement of dependencies for testing', async () => {
    // Arrange: Replace only one setup function to verify DI flexibility
    const marker = jest.fn();
    
    // Mock the required functions to avoid "undefined" errors before the test
    deps.setupDependencyInjection.mockReturnValue({ localCliToolInstance: {}, localShellCliToolInstance: {} });
    deps.setupToolSystem.mockReturnValue({ toolRegistry: {}, toolExecutor: {}, toolResultFormatter: {} });
    deps.setupProviderSystem.mockReturnValue({ configManager: {}, providerInitializer: {}, providerFactory: {} });
    
    // This is the actual test - replacing setupCliCommands with our custom implementation
    deps.setupCliCommands.mockImplementation(() => marker());
    
    // Act
    await mainDI(deps);
    
    // Assert
    expect(marker).toHaveBeenCalled();
  });
});