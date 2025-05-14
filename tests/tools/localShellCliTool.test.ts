import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DILocalShellCliTool, LocalShellCliToolConfig } from '../../src/tools/localShellCliTool.js';
import type { Logger } from '../../src/core/types/logger.types.js';
import type { ShellCommandWrapper, ShellCommandResult } from '../../types/shell.types.js';

// Mock DefaultShellCommandWrapper
const mockExecute = jest.fn();
const mockGetAllowedCommands = jest.fn();

const mockShellWrapper: ShellCommandWrapper = {
  execute: mockExecute,
  getAllowedCommands: mockGetAllowedCommands
};

describe('DILocalShellCliTool', () => {
  let tool: DILocalShellCliTool;
  const allowedCommands = ['ls', 'echo'];
  let logger: Logger;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockExecute.mockImplementation((command, args) => {
      if (allowedCommands.includes(command)) {
        return Promise.resolve({
          success: true,
          stdout: `Running ${command} ${args?.join(' ') || ''}`,
          stderr: '',
          code: 0
        });
      } else {
        return Promise.resolve({
          success: false,
          stdout: '',
          stderr: `Command not allowed: ${command}`,
          code: 126,
          error: `Command '${command}' is not allowed.`
        });
      }
    });

    mockGetAllowedCommands.mockReturnValue(allowedCommands);

    // Setup logger
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLogLevel: jest.fn()
    };

    // Initialize tool
    tool = new DILocalShellCliTool(
      { allowedCommands },
      mockShellWrapper,
      logger
    );
  });

  it('should execute allowed commands', async () => {
    // Act
    const result = await tool.execute('ls', ['-la']);

    // Assert
    expect(mockExecute).toHaveBeenCalledWith('ls', ['-la']);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Running ls -la');
    expect(result.code).toBe(0);
  });

  it('should reject disallowed commands', async () => {
    // Arrange - Setup execute to throw for disallowed commands
    mockExecute.mockImplementationOnce(() => {
      throw new Error(`Command 'rm' is not allowed.`);
    });

    // Act & Assert
    await expect(tool.execute('rm', ['-rf', '/'])).rejects.toThrow(/not allowed/);
  });

  it('should provide command map for allowed commands', () => {
    // Act
    const commandMap = tool.getCommandMap();

    // Assert
    expect(Object.keys(commandMap)).toEqual(expect.arrayContaining(allowedCommands));
    expect(typeof commandMap.ls).toBe('function');
    expect(typeof commandMap.echo).toBe('function');
  });

  it('should filter tool definitions to only include allowed commands', () => {
    // Act
    const toolDefs = tool.getToolDefinitions();

    // Assert
    expect(toolDefs.length).toBeGreaterThan(0);
    expect(toolDefs.every(def => allowedCommands.includes(def.name))).toBe(true);
  });
});
