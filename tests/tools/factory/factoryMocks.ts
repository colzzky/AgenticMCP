// Mocks for factory tests
import { jest } from '@jest/globals';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { IFileSystem } from '../../../src/core/interfaces/file-system.interface.js';
import type { IDiffService } from '../../../src/core/interfaces/diff-service.interface.js';
import type { PathDI } from '../../../src/global.types.js';
import { DI_TOKENS } from '../../../src/core/di/tokens.js';

// Mock the DIContainer class methods
export const mockGet = jest.fn();
export const mockGetSingleton = jest.fn();

// Mock dependencies
export const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLogLevel: jest.fn()
};

export const mockFileSystem: IFileSystem = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  rmdir: jest.fn()
};

export const mockDiffService: IDiffService = {
  generateDiff: jest.fn()
};

export const mockPathDI: PathDI = {
  resolve: jest.fn(),
  join: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn(),
  extname: jest.fn(),
  isAbsolute: jest.fn().mockReturnValue(true),
  sep: '/'
} as unknown as PathDI;

// Setup mock container behavior
export function setupContainerDefaultMocks() {
  mockGet.mockImplementation(token => {
    if (token === DI_TOKENS.LOGGER) return mockLogger;
    return undefined;
  });
  
  mockGetSingleton.mockImplementation(token => {
    if (token === DI_TOKENS.FILE_SYSTEM) return mockFileSystem;
    if (token === DI_TOKENS.DIFF_SERVICE) return mockDiffService;
    if (token === DI_TOKENS.PATH_DI) return mockPathDI;
    return undefined;
  });
}

// Mock FileSystemTool constructor
export const mockFileSystemTool = jest.fn().mockImplementation(() => ({
  getCommandMap: jest.fn().mockReturnValue({}),
  getToolDefinitions: jest.fn().mockReturnValue([]),
  execute: jest.fn().mockResolvedValue({})
}));