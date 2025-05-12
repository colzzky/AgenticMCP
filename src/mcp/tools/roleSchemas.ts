import { z } from 'zod';

export enum roleEnums {
  CODER = 'coder',
  QA = 'qa',
  PROJECT_MANAGER = 'project_manager',
  CPO = 'cpo',
  UI_UX = 'ui_ux',
  SUMMARIZER = 'summarizer',
  REWRITER = 'rewriter',
  ANALYST = 'analyst',
  CUSTOM = 'custom',
}

/**
 * Base schema for all role-based tools
 * Includes required prompt and base_path parameters
 */
export const baseRoleSchema = {
  prompt: z.string().describe("The task or question"),
  base_path: z.string().describe("Base directory for all file operations (security boundary)"),
  context: z.string().optional().describe("Additional context or background information"),
  related_files: z.array(z.string()).optional().describe("Paths to related files (relative to base_path)"),
  role: z.enum([roleEnums.CODER, roleEnums.QA, roleEnums.PROJECT_MANAGER, roleEnums.CPO, roleEnums.UI_UX, roleEnums.SUMMARIZER, roleEnums.REWRITER, roleEnums.ANALYST, roleEnums.CUSTOM]).optional().describe("The role to assume"),
};
const baseRoleSchemaObject = z.object(baseRoleSchema);
export type BaseRoleSchema = z.infer<typeof baseRoleSchemaObject>;

export const coderSchema = {
  ...baseRoleSchema,
  language: z.string().optional().describe("Programming language to use (e.g., JavaScript, Python)"),
  architecture: z.string().optional().describe("Preferred architecture or design pattern"),
  tests: z.boolean().optional().describe("Whether to include tests"),
};
const coderSchemaObject = z.object(coderSchema);
export type CoderSchema = z.infer<typeof coderSchemaObject>;

export const qaSchema = {
  ...baseRoleSchema,
  test_type: z.enum(["unit", "integration", "e2e", "manual", "all"]).optional().describe("Type of tests to generate"),
  framework: z.string().optional().describe("Testing framework to use"),
};
const qaSchemaObject = z.object(qaSchema);
export type QASchema = z.infer<typeof qaSchemaObject>;

export const projectManagerSchema = {
  ...baseRoleSchema,
  timeline: z.string().optional().describe("Project timeline constraints"),
  resources: z.string().optional().describe("Available resources or team composition"),
  methodology: z.enum(["agile", "waterfall", "kanban", "scrum", "other"]).optional().describe("Project management methodology"),
};
const projectManagerSchemaObject = z.object(projectManagerSchema);
export type ProjectManagerSchema = z.infer<typeof projectManagerSchemaObject>;

export const cpoSchema = {
  ...baseRoleSchema,
  market: z.string().optional().describe("Target market or user demographics"),
  competitors: z.string().optional().describe("Key competitors or market landscape"),
  metrics: z.string().optional().describe("Success metrics or KPIs"),
};
const cpoSchemaObject = z.object(cpoSchema);
export type CPOSchema = z.infer<typeof cpoSchemaObject>;

export const uiUxSchema = {
  ...baseRoleSchema,
  platform: z.string().optional().describe("Target platform (e.g., web, mobile, desktop)"),
  brand_guidelines: z.string().optional().describe("Brand guidelines or design system"),
  accessibility: z.enum(["AA", "AAA", "none"]).optional().describe("Accessibility requirements"),
};
const uiUxSchemaObject = z.object(uiUxSchema);
export type UIUXSchema = z.infer<typeof uiUxSchemaObject>;

export const summarizerSchema = {
  ...baseRoleSchema,
  length: z.enum(["short", "medium", "long"]).optional().describe("Desired summary length"),
  focus: z.string().optional().describe("Specific aspects to focus on"),
  format: z.enum(["bullets", "paragraphs", "outline"]).optional().describe("Output format"),
};
const summarizerSchemaObject = z.object(summarizerSchema);
export type SummarizerSchema = z.infer<typeof summarizerSchemaObject>;

export const rewriterSchema = {
  ...baseRoleSchema,
  style: z.string().optional().describe("Target writing style"),
  tone: z.string().optional().describe("Desired tone"),
  audience: z.string().optional().describe("Target audience"),
};
const rewriterSchemaObject = z.object(rewriterSchema);
export type RewriterSchema = z.infer<typeof rewriterSchemaObject>;

export const analystSchema = {
  ...baseRoleSchema,
  data_type: z.string().optional().describe("Type of data being analyzed"),
  analysis_focus: z.string().optional().describe("Specific aspects to analyze"),
  visualization: z.boolean().optional().describe("Whether to include visualization recommendations"),
};
const analystSchemaObject = z.object(analystSchema);
export type AnalystSchema = z.infer<typeof analystSchemaObject>;

export const customSchema = {
  ...baseRoleSchema,
  role: z.string().describe("The specific role to assume"),
  parameters: z.record(z.any()).optional().describe("Additional role-specific parameters"),
};
const customSchemaObject = z.object(customSchema);
export type CustomSchema = z.infer<typeof customSchemaObject>;

export type AllRoleSchemas = CoderSchema | QASchema | ProjectManagerSchema | CPOSchema | UIUXSchema | SummarizerSchema | RewriterSchema | AnalystSchema | CustomSchema;

