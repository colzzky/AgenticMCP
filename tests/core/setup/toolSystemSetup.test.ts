/**
 * Unit tests for toolSystemSetup
 * Tests the setup of tool registry, executor, and formatter components
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { setupToolSystem } from '../../../src/core/setup/toolSystemSetup.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { DILocalCliTool } from '../../../src/tools/localCliTool.js';
import type { DILocalShellCliTool } from '../../../src/tools/localShellCliTool.js';

// Mock getLocalShellCliToolDefinitions module
jest.mock('../../../src/tools/localShellCliToolDefinitions.js', () => ({
  getLocalShellCliToolDefinitions: jest.fn().mockReturnValue([
    { type: 'function', name: 'run_shell_command', description: 'Run shell command', parameters: { type: 'object', properties: {} } }
  ])
}));

describe('toolSystemSetup', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };
  
  // Mock localCliTool
  const mockLocalCliTool = {
    getCommandMap: jest.fn().mockReturnValue({
      read_file: jest.fn(),
      write_file: jest.fn(),
      list_directory: jest.fn()
    })
  } as unknown as DILocalCliTool;
  
  // Mock localShellCliTool
  const mockLocalShellCliTool = {
    execute: jest.fn(),
    getToolDefinitions: jest.fn().mockReturnValue([
      { type: 'function', name: 'ls', description: 'List directory contents', parameters: { type: 'object', properties: {} } }
    ]),
    getCommandMap: jest.fn().mockReturnValue({
      ls: jest.fn(),
      echo: jest.fn()
    })
  } as unknown as DILocalShellCliTool;
  
  // Mock ToolRegistry
  const mockRegistryInstance = {
    registerLocalCliTools: jest.fn().mockReturnValue(3),
    registerTools: jest.fn().mockReturnValue(1),
    registerTool: jest.fn(),
    getTool: jest.fn(),
    getTools: jest.fn(),
    getAllTools: jest.fn(),
    validateToolsForProvider: jest.fn()
  };
  const MockToolRegistry = jest.fn().mockImplementation(() => mockRegistryInstance);
  
  // Mock ToolExecutor
  const mockExecutorInstance = {
    executeTool: jest.fn(),
    executeToolCall: jest.fn()
  };
  const MockToolExecutor = jest.fn().mockImplementation(() => mockExecutorInstance);
  
  // Mock ToolResultFormatter
  const mockFormatterInstance = {
    formatResult: jest.fn()
  };
  const MockToolResultFormatter = jest.fn().mockImplementation(() => mockFormatterInstance);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create and configure tool system components', () => {
    // Act
    const result = setupToolSystem(
      mockLocalCliTool,
      mockLocalShellCliTool,
      MockToolRegistry as any,
      MockToolExecutor as any,
      MockToolResultFormatter as any,
      mockLogger
    );
    
    // Assert
    // Verify tool registry initialization
    expect(MockToolRegistry).toHaveBeenCalledWith(mockLogger);
    expect(mockRegistryInstance.registerLocalCliTools).toHaveBeenCalledWith(mockLocalCliTool);
    expect(mockLogger.info).toHaveBeenCalledWith('Registered 3 local CLI tools');
    
    // Verify shell tools registration
    expect(mockRegistryInstance.registerTools).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Registered 1 shell CLI tools');
    
    // Verify command map retrieval
    expect(mockLocalCliTool.getCommandMap).toHaveBeenCalled();
    
    // Verify tool executor initialization with correct params
    expect(MockToolExecutor).toHaveBeenCalledWith(
      mockRegistryInstance,
      expect.any(Object), // Just check it's an object, don't validate specific keys
      mockLogger
    );
    
    // Verify tool result formatter initialization
    expect(MockToolResultFormatter).toHaveBeenCalledWith(mockLogger);
    
    // Verify return value structure
    expect(result).toEqual({
      toolRegistry: mockRegistryInstance,
      toolExecutor: mockExecutorInstance,
      toolResultFormatter: mockFormatterInstance
    });
  });
  
  it('should handle tool registry with zero tools', () => {
    // Arrange
    mockRegistryInstance.registerLocalCliTools.mockReturnValueOnce(0);
    mockRegistryInstance.registerTools.mockReturnValueOnce(0);
    mockLocalCliTool.getCommandMap.mockReturnValueOnce({});
    
    // Act
    const result = setupToolSystem(
      mockLocalCliTool,
      mockLocalShellCliTool,
      MockToolRegistry as any,
      MockToolExecutor as any,
      MockToolResultFormatter as any,
      mockLogger
    );
    
    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith('Registered 0 local CLI tools');
    expect(mockLogger.info).toHaveBeenCalledWith('Registered 0 shell CLI tools');
    
    // Verify tool executor is still initialized
    expect(MockToolExecutor).toHaveBeenCalledWith(
      mockRegistryInstance,
      expect.any(Object), // Just check it's an object with any properties
      mockLogger
    );
    
    // Verify components are still created
    expect(result.toolRegistry).toBe(mockRegistryInstance);
    expect(result.toolExecutor).toBe(mockExecutorInstance);
    expect(result.toolResultFormatter).toBe(mockFormatterInstance);
  });
});