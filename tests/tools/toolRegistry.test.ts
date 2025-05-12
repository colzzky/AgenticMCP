/**
 * @file Tests for ToolRegistry
 */

// @ts-nocheck - To bypass type checking issues with mocking
import { jest } from '@jest/globals';
import { ToolRegistry } from '../../src/tools/toolRegistry';
import type { Tool } from '../../src/core/types/provider.types';

// Create a manual mock for LocalCliTool instead of using jest.mock
const mockGetToolDefinitions = jest.fn();
const MockLocalCliTool = jest.fn().mockImplementation(() => ({
  getToolDefinitions: mockGetToolDefinitions
}));

// Define the ToolDefinition interface here to avoid import issues
interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

describe('ToolRegistry', () => {
  // Test variables
  let mockLogger: any;
  let registry: ToolRegistry;
  
  // Sample tools for testing
  const sampleTool1: Tool = {
    type: 'function',
    name: 'sample_tool_1',
    description: 'Sample tool 1 for testing',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Parameter 1' }
      },
      required: ['param1']
    }
  };
  
  const sampleTool2: Tool = {
    type: 'function',
    name: 'sample_tool_2',
    description: 'Sample tool 2 for testing',
    parameters: {
      type: 'object',
      properties: {
        param2: { type: 'number', description: 'Parameter 2' }
      },
      required: ['param2']
    }
  };
  
  // Invalid tool for provider validation testing
  const invalidTool: Tool = {
    type: 'invalid_type' as any,
    name: 'invalid_tool',
    description: 'Invalid tool for testing',
    parameters: {
      type: 'string' as any, // Invalid parameter type
      properties: {},
      required: []
    }
  };
  
  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    
    // Create registry instance
    registry = new ToolRegistry(mockLogger);
  });
  
  describe('constructor', () => {
    it('should initialize with empty tools map', () => {
      expect(registry).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('ToolRegistry initialized');
      expect(registry.getAllTools()).toHaveLength(0);
    });
  });
  
  describe('registerTool', () => {
    it('should register a tool successfully', () => {
      const result = registry.registerTool(sampleTool1);
      
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Registered tool '${sampleTool1.name}'`);
      expect(registry.getAllTools()).toHaveLength(1);
      expect(registry.getTool(sampleTool1.name)).toEqual(sampleTool1);
    });
    
    it('should not register a tool with duplicate name', () => {
      // Register first tool
      registry.registerTool(sampleTool1);
      
      // Try to register duplicate
      const duplicateTool: Tool = {
        ...sampleTool1,
        description: 'Duplicate tool with same name'
      };
      
      const result = registry.registerTool(duplicateTool);
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(`Tool with name '${sampleTool1.name}' already exists in registry`);
      expect(registry.getAllTools()).toHaveLength(1);
      
      // Original tool should still be in registry, not the duplicate
      expect(registry.getTool(sampleTool1.name)).toEqual(sampleTool1);
    });
  });
  
  describe('registerTools', () => {
    it('should register multiple tools successfully', () => {
      const tools = [sampleTool1, sampleTool2];
      const result = registry.registerTools(tools);
      
      expect(result).toBe(2);
      expect(registry.getAllTools()).toHaveLength(2);
      expect(registry.getTool(sampleTool1.name)).toEqual(sampleTool1);
      expect(registry.getTool(sampleTool2.name)).toEqual(sampleTool2);
    });
    
    it('should handle duplicate tools when registering multiple', () => {
      // Register first tool
      registry.registerTool(sampleTool1);
      
      // Try to register array with duplicate
      const result = registry.registerTools([sampleTool1, sampleTool2]);
      
      expect(result).toBe(1); // Only one new tool registered
      expect(registry.getAllTools()).toHaveLength(2);
    });
  });
  
  describe('getTool', () => {
    it('should return the correct tool by name', () => {
      registry.registerTools([sampleTool1, sampleTool2]);
      
      const tool = registry.getTool(sampleTool2.name);
      expect(tool).toEqual(sampleTool2);
    });
    
    it('should return undefined for non-existent tool', () => {
      const tool = registry.getTool('non_existent_tool');
      expect(tool).toBeUndefined();
    });
  });
  
  describe('getAllTools and getTools', () => {
    beforeEach(() => {
      registry.registerTools([sampleTool1, sampleTool2]);
    });
    
    it('should return all registered tools', () => {
      const tools = registry.getAllTools();
      
      expect(tools).toHaveLength(2);
      expect(tools).toContainEqual(sampleTool1);
      expect(tools).toContainEqual(sampleTool2);
    });
    
    it('should filter tools with provided filter function', () => {
      const tools = registry.getTools(tool => tool.name === sampleTool1.name);
      
      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual(sampleTool1);
    });
  });
  
  describe('registerLocalCliTools', () => {
    it('should register tools from LocalCliTool', () => {
      // Create a mock LocalCliTool instance
      const mockCliTool = new MockLocalCliTool({} as any, mockLogger);
      
      // Create mock tool definitions in the format returned by LocalCliTool
      const mockToolDefinitions: ToolDefinition[] = [
        {
          type: 'function',
          function: {
            name: 'sample_tool_1',
            description: 'Sample tool 1 for testing',
            parameters: {
              type: 'object',
              properties: {
                param1: { type: 'string', description: 'Parameter 1' }
              },
              required: ['param1']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'sample_tool_2',
            description: 'Sample tool 2 for testing',
            parameters: {
              type: 'object',
              properties: {
                param2: { type: 'number', description: 'Parameter 2' }
              },
              required: ['param2']
            }
          }
        }
      ];
      
      // Set up the mock to return our tool definitions
      mockGetToolDefinitions.mockReturnValue(mockToolDefinitions);
      
      const result = registry.registerLocalCliTools(mockCliTool);
      
      expect(result).toBe(2);
      expect(mockGetToolDefinitions).toHaveBeenCalled();
      expect(registry.getAllTools()).toHaveLength(2);
    });
  });
  
  describe('validateToolsForProvider', () => {
    beforeEach(() => {
      registry.registerTools([sampleTool1, sampleTool2, invalidTool]);
    });
    
    it('should validate tools for OpenAI provider', () => {
      const result = registry.validateToolsForProvider('openai');
      
      expect(result.valid).toBe(false);
      expect(result.invalidTools).toContain(invalidTool.name);
      expect(result.invalidTools).not.toContain(sampleTool1.name);
      expect(result.invalidTools).not.toContain(sampleTool2.name);
      expect(result.messages.length).toBeGreaterThan(0);
    });
    
    it('should validate tools for Anthropic provider', () => {
      const result = registry.validateToolsForProvider('anthropic');
      
      expect(result.valid).toBe(false);
      expect(result.invalidTools).toContain(invalidTool.name);
      expect(result.messages.length).toBeGreaterThan(0);
    });
    
    it('should validate tools for Google provider', () => {
      const result = registry.validateToolsForProvider('google');
      
      expect(result.valid).toBe(false);
      expect(result.invalidTools).toContain(invalidTool.name);
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });
});
