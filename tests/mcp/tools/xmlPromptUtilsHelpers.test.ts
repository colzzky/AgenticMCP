/**
 * Unit tests for xmlPromptUtilsHelpers module
 * Tests the XML prompt helper functions for various roles
 */
import { describe, it, expect, jest } from '@jest/globals';
import { 
  getRoleDescription, 
  getRoleInstructions 
} from '../../../src/mcp/tools/xmlPromptUtilsHelpers.js';
import { roleEnums } from '../../../src/mcp/tools/roleSchemas.js';
import type { 
  CoderSchema,
  QASchema,
  SummarizerSchema,
  RewriterSchema,
  CustomSchema
} from '../../../src/mcp/tools/roleSchemas.js';

describe('xmlPromptUtilsHelpers', () => {
  describe('getRoleDescription', () => {
    it('should return coder description', () => {
      const description = getRoleDescription(roleEnums.CODER);
      expect(description).toContain('expert software developer');
      expect(description).toContain('clean code');
      expect(description).toContain('design patterns');
      expect(description).toContain('software architecture');
    });

    it('should return QA description', () => {
      const description = getRoleDescription(roleEnums.QA);
      expect(description).toContain('quality assurance specialist');
      expect(description).toContain('testing methodologies');
      expect(description).toContain('test design');
      expect(description).toContain('defect identification');
    });

    it('should return project manager description', () => {
      const description = getRoleDescription(roleEnums.PROJECT_MANAGER);
      expect(description).toContain('project manager');
      expect(description).toContain('task coordination');
      expect(description).toContain('resource allocation');
      expect(description).toContain('timeline management');
    });

    it('should return CPO description', () => {
      const description = getRoleDescription(roleEnums.CPO);
      expect(description).toContain('Chief Product Officer');
      expect(description).toContain('product strategy');
      expect(description).toContain('market analysis');
      expect(description).toContain('feature prioritization');
    });

    it('should return UI/UX description', () => {
      const description = getRoleDescription(roleEnums.UI_UX);
      expect(description).toContain('UI/UX designer');
      expect(description).toContain('user interface design');
      expect(description).toContain('interaction patterns');
      expect(description).toContain('user experience principles');
    });

    it('should return summarizer description', () => {
      const description = getRoleDescription(roleEnums.SUMMARIZER);
      expect(description).toContain('expert at creating concise');
      expect(description).toContain('accurate summaries');
      expect(description).toContain('capture the essence');
      expect(description).toContain('identify key points');
    });

    it('should return rewriter description', () => {
      const description = getRoleDescription(roleEnums.REWRITER);
      expect(description).toContain('content editor and rewriter');
      expect(description).toContain('adapting text');
      expect(description).toContain('tones, styles, and audiences');
      expect(description).toContain('preserving the core message');
    });

    it('should return analyst description', () => {
      const description = getRoleDescription(roleEnums.ANALYST);
      expect(description).toContain('data analyst');
      expect(description).toContain('finding patterns');
      expect(description).toContain('trends, and insights');
      expect(description).toContain('extract meaningful conclusions');
    });

    it('should return custom description with specified role', () => {
      const customArgs: CustomSchema = {
        prompt: 'Test prompt',
        base_path: '/test',
        context: 'Test context',
        role: 'security auditor'
      };
      
      const description = getRoleDescription(roleEnums.CUSTOM, customArgs);
      expect(description).toBe('security auditor');
    });

    it('should return default custom description when no role specified', () => {
      const customArgs: CustomSchema = {
        prompt: 'Test prompt',
        base_path: '/test',
        context: 'Test context',
        role: ''
      };
      
      const description = getRoleDescription(roleEnums.CUSTOM, customArgs);
      expect(description).toContain('expert professional');
      expect(description).toContain('deep knowledge and experience');
    });

    it('should return fallback description for unknown role', () => {
      // Using type assertion to test edge case with invalid role
      const description = getRoleDescription('unknown_role' as roleEnums);
      expect(description).toContain('expert professional');
      expect(description).toContain('high-quality solutions');
    });
  });

  describe('getRoleInstructions', () => {
    it('should return coder instructions with language parameter', () => {
      const coderArgs: CoderSchema = {
        prompt: 'Write a function',
        base_path: '/project',
        context: 'Test',
        language: 'TypeScript'
      };
      
      const instructions = getRoleInstructions(roleEnums.CODER, coderArgs);
      expect(instructions).toContain('<thinking> tags');
      expect(instructions).toContain('<solution> tags');
      expect(instructions).toContain('TypeScript');
      expect(instructions).toContain('file operations');
    });

    it('should return coder instructions with tests parameter', () => {
      const coderArgs: CoderSchema = {
        prompt: 'Write a function',
        base_path: '/project',
        context: 'Test',
        tests: true
      };
      
      const instructions = getRoleInstructions(roleEnums.CODER, coderArgs);
      expect(instructions).toContain('Include appropriate tests');
    });

    it('should return coder instructions without tests parameter', () => {
      const coderArgs: CoderSchema = {
        prompt: 'Write a function',
        base_path: '/project',
        context: 'Test',
        tests: false
      };
      
      const instructions = getRoleInstructions(roleEnums.CODER, coderArgs);
      expect(instructions).toContain('Consider testability in your design');
    });

    it('should return QA instructions', () => {
      const qaArgs: QASchema = {
        prompt: 'Create test plan',
        base_path: '/project',
        context: 'Test context'
      };
      
      const instructions = getRoleInstructions(roleEnums.QA, qaArgs);
      expect(instructions).toContain('<thinking> tags');
      expect(instructions).toContain('<test_plan> tags');
      expect(instructions).toContain('<test_cases> tags');
      expect(instructions).toContain('<recommendations> tags');
      expect(instructions).toContain('file operations');
    });

    it('should return summarizer instructions with format parameter', () => {
      const summarizerArgs: SummarizerSchema = {
        prompt: 'Summarize document',
        base_path: '/project',
        context: 'Test',
        format: 'bullets'
      };
      
      const instructions = getRoleInstructions(roleEnums.SUMMARIZER, summarizerArgs);
      expect(instructions).toContain('<thinking> tags');
      expect(instructions).toContain('<summary> tags');
      expect(instructions).toContain('bullets');
      expect(instructions).toContain('file operations');
    });

    it('should return summarizer instructions without format parameter', () => {
      const summarizerArgs: SummarizerSchema = {
        prompt: 'Summarize document',
        base_path: '/project',
        context: 'Test'
      };
      
      const instructions = getRoleInstructions(roleEnums.SUMMARIZER, summarizerArgs);
      expect(instructions).toContain('an appropriate format');
    });

    it('should return rewriter instructions with style and audience parameters', () => {
      const rewriterArgs: RewriterSchema = {
        prompt: 'Rewrite document',
        base_path: '/project',
        context: 'Test',
        style: 'Professional',
        audience: 'Technical managers'
      };
      
      const instructions = getRoleInstructions(roleEnums.REWRITER, rewriterArgs);
      expect(instructions).toContain('<thinking> tags');
      expect(instructions).toContain('<rewritten> tags');
      expect(instructions).toContain('style: Professional');
      expect(instructions).toContain('audience: Technical managers');
      expect(instructions).toContain('file operations');
    });

    it('should return rewriter instructions without style and audience parameters', () => {
      const rewriterArgs: RewriterSchema = {
        prompt: 'Rewrite document',
        base_path: '/project',
        context: 'Test'
      };
      
      const instructions = getRoleInstructions(roleEnums.REWRITER, rewriterArgs);
      expect(instructions).toContain('style');
      expect(instructions).toContain('target audience');
    });

    it('should return custom instructions with role parameter', () => {
      const customArgs: CustomSchema = {
        prompt: 'Review security',
        base_path: '/project',
        context: 'Test',
        role: 'security auditor'
      };
      
      const instructions = getRoleInstructions(roleEnums.CUSTOM, customArgs);
      expect(instructions).toContain('<thinking> tags');
      expect(instructions).toContain('<response> tags');
      expect(instructions).toContain('<recommendations> tags');
      expect(instructions).toContain('security auditor');
      expect(instructions).toContain('file operations');
    });

    it('should return custom instructions without role parameter', () => {
      const customArgs: CustomSchema = {
        prompt: 'Review security',
        base_path: '/project',
        context: 'Test',
        role: ''
      };
      
      const instructions = getRoleInstructions(roleEnums.CUSTOM, customArgs);
      expect(instructions).toContain('your role');
    });

    it('should return default instructions for unknown role', () => {
      // Using type assertion to test edge case with invalid role
      const instructions = getRoleInstructions('unknown_role' as roleEnums);
      expect(instructions).toContain('<thinking> tags');
      expect(instructions).toContain('<response> tags');
      expect(instructions).toContain('analyze the task thoroughly');
      expect(instructions).toContain('file operations');
    });

    it('should include file operation examples in all role instructions', () => {
      const fileOpExampleText = '<file_operation>\ncommand: read_file\npath: path/to/file.txt\n</file_operation>';
      
      // Test for a few roles
      const coderInstructions = getRoleInstructions(roleEnums.CODER);
      const qaInstructions = getRoleInstructions(roleEnums.QA);
      const analyticInstructions = getRoleInstructions(roleEnums.ANALYST);
      
      expect(coderInstructions).toContain(fileOpExampleText);
      expect(qaInstructions).toContain(fileOpExampleText);
      expect(analyticInstructions).toContain(fileOpExampleText);
      
      // Also check for write_file and list_directory examples
      expect(coderInstructions).toContain('command: write_file');
      expect(coderInstructions).toContain('command: list_directory');
    });
  });
});