/**
 * @fileoverview Tests for unified shell tool definition
 */

import { describe, it, expect } from '@jest/globals';
import { getUnifiedShellToolDefinition, shellCommandDescriptions } from '../../src/tools/unifiedShellToolDefinition';
import { SHELL_COMMANDS } from '../../src/tools/localShellCliToolDefinitions';

describe('unifiedShellToolDefinition', () => {
  describe('getUnifiedShellToolDefinition', () => {
    it('should return a valid tool definition', () => {
      const toolDef = getUnifiedShellToolDefinition();
      
      expect(toolDef).toBeDefined();
      expect(toolDef.type).toBe('function');
      expect(toolDef.name).toBe('shell');
      expect(toolDef.description).toBeDefined();
      expect(typeof toolDef.description).toBe('string');
    });
    
    it('should include all allowed commands in the enum', () => {
      const toolDef = getUnifiedShellToolDefinition();
      
      expect(toolDef.parameters.properties.command).toBeDefined();
      expect(toolDef.parameters.properties.command.enum).toBeDefined();
      
      // Check that all shell commands are in the enum
      const commandEnum = toolDef.parameters.properties.command.enum;
      for (const cmd of SHELL_COMMANDS) {
        expect(commandEnum).toContain(cmd);
      }
    });
    
    it('should have command as a required parameter', () => {
      const toolDef = getUnifiedShellToolDefinition();
      
      expect(toolDef.parameters.required).toBeDefined();
      expect(toolDef.parameters.required).toContain('command');
    });
    
    it('should define args parameter', () => {
      const toolDef = getUnifiedShellToolDefinition();
      
      expect(toolDef.parameters.properties.args).toBeDefined();
      expect(toolDef.parameters.properties.args.type).toBe('array');
      expect(toolDef.parameters.properties.args.items).toBeDefined();
      expect(toolDef.parameters.properties.args.items.type).toBe('string');
    });
  });
  
  describe('shellCommandDescriptions', () => {
    it('should have a description for each allowed command', () => {
      for (const cmd of SHELL_COMMANDS) {
        expect(shellCommandDescriptions[cmd]).toBeDefined();
        expect(typeof shellCommandDescriptions[cmd]).toBe('string');
        expect(shellCommandDescriptions[cmd].length).toBeGreaterThan(10); // Reasonable minimum for descriptions
      }
    });
    
    it('should include usage examples in descriptions', () => {
      // Verify a few key descriptions have usage info
      expect(shellCommandDescriptions['ls']).toContain('Usage:');
      expect(shellCommandDescriptions['grep']).toContain('Usage:');
      expect(shellCommandDescriptions['cat']).toContain('Usage:');
      
      // Verify "When to use" sections are included
      expect(shellCommandDescriptions['ls']).toContain('When to use:');
      expect(shellCommandDescriptions['grep']).toContain('When to use:');
      expect(shellCommandDescriptions['cat']).toContain('When to use:');
    });
  });
});