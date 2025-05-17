/**
 * Unit tests for fileSystemToolDefinitions
 * Tests the CLI tool schema definitions and validation
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { getFileSystemToolDefinitions, validateToolDefinitions } from '@/tools/services/fileSystem/fileSystemToolDefinitions';
import type { Tool, ProviderType } from '../../src/core/types/provider.types.js';

describe('fileSystemToolDefinitions', () => {
  describe('getFileSystemToolDefinitions', () => {
    let toolDefinitions: Tool[];
    
    beforeEach(() => {
      toolDefinitions = getFileSystemToolDefinitions();
    });

    it('should return an array of tool definitions', () => {
      expect(Array.isArray(toolDefinitions)).toBe(true);
      expect(toolDefinitions.length).toBeGreaterThan(0);
    });

    it('should include all required local CLI tools', () => {
      const toolNames = toolDefinitions.map(tool => tool.name);
      
      // Check that all expected tools are defined
      expect(toolNames).toContain('create_directory');
      expect(toolNames).toContain('get_directory_tree');
      expect(toolNames).toContain('write_file');
      expect(toolNames).toContain('get_file_info');
      expect(toolNames).toContain('edit_file');
      expect(toolNames).toContain('move_file');
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('read_multiple_files');
      expect(toolNames).toContain('delete_file');
      expect(toolNames).toContain('delete_directory');
      expect(toolNames).toContain('list_directory');
      expect(toolNames).toContain('search_codebase');
      expect(toolNames).toContain('find_files');
    });

    it('should define all tools with required properties', () => {
      for (const tool of toolDefinitions) {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool.parameters).toHaveProperty('type', 'object');
        expect(tool.parameters).toHaveProperty('properties');
        expect(tool.parameters).toHaveProperty('required');
      }
    });

    it('should define create_directory tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'create_directory');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.required).toContain('path');
    });
    
    it('should define get_directory_tree tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'get_directory_tree');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.required).toContain('path');
    });
    
    it('should define write_file tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'write_file');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.properties).toHaveProperty('content');
      expect(tool?.parameters.properties.content).toHaveProperty('type', 'string');
      expect(tool?.parameters.properties).toHaveProperty('allowOverwrite');
      expect(tool?.parameters.required).toContain('path');
      expect(tool?.parameters.required).toContain('content');
    });

    it('should define get_file_info tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'get_file_info');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.required).toContain('path');
    });
    
    it('should define edit_file tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'edit_file');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties).toHaveProperty('edits');
      expect(tool?.parameters.properties).toHaveProperty('dryRun');
      expect(tool?.parameters.properties).toHaveProperty('allowOverwrite');
      expect(tool?.parameters.required).toContain('path');
      expect(tool?.parameters.required).toContain('edits');
    });
    
    it('should define move_file tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'move_file');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('source');
      expect(tool?.parameters.properties).toHaveProperty('destination');
      expect(tool?.parameters.required).toContain('source');
      expect(tool?.parameters.required).toContain('destination');
    });
    
    it('should define read_file tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'read_file');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.required).toContain('path');
    });
    
    it('should define read_multiple_files tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'read_multiple_files');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('paths');
      expect(tool?.parameters.required).toContain('paths');
    });
    
    it('should define delete_file tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'delete_file');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.required).toContain('path');
    });
    
    it('should define delete_directory tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'delete_directory');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.required).toContain('path');
    });
    
    it('should define list_directory tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'list_directory');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('path');
      expect(tool?.parameters.properties.path).toHaveProperty('type', 'string');
      expect(tool?.parameters.required).toContain('path');
    });
    
    it('should define search_codebase tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'search_codebase');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('query');
      expect(tool?.parameters.properties.query).toHaveProperty('type', 'string');
      expect(tool?.parameters.properties).toHaveProperty('recursive');
      expect(tool?.parameters.required).toContain('query');
    });
    
    it('should define find_files tool with correct parameters', () => {
      const tool = toolDefinitions.find(t => t.name === 'find_files');
      expect(tool).toBeDefined();
      expect(tool?.parameters.properties).toHaveProperty('pattern');
      expect(tool?.parameters.properties.pattern).toHaveProperty('type', 'string');
      expect(tool?.parameters.properties).toHaveProperty('recursive');
      expect(tool?.parameters.properties).toHaveProperty('exclude');
      expect(tool?.parameters.required).toContain('pattern');
    });
  });
  
  describe('validateToolDefinitions', () => {
    let toolDefinitions: Tool[];
    
    beforeEach(() => {
      toolDefinitions = getFileSystemToolDefinitions();
    });
    
    it('should validate tool definitions for all providers', () => {
      const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'grok'];
      
      providers.forEach(provider => {
        const result = validateToolDefinitions(toolDefinitions, provider);
        expect(result.valid).toBe(true);
        expect(result.invalidTools).toHaveLength(0);
      });
    });

    it('should reject invalid tool definitions for providers', () => {
      const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'grok'];
      
      providers.forEach(provider => {
        const invalidTools: Tool[] = [
          {
            // @ts-expect-error Intentionally invalid for testing
            type: 'invalid_type',
            name: 'invalid_tool',
            description: 'Invalid tool for testing',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ];

        const result = validateToolDefinitions(invalidTools, provider);

        expect(result.valid).toBe(false);
        expect(result.invalidTools).toContain('invalid_tool');
        expect(result.messages.some(msg => msg.includes(`invalid type for ${provider.charAt(0).toUpperCase() + provider.slice(1)}`))).toBe(true);
      });
    });

    it('should identify tools with missing required fields', () => {
      const invalidTools: Tool[] = [
        {
          type: 'function' as const,
          name: '',  // Missing name
          description: 'A tool with missing name',
          parameters: {
            type: 'object',
            properties: {
              param: { type: 'string' }
            },
            required: ['param']
          }
        },
        {
          type: 'function' as const,
          name: 'no_params_tool',
          description: 'A tool with missing parameters',
          // @ts-expect-error Intentionally invalid for testing
          parameters: undefined
        }
      ];

      const result = validateToolDefinitions(invalidTools, 'openai');

      expect(result.valid).toBe(false);
      expect(result.invalidTools).toContain('unnamed');
      expect(result.invalidTools).toContain('no_params_tool');
      expect(result.messages.some(msg => msg.includes('missing required fields'))).toBe(true);
    });

    it('should remove duplicate invalid tools', () => {
      const invalidTools: Tool[] = [
        {
          // @ts-expect-error Intentionally invalid for testing
          type: 'invalid_type',
          name: 'duplicate_invalid_tool',
          description: 'A tool with multiple issues',
          parameters: {
            // @ts-expect-error Intentionally invalid for testing
            type: 'array',  // Also invalid
            properties: {
              param: { type: 'string' }
            },
            required: ['param']
          }
        }
      ];

      const result = validateToolDefinitions(invalidTools, 'anthropic');

      // The tool is invalid for two reasons (type and parameters.type),
      // but should only appear once in invalidTools
      expect(result.invalidTools).toHaveLength(1);
      expect(result.invalidTools).toContain('duplicate_invalid_tool');
      // But there should be two error messages
      expect(result.messages.length).toBe(2);
    });
  });
});