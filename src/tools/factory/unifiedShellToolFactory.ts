/**
 * @file Factory for creating UnifiedShellCliTool instances with dependency injection
 */
import { DefaultShellCommandWrapper } from '../shellCommandWrapper.js';
import { UnifiedShellCliTool, UnifiedShellCliToolConfig } from '../unifiedShellCliTool.js';
import { logger } from '@/core/utils';
import {spawn } from 'node:child_process';

/**
 * Creates a new UnifiedShellCliTool instance with dependencies from the DI container
 * @param config Configuration for the UnifiedShellCliTool
 * @returns A new UnifiedShellCliTool instance
 */
export function createUnifiedShellCliTool(
  config: UnifiedShellCliToolConfig,
): UnifiedShellCliTool {
  const shellWrapper = new DefaultShellCommandWrapper(
    spawn,
    [],
    logger,
  )
  return new UnifiedShellCliTool(config, shellWrapper, logger);
}