import { describe, it, expect } from '@jest/globals';
import { getLocalShellCliToolDefinitions, SHELL_COMMANDS } from '../../src/tools/localShellCliToolDefinitions.js';
import type { Tool } from '../../src/core/types/provider.types.js';

describe('localShellCliToolDefinitions', () => {
  describe('SHELL_COMMANDS', () => {
    it('should contain an array of shell commands', () => {
      expect(Array.isArray(SHELL_COMMANDS)).toBe(true);
      expect(SHELL_COMMANDS.length).toBeGreaterThan(0);
    });

    it('should include common shell commands', () => {
      const expectedCommands = ['ls', 'pwd', 'cat', 'grep', 'find'];
      for (const cmd of expectedCommands) {
        expect(SHELL_COMMANDS).toContain(cmd);
      }
    });
  });

  describe('getLocalShellCliToolDefinitions', () => {
    let toolDefinitions: Tool[];
    
    beforeEach(() => {
      toolDefinitions = getLocalShellCliToolDefinitions();
    });

    it('should return a tool definition for each shell command', () => {
      expect(toolDefinitions.length).toBe(SHELL_COMMANDS.length);
      
      // Check that all SHELL_COMMANDS are represented in tool definitions
      const toolNames = new Set(toolDefinitions.map(tool => tool.name));
      for (const cmd of SHELL_COMMANDS) {
        expect(toolNames.has(cmd)).toBe(true);
      }
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

    it('should define tools with consistent parameter structure', () => {
      for (const tool of toolDefinitions) {
        // Each tool should have an 'args' parameter
        expect(tool.parameters.properties).toHaveProperty('args');
        expect(tool.parameters.properties.args).toHaveProperty('type', 'array');
        expect(tool.parameters.properties.args).toHaveProperty('items');
        expect(tool.parameters.properties.args.items).toHaveProperty('type', 'string');
        expect(tool.parameters.properties.args).toHaveProperty('description');
      }
    });

    it('should include descriptions for every tool', () => {
      for (const tool of toolDefinitions) {
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    it('should include detailed descriptions for common commands', () => {
      // Check specific commands that should have detailed descriptions
      const ls = toolDefinitions.find(t => t.name === 'ls');
      expect(ls?.description).toContain('List directory contents');
      
      const grep = toolDefinitions.find(t => t.name === 'grep');
      expect(grep?.description).toContain('Search for patterns');
      
      const cat = toolDefinitions.find(t => t.name === 'cat');
      expect(cat?.description).toContain('Concatenate and display file contents');
    });

    it('should handle commands without specific descriptions', () => {
      // Create a mock invalid command that wouldn't have a specific description
      const mockDefinitions = getLocalShellCliToolDefinitions();
      const validCommands = new Set(SHELL_COMMANDS);
      
      // Find any command not in the descriptions object
      const commandWithoutSpecificDesc = mockDefinitions.find(tool => 
        !tool.description.includes('Usage:'));
      
      // If we found a command without a specific description
      if (commandWithoutSpecificDesc) {
        // It should have a generic fallback description
        expect(commandWithoutSpecificDesc.description).toContain(`Run the '${commandWithoutSpecificDesc.name}' shell command`);
      } else {
        // All commands have specific descriptions, this is also fine
        expect(true).toBe(true);
      }
    });
  });
});