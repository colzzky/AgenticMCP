/**
 * @file Factory for creating FileSystemTool instances with dependency injection
 */
import { FileSystemTool, FileSystemToolConfig } from '../services/fileSystem';
import { logger } from '@/core/utils';
import { FileSystemService } from '@/core/services/file-system.service';
import path from 'node:path';
import fs from 'node:fs/promises';
import { DiffService } from '@/core/services/diff.service';

/**
 * Creates a new FileSystemTool instance with dependencies from the DI container
 * @param config Configuration for the LocalCliTool
 * @param container DI container to get dependencies from
 * @returns A new FileSystemTool instance
 */
export function createFileSystemTool(config: FileSystemToolConfig): FileSystemTool {
  const defaultConfig: FileSystemToolConfig = {
    baseDir: process.cwd(),
    allowFileOverwrite: false
  };
  const fileSystem = new FileSystemService(path, fs);
  const diffService = new DiffService();
  return new FileSystemTool({ ...defaultConfig, ...config }, logger, fileSystem, diffService, path);
}