/**
 * Unit tests for toolSystemSetup
 * Tests the setup of tool registry, executor, and formatter components
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { setupToolSystem } from '../../../src/core/setup/toolSystemSetup.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { FileSystemTool } from '../../../src/tools/services/fileSystem/index.js';
import type { LocalShellCliTool } from '../../../src/tools/localShellCliTool.js';
import type { UnifiedShellCliTool } from '../../../src/tools/unifiedShellCliTool.js';

// Mock getLocalShellCliToolDefinitions module
jest.mock('../../../src/tools/localShellCliToolDefinitions.js', () => ({
  getLocalShellCliToolDefinitions: (jest.fn() as any).mockReturnValue([
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
  
  // Mock fileSystemTool
  const mockLocalCliTool = {
    getCommandMap: (jest.fn() as any).mockReturnValue({
      read_file: jest.fn(),
      write_file: jest.fn(),
      list_directory: jest.fn()
    }),
    getToolDefinitions: (jest.fn() as any).mockReturnValue([
      { type: 'function', name: 'read_file', description: 'Read file contents', parameters: { type: 'object', properties: {} } },
      { type: 'function', name: 'write_file', description: 'Write to file', parameters: { type: 'object', properties: {} } }
    ])
  } as unknown as FileSystemTool;
  
  // Mock localShellCliTool
  const mockLocalShellCliTool = {
    execute: jest.fn(),
    getToolDefinitions: (jest.fn() as any).mockReturnValue([
      { type: 'function', name: 'ls', description: 'List directory contents', parameters: { type: 'object', properties: {} } }
    ]),
    getCommandMap: (jest.fn() as any).mockReturnValue({
      ls: jest.fn(),
      echo: jest.fn()
    })
  } as unknown as LocalShellCliTool;
  
  // Mock unifiedShellCliTool
  const mockUnifiedShellCliTool = {
    execute: jest.fn(),
    getToolDefinition: (jest.fn() as any).mockReturnValue({
      type: 'function', 
      name: 'shell', 
      description: 'Unified shell command execution', 
      parameters: { 
        type: 'object', 
        properties: { 
          command: { type: 'string' },
          args: { type: 'array', items: { type: 'string' } }
        }
      }
    })
  } as unknown as UnifiedShellCliTool;
  
  // Mock ToolRegistry
  const mockRegistryInstance = {
    registerFileSystemTools: (jest.fn() as any).mockReturnValue(3),
    registerTools: (jest.fn() as any).mockReturnValue(1),
    registerTool: jest.fn(),
    getTool: jest.fn(),
    getTools: jest.fn(),
    getAllTools: jest.fn(),
    validateToolsForProvider: jest.fn()
  };
  const MockToolRegistry = (jest.fn() as any).mockImplementation(() => mockRegistryInstance);
  
  // Mock ToolExecutor
  const mockExecutorInstance = {
    executeTool: jest.fn(),
    executeToolCall: jest.fn()
  };
  const MockToolExecutor = (jest.fn() as any).mockImplementation(() => mockExecutorInstance);
  
  // Mock ToolResultFormatter
  const mockFormatterInstance = {
    formatResult: jest.fn()
  };
  const MockToolResultFormatter = (jest.fn() as any).mockImplementation(() => mockFormatterInstance);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create and configure tool system components', () => {
    // Act
    const result = setupToolSystem(
      mockLocalCliTool,
      mockLocalShellCliTool,
      mockUnifiedShellCliTool,
      MockToolRegistry as any,
      MockToolExecutor as any,
      MockToolResultFormatter as any,
      mockLogger
    );
    
    // Assert
    // Verify tool registry initialization
    expect(MockToolRegistry).toHaveBeenCalledWith(mockLogger);
    // We now use registerTools instead of registerFileSystemTools
    expect(mockRegistryInstance.registerTools).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'read_file' }),
        expect.objectContaining({ name: 'write_file' })
      ])
    );
    expect(mockLogger.debug).toHaveBeenCalledWith('Registered 1 local CLI tools');
    
    // Verify shell tools registration
    expect(mockRegistryInstance.registerTools).toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith('Registered unified shell CLI tool');
    
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
    mockRegistryInstance.registerFileSystemTools.mockReturnValueOnce(0);
    mockRegistryInstance.registerTools.mockReturnValueOnce(0);
    mockLocalCliTool.getCommandMap.mockReturnValueOnce({});
    
    // Act
    const result = setupToolSystem(
      mockLocalCliTool,
      mockLocalShellCliTool,
      mockUnifiedShellCliTool,
      MockToolRegistry as any,
      MockToolExecutor as any,
      MockToolResultFormatter as any,
      mockLogger
    );
    
    // Assert
    expect(mockLogger.debug).toHaveBeenCalledWith('Registered 0 local CLI tools');
    expect(mockLogger.debug).toHaveBeenCalledWith('Registered unified shell CLI tool');
    
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