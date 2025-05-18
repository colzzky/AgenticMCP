import type { McpServer } from '../mcpServer.js';
import type { Logger } from '../../core/types/logger.types.js';
import type { LLMProvider } from '../../core/types/provider.types.js';
import {
  coderSchema,
  qaSchema,
  projectManagerSchema,
  cpoSchema,
  uiUxSchema,
  summarizerSchema,
  rewriterSchema,
  analystSchema,
  customSchema
} from './roleSchemas.js';
import { handleRoleBasedTool } from './roleHandlers.js';
import { roleEnums } from './roleSchemas.js';
import type {
  CoderSchema,
  QASchema,
  ProjectManagerSchema,
  CPOSchema,
  UIUXSchema,
  SummarizerSchema,
  RewriterSchema,
  AnalystSchema,
  CustomSchema
} from './roleSchemas.js';
import type { PathDI } from '../../types/global.types.js';
import { createFileSystemTool } from '@/tools/factory/fileSystemToolFactory';
import { constructXmlPrompt, getRoleLlmConfig } from './xmlPromptUtils';
import { FileSystemTool } from '@/tools/services/fileSystem';
import { processFileOperations } from './roleHandlers';
import { orchestrateToolLoop } from '@/providers/providerUtils';
import type { ProviderFactoryInterface } from '@/providers/types.js';

/**
 * Register role-based tools with the MCP server
 * Each tool implements a specific role with optimized XML-based prompting
 */
export function registerRoleBasedTools(
  server: McpServer,
  logger: Logger,
  providerFactoryInstance: ProviderFactoryInterface,
): McpServer {
  logger.info('Registering role-based MCP tools');
  const fileSystemTool = createFileSystemTool({});
  const handler = {
    orchestrateToolLoop,
    getRoleLlmConfig,
    constructXmlPrompt,
    processFileOperations
  }
  server.registerTool(
    'coder',
    'Expert software developer that can generate, analyze, or refactor code',
    coderSchema,
    async (args: CoderSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.CODER,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'qa',
    'Quality assurance expert that can create tests and validation procedures',
    qaSchema,
    async (args: QASchema) => handleRoleBasedTool({
      args,
      role: roleEnums.QA,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'project_manager',
    'Project management expert that can create plans, timelines, and task breakdowns',
    projectManagerSchema,
    async (args: ProjectManagerSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.PROJECT_MANAGER,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'cpo',
    'Chief Product Officer that can create product strategies, roadmaps, and feature prioritization',
    cpoSchema,
    async (args: CPOSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.CPO,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'ui_ux',
    'User interface and experience designer that can create wireframes, flows, and design recommendations',
    uiUxSchema,
    async (args: UIUXSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.UI_UX,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'summarizer',
    'Content summarizer that can create concise, accurate summaries of documents or information',
    summarizerSchema,
    async (args: SummarizerSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.SUMMARIZER,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'rewriter',
    'Content rewriter that can improve or adapt text for different purposes, audiences, or styles',
    rewriterSchema,
    async (args: RewriterSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.REWRITER,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'analyst',
    'Data analyst that can analyze information, identify patterns, and generate insights',
    analystSchema,
    async (args: AnalystSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.ANALYST,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  server.registerTool(
    'custom',
    'Custom role based on the provided description',
    customSchema,
    async (args: CustomSchema) => handleRoleBasedTool({
      args,
      role: roleEnums.CUSTOM,
      logger,
      providerFactoryInstance,
      fileSystemTool,
      handlers: handler
    })
  );
  logger.info('Role-based MCP tools registered successfully');
  return server;
}