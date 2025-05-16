#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from './core/utils/logger';
import { ConfigManager } from './core/config/configManager';
import { DIContainer } from './core/di/container';
import { FileSystemTool } from './tools/fileSystemTool';
import { DILocalShellCliTool } from './tools/localShellCliTool';
import { DefaultShellCommandWrapper } from './tools/shellCommandWrapper';
import { SHELL_COMMANDS } from './tools/localShellCliToolDefinitions';
import { spawn } from 'node:child_process';
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
import { createFileKeytar } from './core/credentials/file-keytar';
import { DefaultFilePathProcessorFactory } from './core/commands/baseCommand';
import { McpServer } from "./mcp/mcpServer";
import { McpServer as BaseMcpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DIFilePathProcessor } from './context/filePathProcessor';
import { CredentialManager } from './core/credentials/credentialManager';
import { ProviderFactory } from './providers/providerFactory';
import { RoleBasedToolsRegistrarFactory } from './mcp/tools/registrarFactory';
import { defaultAppConfig } from './config/appConfig';
import {
  setupDependencyInjection,
  setupToolSystem,
  setupProviderSystem,
  setupCliCommands,
  runProgram
} from './core/setup';

import { mainDI, MainDependencies } from './mainDI';

// Main application entry point
export async function main(): Promise<void> {
  const dependencies: MainDependencies = {
    // Core dependencies
    pkg: {
      version: '1.0.0',
      description: 'AgenticMCP',
    },
    logger,
    process,
    path,
    fs,
    spawn,
    keytar: createFileKeytar(),
    
    // Setup functions
    setupDependencyInjection,
    setupToolSystem,
    setupProviderSystem,
    setupCliCommands,
    runProgram,
    
    // Classes and factories
    Command,
    DIContainer,
    FileSystemService,
    DiffService,
    FileSystemTool,
    DILocalShellCliTool,
    DefaultShellCommandWrapper,
    SHELL_COMMANDS,
    ToolRegistry,
    ToolExecutor,
    ToolResultFormatter,
    ConfigManager,
    ProviderInitializer,
    ProviderFactory,
    DefaultFilePathProcessorFactory,
    DIFilePathProcessor,
    McpCommands,
    LLMCommand,
    ToolCommands,
    McpServer,
    BaseMcpServer,
    StdioServerTransport,
    CredentialManager,
    RoleBasedToolsRegistrarFactory,
    
    // Configuration
    defaultAppConfig
  };
  
  // Call the dependency-injectable version of main
  await mainDI(dependencies);
}

// Execute the application
await main();
