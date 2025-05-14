/**
 * Unit tests for xmlPromptUtils module
 * Tests the XML prompt construction and model selection functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { constructXmlPrompt, selectModelForRole } from '../../../src/mcp/tools/xmlPromptUtils.js';
import { roleEnums } from '../../../src/mcp/tools/roleSchemas.js';
import * as helpers from '../../../src/mcp/tools/xmlPromptUtilsHelpers.js';

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
      expect(prompt).toContain('- read_file: Read a file from the filesystem');
      expect(prompt).toContain('- write_file: Write content to a file');
      expect(prompt).toContain('- find_files: Find files matching a pattern');
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
    it('should return a model name for any role', () => {
      const model = selectModelForRole(roleEnums.CODER);
      // The expected model depends on the implementation, but should be a non-empty string
      expect(typeof model).toBe('string');
      expect(model.length).toBeGreaterThan(0);
    });

    it('should handle custom roles', () => {
      const model = selectModelForRole('financial_analyst');
      expect(typeof model).toBe('string');
      expect(model.length).toBeGreaterThan(0);
    });
  });
});