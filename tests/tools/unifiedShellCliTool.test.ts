/**
 * @fileoverview Tests for the UnifiedShellCliTool class
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UnifiedShellCliTool } from '../../src/tools/unifiedShellCliTool';
import type { Logger } from '../../src/core/types/logger.types.js';
import type { ShellCommandWrapper, ShellCommandResult } from '../../src/types/shell.types.js';

describe('UnifiedShellCliTool', () => {
  // Mock logger
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  // Mock shell command wrapper with Jest function
  const mockExecute = jest.fn();
  const mockGetAllowedCommands = jest.fn();
  
  const mockShellWrapper: ShellCommandWrapper = {
    execute: mockExecute,
    getAllowedCommands: mockGetAllowedCommands
  };

  let unifiedShellTool: UnifiedShellCliTool;
  const allowedCommands = ['ls', 'cat', 'grep', 'pwd'];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockExecute.mockResolvedValue({
      success: true,
      stdout: 'command output',
      stderr: '',
      code: 0
    });
    mockGetAllowedCommands.mockReturnValue(allowedCommands);
    
    unifiedShellTool = new UnifiedShellCliTool(
      { allowedCommands },
      mockShellWrapper,
      mockLogger
    );
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(unifiedShellTool).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('getToolDefinition', () => {
    it('should return a single tool definition', () => {
      const toolDef = unifiedShellTool.getToolDefinition();
      
      expect(toolDef).toBeDefined();
      expect(toolDef.type).toBe('function');
      expect(toolDef.name).toBe('shell');
      expect(toolDef.parameters).toBeDefined();
      expect(toolDef.parameters.properties).toHaveProperty('command');
      expect(toolDef.parameters.properties).toHaveProperty('args');
    });
  });
  
  describe('execute', () => {
    it('should execute an allowed command', async () => {
      const result = await unifiedShellTool.execute({
        command: 'ls',
        args: ['-la']
      });
      
      expect(mockExecute).toHaveBeenCalledWith('ls', ['-la']);
      expect(result).toEqual({
        success: true,
        stdout: 'command output',
        stderr: '',
        code: 0
      });
    });
    
    it('should not execute disallowed commands', async () => {
      const result = await unifiedShellTool.execute({
        command: 'rm', // Not in allowed commands
        args: ['-rf', '/']
      });
      
      expect(mockExecute).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: '',
        code: 126,
        error: expect.any(String)
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    it('should handle command execution errors', async () => {
      // Mock execution failure
      const errorResult: ShellCommandResult = {
        success: false,
        stdout: '',
        stderr: 'command failed',
        code: 1,
        error: 'Command execution error'
      };
      mockExecute.mockResolvedValueOnce(errorResult);
      
      const result = await unifiedShellTool.execute({
        command: 'ls',
        args: ['-la', '/nonexistent']
      });
      
      expect(mockExecute).toHaveBeenCalledWith('ls', ['-la', '/nonexistent']);
      expect(result).toEqual(errorResult);
    });
    
    it('should handle command with no args', async () => {
      mockExecute.mockResolvedValueOnce({
        success: true,
        stdout: 'pwd output',
        stderr: '',
        code: 0
      });
      
      const result = await unifiedShellTool.execute({
        command: 'pwd'
      });
      
      expect(mockExecute).toHaveBeenCalledWith('pwd', []);
      expect(result).toEqual({
        success: true,
        stdout: 'pwd output',
        stderr: '',
        code: 0
      });
    });
  });
  
  describe('getAllowedCommands', () => {
    it('should return allowed commands array', () => {
      const commands = unifiedShellTool.getAllowedCommands();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands).toEqual(allowedCommands);
    });
  });
});