#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json' assert { type: 'json' };
import { logger } from './core/utils/logger';
import { ConfigManager } from './core/config/configManager';
import { DIContainer } from './core/di/container';
import { DILocalCliTool } from './tools/localCliTool';
import { ToolRegistry } from './tools/toolRegistry';
import { FileSystemService } from './core/services/file-system.service';
import { DiffService } from './core/services/diff.service';
import { ToolExecutor } from './tools/toolExecutor';
import { ToolResultFormatter } from './tools/toolResultFormatter';
import { ProviderInitializer } from './providers/providerInitializer';
import { McpCommands } from './commands/mcpCommands';
import { LLMCommand } from './commands/llmCommand';
import { ToolCommands } from './commands/toolCommands';
import path from 'node:path';
import * as fs from 'node:fs/promises';
import { DefaultFilePathProcessorFactory } from './core/commands/baseCommand';
import { McpServer } from "./mcp/mcpServer";
import { McpServer as BaseMcpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DIFilePathProcessor } from './context/filePathProcessor';
import { CredentialManager } from './core/credentials/credentialManager';
import { ProviderFactory } from './providers/providerFactory';
import { RoleBasedToolsRegistrarFactory } from './mcp/tools/registrarFactory';
import { defaultAppConfig } from './config/appConfig';
import { NodeFileSystem } from './core/adapters/nodeFileSystemAdapter';
import {
  setupDependencyInjection,
  setupToolSystem,
  setupProviderSystem,
  setupCliCommands,
  runProgram
} from './core/setup';

// Main application entry point
async function main(): Promise<void> {
  try {
    const program = new Command();
    program.version(pkg.version).description(pkg.description);

    // Create the role-based tools registrar
    const roleRegistrar = RoleBasedToolsRegistrarFactory.createDefault();

    // Set up the dependency injection container
    const container = DIContainer.getInstance();
    const diResult = setupDependencyInjection(
      container,
      logger,
      FileSystemService,
      DiffService,
      path,
      fs,
      process,
      DILocalCliTool
    );

    // Set up the tools system
    const tools = setupToolSystem(
      diResult.localCliToolInstance,
      ToolRegistry,
      ToolExecutor,
      ToolResultFormatter,
      logger
    );

    // Set up provider system with app config
    const providers = setupProviderSystem(
      ConfigManager,
      ProviderInitializer,
      tools.toolRegistry,
      logger,
      path,
      fs,
      defaultAppConfig,
      ProviderFactory
    );

    const nfsInstance = new NodeFileSystem(path, fs);

    // Create file path processor factory
    const filePathProcessorFactory = new DefaultFilePathProcessorFactory(
      path,
      nfsInstance,
      fs,
      process,
      DIFilePathProcessor
    );

    const providerFactoryInstance = new ProviderFactory(
      providers.configManager,
      logger
    );

    // Configure and register CLI commands
    setupCliCommands(
      program,
      path,
      fs,
      McpCommands,
      LLMCommand,
      ToolCommands,
      providers.configManager,
      logger,
      tools.toolRegistry,
      tools.toolExecutor,
      process,
      filePathProcessorFactory,
      providerFactoryInstance,
      McpServer,
      BaseMcpServer,
      StdioServerTransport,
      ProviderFactory,
      CredentialManager,
      roleRegistrar
    );

    // Run the program
    await runProgram(program, process, logger);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Unhandled error in main function: ${errorMessage}`);
    process.exit(1);
  }
}

// Execute the application
await main();
