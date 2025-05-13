/**
 * Full test suite for DILocalCliTool with proper ESM mocking
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import type { Logger } from '../../src/core/types/logger.types';
import type { IFileSystem } from '../../src/core/interfaces/file-system.interface';
import type { IDiffService } from '../../src/core/interfaces/diff-service.interface';

// Mock the path module
const mockPathModule = {
  resolve: jest.fn((...parts) => parts.join('/')),
  join: jest.fn((...parts) => parts.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  relative: jest.fn((from, to) => to.replace(from, '')),
  isAbsolute: jest.fn((path) => path.startsWith('/')),
  sep: '/',
};

// Register mocks before imports
jest.unstable_mockModule('node:path', () => mockPathModule);

describe('DILocalCliTool', () => {
  let DILocalCliTool: any;
  let logger: MockProxy<Logger>;
  let fileSystem: MockProxy<IFileSystem>;
  let diffService: MockProxy<IDiffService>;
  let tool: any;

  beforeAll(async () => {
    // Dynamic import after mocking
    const module = await import('../../src/tools/localCliTool');
    DILocalCliTool = module.DILocalCliTool;
  });

  beforeEach(() => {
    // Create mocks
    logger = mock<Logger>();
    fileSystem = mock<IFileSystem>();
    diffService = mock<IDiffService>();

    // Setup path module mock
    mockPathModule.isAbsolute.mockReturnValue(true);
    mockPathModule.resolve.mockReturnValue('/test/dir');

    // Set up diffService methods
    diffService.generateDiff.mockImplementation((oldContent, newContent) => {
      return `--- a/file\n+++ b/file\n@@ -1,1 +1,1 @@\n-${oldContent}\n+${newContent}`;
    });

    // Create with minimal config
    tool = new DILocalCliTool({
      baseDir: '/test/dir'
    }, logger, fileSystem, diffService);
  });

  it('can be instantiated', () => {
    expect(tool).toBeDefined();
  });

  it('should provide available commands', () => {
    const commands = tool.getCommandMap();
    expect(commands).toBeDefined();
    expect(Object.keys(commands).length).toBeGreaterThan(0);
    expect(commands).toHaveProperty('read_file');
    expect(commands).toHaveProperty('write_file');
  });

  it('should provide tool definitions', () => {
    const defs = tool.getToolDefinitions();
    expect(Array.isArray(defs)).toBe(true);
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0]).toHaveProperty('type', 'function');
    expect(defs[0].function).toHaveProperty('name');
    expect(defs[0].function).toHaveProperty('parameters');
  });
});