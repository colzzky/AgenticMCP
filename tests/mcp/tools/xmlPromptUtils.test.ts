/**
 * Unit tests for xmlPromptUtils module
 * Tests the XML prompt construction, model selection, and tools formatting functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { constructXmlPrompt, selectModelForRole, formatAvailableTools, getAvailableToolsString } from '../../../src/mcp/tools/xmlPromptUtils.js';
import { roleEnums } from '../../../src/mcp/tools/roleSchemas.js';
import * as helpers from '../../../src/mcp/tools/xmlPromptUtilsHelpers.js';
import type { Tool } from '../../../src/core/types/provider.types';
import { getFileSystemToolDefinitions } from '../../../src/tools/fileSystemToolDefinitions';
import { getUnifiedShellToolDefinition, shellCommandDescriptions } from '../../../src/tools/unifiedShellToolDefinition';
// Import the module that we'll test
import * as roleModelConfig from '../../../src/mcp/tools/config/roleModelConfig.js';

// Since mocking ES modules is challenging, let's test the result of constructXmlPrompt
// without relying on mocking the imported functions

describe('xmlPromptUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructXmlPrompt', () => {
    it('should construct a basic XML prompt with role and task', () => {
      const prompt = constructXmlPrompt(
        roleEnums.CODER,
        'Write a function to calculate fibonacci numbers',
        '',
        [],
        { 
          prompt: 'Write a function to calculate fibonacci numbers',
          base_path: '/project'
        }
      );

      // Test the structure without testing exact content of helper functions
      expect(prompt).toContain('<role>');
      expect(prompt).toContain('</role>');
      expect(prompt).toContain('<task>Write a function to calculate fibonacci numbers</task>');
      expect(prompt).toContain('<instructions>');
      expect(prompt).toContain('</instructions>');
    });

    it('should include context when provided', () => {
      const context = 'This is for a Node.js project targeting ES2020';
      const prompt = constructXmlPrompt(
        roleEnums.CODER,
        'Write a function',
        context,
        [],
        { 
          prompt: 'Write a function',
          base_path: '/project',
          context
        }
      );

      expect(prompt).toContain(`<context>${context}</context>`);
    });

    it('should include related files when provided', () => {
      const fileContents = [
        { path: 'file1.js', content: 'console.log("Hello");' },
        { path: 'file2.js', content: 'export default function hello() {}' }
      ];
      
      const prompt = constructXmlPrompt(
        roleEnums.CODER,
        'Update the hello function',
        '',
        fileContents,
        { 
          prompt: 'Update the hello function',
          base_path: '/project',
          related_files: ['file1.js', 'file2.js']
        }
      );

      expect(prompt).toContain('<related_files>');
      expect(prompt).toContain('<file path="file1.js">');
      expect(prompt).toContain('console.log("Hello");');
      expect(prompt).toContain('<file path="file2.js">');
      expect(prompt).toContain('export default function hello() {}');
    });

    it('should include specialized arguments in the prompt', () => {
      const args = {
        prompt: 'Create tests',
        base_path: '/project',
        language: 'TypeScript',
        tests: true,
        architecture: 'Clean Architecture'
      };
      
      const prompt = constructXmlPrompt(
        roleEnums.CODER,
        args.prompt,
        '',
        [],
        args
      );

      expect(prompt).toContain('<language>TypeScript</language>');
      expect(prompt).toContain('<tests>true</tests>');
      expect(prompt).toContain('<architecture>Clean Architecture</architecture>');
    });

    it('should include available tools section', () => {
      const prompt = constructXmlPrompt(
        roleEnums.CODER,
        'Write a function',
        '',
        [],
        { 
          prompt: 'Write a function',
          base_path: '/project'
        }
      );

      expect(prompt).toContain('<available_tools>');
      // The implementation now uses getAvailableToolsString, so we should validate
      // that some expected tools are included
      expect(prompt).toContain('- read_file:');
      expect(prompt).toContain('- write_file:');
    });

    it('should handle arrays and objects in specialized arguments', () => {
      const args = {
        prompt: 'Create components',
        base_path: '/project',
        components: ['Button', 'Card', 'Modal'],
        config: { theme: 'dark', responsive: true }
      };
      
      const prompt = constructXmlPrompt(
        roleEnums.UI_UX,
        args.prompt,
        '',
        [],
        args as any
      );

      expect(prompt).toContain('<components>["Button","Card","Modal"]</components>');
      expect(prompt).toContain('<config>{"theme":"dark","responsive":true}</config>');
    });
  });

  describe('selectModelForRole', () => {
    it('should return the model from the role-model configuration', () => {
      // Get the default config for verifying against
      const defaultConfig = roleModelConfig.defaultRoleModelConfig;
      
      // Test with a role that exists in the default config
      const model = selectModelForRole(roleEnums.CODER);
      
      // Verify it returns the expected model from the default config
      expect(model).toBe(defaultConfig.roleMap[roleEnums.CODER].model);
    });

    it('should handle unknown roles by using default configuration', () => {
      // Get the default config for verifying against
      const defaultConfig = roleModelConfig.defaultRoleModelConfig;
      
      // Test with a custom role that doesn't exist in the default config
      const customRole = 'not_in_config_role';
      const model = selectModelForRole(customRole);
      
      // Verify it falls back to the default model
      expect(model).toBe(defaultConfig.default.model);
    });
  });

  describe('formatAvailableTools', () => {
    it('should format an array of tools into XML structure', () => {
      const mockTools: Tool[] = [
        {
          name: 'read_file',
          description: 'Read the complete contents of a file from the file system. This is a test.',
          parameters: {}
        },
        {
          name: 'write_file',
          description: 'Write content to a file. Creates the file if it does not exist.',
          parameters: {}
        }
      ];

      const result = formatAvailableTools(mockTools);

      expect(result).toContain('<available_tools>');
      expect(result).toContain('</available_tools>');
      expect(result).toContain('- read_file: Read the complete contents of a file from the file system');
      expect(result).toContain('- write_file: Write content to a file');
      // The description should be truncated at the first period
      expect(result).not.toContain('This is a test.');
      expect(result).not.toContain('Creates the file if it does not exist.');
    });

    it('should sort tools alphabetically', () => {
      const mockTools: Tool[] = [
        {
          name: 'c_tool',
          description: 'C tool description.',
          parameters: {}
        },
        {
          name: 'a_tool',
          description: 'A tool description.',
          parameters: {}
        },
        {
          name: 'b_tool',
          description: 'B tool description.',
          parameters: {}
        }
      ];

      const result = formatAvailableTools(mockTools);
      
      // Check for correct alphabetical order
      const toolsOrder = result.indexOf('- a_tool') < result.indexOf('- b_tool') && 
                         result.indexOf('- b_tool') < result.indexOf('- c_tool');
      expect(toolsOrder).toBe(true);
    });

    it('should handle the shell tool with command descriptions', () => {
      const mockShellTool: Tool = {
        name: 'shell',
        description: 'Run shell commands. Executes in the user environment.',
        parameters: {}
      };

      const result = formatAvailableTools([mockShellTool]);

      expect(result).toContain('- shell: Run shell commands');
      expect(result).toContain('Available shell commands:');
      // Test for at least one shell command from the descriptions
      const someCommand = Object.keys(shellCommandDescriptions)[0];
      expect(result).toContain(`* ${someCommand}:`);
    });
  });

  describe('getAvailableToolsString', () => {
    it('should return a formatted string of available tools', () => {
      const result = getAvailableToolsString();

      expect(result).toContain('<available_tools>');
      expect(result).toContain('</available_tools>');
      // Should include file system tools and shell tool
      expect(result).toContain('- read_file:');
      expect(result).toContain('- write_file:');
      expect(result).toContain('- shell:');
      expect(result).toContain('Available shell commands:');
    });

    it('should combine file system tools and unified shell tool', () => {
      // We can verify this by checking some known tools from each category
      const result = getAvailableToolsString();
      // File system tools
      const fsTools = getFileSystemToolDefinitions().map(tool => tool.name);
      // Check that at least one fs tool is included
      expect(fsTools.some(name => result.includes(`- ${name}:`))).toBe(true);
      // Shell tool
      expect(result).toContain('- shell:');
    });
  });
});