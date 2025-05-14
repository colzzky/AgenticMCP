/**
 * Unit tests for roleSchemas module
 * Tests the Zod schema definitions and validations for various roles
 */
import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import {
  roleEnums,
  baseRoleSchema,
  coderSchema,
  qaSchema,
  projectManagerSchema,
  cpoSchema,
  uiUxSchema,
  summarizerSchema,
  rewriterSchema,
  analystSchema,
  customSchema,
  BaseRoleSchema,
  CoderSchema,
  QASchema,
  ProjectManagerSchema,
  CPOSchema,
  UIUXSchema,
  SummarizerSchema,
  RewriterSchema,
  AnalystSchema,
  CustomSchema,
  AllRoleSchemas
} from '../../../src/mcp/tools/roleSchemas.js';

describe('roleSchemas', () => {
  // Valid test data for the base schema
  const validBaseData = {
    prompt: 'Test prompt',
    base_path: '/test/path',
    context: 'Test context'
  };

  describe('roleEnums', () => {
    it('should define all expected role enums', () => {
      expect(roleEnums.CODER).toBe('coder');
      expect(roleEnums.QA).toBe('qa');
      expect(roleEnums.PROJECT_MANAGER).toBe('project_manager');
      expect(roleEnums.CPO).toBe('cpo');
      expect(roleEnums.UI_UX).toBe('ui_ux');
      expect(roleEnums.SUMMARIZER).toBe('summarizer');
      expect(roleEnums.REWRITER).toBe('rewriter');
      expect(roleEnums.ANALYST).toBe('analyst');
      expect(roleEnums.CUSTOM).toBe('custom');
    });
  });

  describe('baseRoleSchema', () => {
    const baseSchema = z.object(baseRoleSchema);

    it('should validate a complete base schema object', () => {
      const result = baseSchema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
      const result = baseSchema.safeParse({
        ...validBaseData,
        related_files: ['file1.ts', 'file2.ts'],
        allow_file_overwrite: true,
        role: roleEnums.CODER
      });
      expect(result.success).toBe(true);
    });

    it('should fail validation when required fields are missing', () => {
      const result = baseSchema.safeParse({
        prompt: 'Test prompt',
        // Missing base_path
        context: 'Test context'
      });
      expect(result.success).toBe(false);
    });

    it('should validate types correctly for each field', () => {
      // Test with wrong types
      const result = baseSchema.safeParse({
        prompt: 123, // Number instead of string
        base_path: '/test',
        context: 'Test',
        related_files: 'not-an-array', // String instead of array
        allow_file_overwrite: 'yes' // String instead of boolean
      });
      expect(result.success).toBe(false);
    });

    it('should validate role enum values correctly', () => {
      // Valid role
      const validResult = baseSchema.safeParse({
        ...validBaseData,
        role: roleEnums.ANALYST
      });
      expect(validResult.success).toBe(true);

      // Invalid role
      const invalidResult = baseSchema.safeParse({
        ...validBaseData,
        role: 'invalid_role'
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('coderSchema', () => {
    const schema = z.object(coderSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with coder-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        language: 'TypeScript',
        architecture: 'Clean Architecture',
        tests: true
      });
      expect(result.success).toBe(true);
    });

    it('should validate types correctly for coder-specific fields', () => {
      // Test with wrong types
      const result = schema.safeParse({
        ...validBaseData,
        language: true, // Boolean instead of string
        tests: 'yes' // String instead of boolean
      });
      expect(result.success).toBe(false);
    });
  });

  describe('qaSchema', () => {
    const schema = z.object(qaSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with qa-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        test_type: 'unit',
        framework: 'Jest'
      });
      expect(result.success).toBe(true);
    });

    it('should validate test_type enum correctly', () => {
      // Valid test_type
      const validResult = schema.safeParse({
        ...validBaseData,
        test_type: 'integration'
      });
      expect(validResult.success).toBe(true);

      // Invalid test_type
      const invalidResult = schema.safeParse({
        ...validBaseData,
        test_type: 'performance' // Not in enum
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('projectManagerSchema', () => {
    const schema = z.object(projectManagerSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with project manager-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        timeline: '2 weeks',
        resources: '3 developers, 1 designer',
        methodology: 'agile'
      });
      expect(result.success).toBe(true);
    });

    it('should validate methodology enum correctly', () => {
      // Valid methodology
      const validResult = schema.safeParse({
        ...validBaseData,
        methodology: 'scrum'
      });
      expect(validResult.success).toBe(true);

      // Invalid methodology
      const invalidResult = schema.safeParse({
        ...validBaseData,
        methodology: 'spiral' // Not in enum
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('cpoSchema', () => {
    const schema = z.object(cpoSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with cpo-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        market: 'Enterprise SaaS',
        competitors: 'Company A, Company B',
        metrics: 'User acquisition, retention'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('uiUxSchema', () => {
    const schema = z.object(uiUxSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with ui/ux-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        platform: 'web',
        brand_guidelines: 'Use company colors and fonts',
        accessibility: 'AA'
      });
      expect(result.success).toBe(true);
    });

    it('should validate accessibility enum correctly', () => {
      // Valid accessibility
      const validResult = schema.safeParse({
        ...validBaseData,
        accessibility: 'AAA'
      });
      expect(validResult.success).toBe(true);

      // Invalid accessibility
      const invalidResult = schema.safeParse({
        ...validBaseData,
        accessibility: 'A' // Not in enum
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('summarizerSchema', () => {
    const schema = z.object(summarizerSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with summarizer-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        length: 'short',
        focus: 'Technical details',
        format: 'bullets'
      });
      expect(result.success).toBe(true);
    });

    it('should validate length and format enums correctly', () => {
      // Valid values
      const validResult = schema.safeParse({
        ...validBaseData,
        length: 'medium',
        format: 'paragraphs'
      });
      expect(validResult.success).toBe(true);

      // Invalid values
      const invalidResult = schema.safeParse({
        ...validBaseData,
        length: 'tiny', // Not in enum
        format: 'mind-map' // Not in enum
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('rewriterSchema', () => {
    const schema = z.object(rewriterSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with rewriter-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        style: 'Academic',
        tone: 'Formal',
        audience: 'Technical professionals'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('analystSchema', () => {
    const schema = z.object(analystSchema);

    it('should validate with required fields from base schema', () => {
      const result = schema.safeParse(validBaseData);
      expect(result.success).toBe(true);
    });

    it('should validate with analyst-specific optional fields', () => {
      const result = schema.safeParse({
        ...validBaseData,
        data_type: 'User metrics',
        analysis_focus: 'Growth patterns',
        visualization: true
      });
      expect(result.success).toBe(true);
    });
  });

  describe('customSchema', () => {
    const schema = z.object(customSchema);

    it('should require role field unlike base schema', () => {
      // Valid with role
      const validResult = schema.safeParse({
        ...validBaseData,
        role: 'security_auditor'
      });
      expect(validResult.success).toBe(true);

      // Invalid without role
      const invalidResult = schema.safeParse(validBaseData);
      expect(invalidResult.success).toBe(false);
    });

    it('should accept arbitrary parameters', () => {
      const result = schema.safeParse({
        ...validBaseData,
        role: 'financial_analyst',
        parameters: {
          financial_data: 'Q3 2023',
          metrics: ['ROI', 'Cashflow'],
          depth: 'detailed'
        }
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Type definitions', () => {
    it('should define proper types for all schemas', () => {
      // Just test that we can create objects of these types
      // This is mainly to ensure the type definitions match the schemas
      
      // Base role
      const baseRole: BaseRoleSchema = {
        prompt: 'Test',
        base_path: '/test',
        context: 'Test context'
      };
      
      // Specific roles - just testing a few
      const coder: CoderSchema = {
        prompt: 'Test',
        base_path: '/test',
        context: 'Test context',
        language: 'TypeScript'
      };
      
      const qaRole: QASchema = {
        prompt: 'Test',
        base_path: '/test',
        context: 'Test context',
        test_type: 'unit'
      };
      
      const custom: CustomSchema = {
        prompt: 'Test',
        base_path: '/test',
        context: 'Test context',
        role: 'custom_role'
      };
      
      // AllRoleSchemas type should accept any of the role types
      const allRoles: AllRoleSchemas[] = [
        baseRole,
        coder,
        qaRole,
        custom
      ];
      
      expect(allRoles.length).toBe(4);
    });
  });
});