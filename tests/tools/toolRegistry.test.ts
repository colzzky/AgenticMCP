/**
 * Unit tests for ToolRegistry
 * Tests the registration and management of LLM tool definitions
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ToolRegistry } from '../../src/tools/toolRegistry.js';
import type { Tool } from '../../src/core/types/provider.types.js';
import type { Logger } from '../../src/core/types/logger.types.js';

describe('ToolRegistry', () => {
  // Mock logger
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  // Sample tool definitions
  const sampleTool: Tool = {
    type: 'function',
    name: 'sample_tool',
    description: 'A sample tool for testing',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Parameter 1' }
      },
      required: ['param1']
    }
  };

  const anotherTool: Tool = {
    type: 'function',
    name: 'another_tool',
    description: 'Another tool for testing',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'number', description: 'Parameter 1' }
      },
      required: ['param1']
    }
  };

  // Invalid tool (for validation tests)
  const invalidTool: Tool = {
    type: 'invalid_type' as 'function', // Type assertion to avoid TS error
    name: 'invalid_tool',
    parameters: {
      type: 'string', // Invalid, should be 'object'
      properties: {},
      required: []
    }
  };

  let registry: ToolRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new ToolRegistry(mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with empty tools map', () => {
      // Assert the registry is initialized and logs debug message
      expect(mockLogger.debug).toHaveBeenCalledWith('ToolRegistry initialized');
      expect(registry.getAllTools()).toEqual([]);
    });
  });

  describe('registerTool', () => {
    it('should register a tool successfully', () => {
      // Act
      const result = registry.registerTool(sampleTool);
      
      // Assert
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Registered tool '${sampleTool.name}'`);
      expect(registry.getTool(sampleTool.name)).toEqual(sampleTool);
    });

    it('should not register a tool with duplicate name', () => {
      // Arrange
      registry.registerTool(sampleTool);
      
      // Act
      const result = registry.registerTool({
        ...anotherTool,
        name: sampleTool.name // Same name as the first tool
      });
      
      // Assert
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });
  });

  describe('registerTools', () => {
    it('should register multiple tools', () => {
      // Act
      const result = registry.registerTools([sampleTool, anotherTool]);
      
      // Assert
      expect(result).toBe(2); // Both tools registered
      expect(registry.getAllTools()).toHaveLength(2);
      expect(mockLogger.debug).toHaveBeenCalledWith('Registered 2/2 tools');
    });

    it('should handle duplicate tools correctly', () => {
      // Arrange
      registry.registerTool(sampleTool);
      
      // Act
      const result = registry.registerTools([sampleTool, anotherTool]);
      
      // Assert
      expect(result).toBe(1); // Only one new tool registered
      expect(registry.getAllTools()).toHaveLength(2);
      expect(mockLogger.debug).toHaveBeenCalledWith('Registered 1/2 tools');
    });

    it('should return 0 when no tools are registered', () => {
      // Act
      const result = registry.registerTools([]);
      
      // Assert
      expect(result).toBe(0);
      expect(registry.getAllTools()).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Registered 0/0 tools');
    });
  });

  describe('getTool', () => {
    it('should retrieve a registered tool by name', () => {
      // Arrange
      registry.registerTool(sampleTool);
      
      // Act
      const result = registry.getTool(sampleTool.name);
      
      // Assert
      expect(result).toEqual(sampleTool);
    });

    it('should return undefined for non-existent tool', () => {
      // Act
      const result = registry.getTool('non_existent_tool');
      
      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('getAllTools', () => {
    it('should return all registered tools', () => {
      // Arrange
      registry.registerTools([sampleTool, anotherTool]);
      
      // Act
      const result = registry.getAllTools();
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(sampleTool);
      expect(result).toContainEqual(anotherTool);
    });

    it('should return empty array when no tools are registered', () => {
      // Act
      const result = registry.getAllTools();
      
      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getTools', () => {
    it('should return tools that match the filter', () => {
      // Arrange
      registry.registerTools([sampleTool, anotherTool]);
      
      // Act - Filter for tools with string parameters
      const result = registry.getTools(tool => 
        tool.parameters.properties.param1.type === 'string'
      );
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(sampleTool);
    });

    it('should return all tools when no filter is provided', () => {
      // Arrange
      registry.registerTools([sampleTool, anotherTool]);
      
      // Act
      const result = registry.getTools();
      
      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('validateToolsForProvider', () => {
    it('should validate tools for OpenAI provider', () => {
      // Arrange
      registry.registerTools([sampleTool, invalidTool]);
      
      // Act
      const result = registry.validateToolsForProvider('openai');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.invalidTools).toContain(invalidTool.name);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should validate tools for Anthropic provider', () => {
      // Arrange
      registry.registerTools([sampleTool, invalidTool]);
      
      // Act
      const result = registry.validateToolsForProvider('anthropic');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.invalidTools).toContain(invalidTool.name);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should validate tools for Google provider', () => {
      // Arrange
      registry.registerTools([sampleTool, invalidTool]);
      
      // Act
      const result = registry.validateToolsForProvider('google');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.invalidTools).toContain(invalidTool.name);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should return valid=true when all tools are valid', () => {
      // Arrange
      registry.registerTools([sampleTool, anotherTool]);
      
      // Act
      const result = registry.validateToolsForProvider('openai');
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.invalidTools).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe('registerLocalCliTools', () => {
    it('should register tools from a LocalCliTool instance', () => {
      // Arrange
      const mockLocalCliTool = {
        getToolDefinitions: jest.fn().mockReturnValue([
          {
            type: 'function',
            function: {
              name: 'cli_tool_1',
              description: 'CLI Tool 1',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'cli_tool_2',
              description: 'CLI Tool 2',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          }
        ])
      };
      
      // Act
      const result = registry.registerLocalCliTools(mockLocalCliTool as any);
      
      // Assert
      expect(result).toBe(2);
      expect(registry.getAllTools()).toHaveLength(2);
      expect(registry.getTool('cli_tool_1')).toBeDefined();
      expect(registry.getTool('cli_tool_2')).toBeDefined();
    });
  });
});