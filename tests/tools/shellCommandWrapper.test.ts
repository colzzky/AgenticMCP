import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DefaultShellCommandWrapper } from '../../src/tools/shellCommandWrapper.js';
import type { ShellCommandResult, SpawnDi } from '../../types/shell.types.js';
import type { Logger } from '../../src/core/types/logger.types.js';
import { EventEmitter } from 'node:events';

// Create mock process with EventEmitter
function createMockProcess() {
  const mockStdout = new EventEmitter();
  const mockStderr = new EventEmitter();
  const mockProc = new EventEmitter() as any;
  mockProc.stdout = mockStdout;
  mockProc.stderr = mockStderr;
  return { mockProc, mockStdout, mockStderr };
}

describe('DefaultShellCommandWrapper', () => {
  let commandWrapper: DefaultShellCommandWrapper;
  let logger: Logger;
  let mockSpawnDi: jest.Mock<SpawnDi>;
  const allowedCommands = ['ls', 'echo', 'cat'];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger mock
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLogLevel: jest.fn()
    };

    // Setup spawn mock
    mockSpawnDi = jest.fn();
    
    // Initialize the command wrapper
    commandWrapper = new DefaultShellCommandWrapper(
      mockSpawnDi as unknown as SpawnDi,
      allowedCommands,
      logger
    );
  });

  it('should initialize with allowed commands', () => {
    // Act
    const commands = commandWrapper.getAllowedCommands();
    
    // Assert
    expect(commands).toEqual(expect.arrayContaining(allowedCommands));
    expect(commands.length).toBe(allowedCommands.length);
  });

  it('should execute allowed commands and handle successful execution', async () => {
    // Arrange
    const { mockProc, mockStdout, mockStderr } = createMockProcess();
    mockSpawnDi.mockReturnValue(mockProc);
    const expectedOutput = 'command output';
    
    // Act
    const resultPromise = commandWrapper.execute('ls', ['-la']);
    
    // Simulate process output and completion
    mockStdout.emit('data', Buffer.from(expectedOutput));
    mockProc.emit('close', 0);
    
    // Wait for result
    const result = await resultPromise;
    
    // Assert
    expect(mockSpawnDi).toHaveBeenCalledWith('ls', ['-la'], { shell: true });
    expect(result.success).toBe(true);
    expect(result.stdout).toBe(expectedOutput);
    expect(result.code).toBe(0);
  });

  it('should reject disallowed commands', async () => {
    // Act
    const result = await commandWrapper.execute('rm', ['-rf']);
    
    // Assert
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Command 'rm' is not allowed"));
    expect(result.success).toBe(false);
    expect(result.code).toBe(126);
    expect(result.error).toContain("is not allowed");
    expect(mockSpawnDi).not.toHaveBeenCalled();
  });

  it('should handle command execution errors', async () => {
    // Arrange
    const { mockProc, mockStdout, mockStderr } = createMockProcess();
    mockSpawnDi.mockReturnValue(mockProc);
    const expectedError = new Error('Command failed to execute');
    
    // Act
    const resultPromise = commandWrapper.execute('ls', ['-la']);
    
    // Simulate process error
    mockProc.emit('error', expectedError);
    
    // Wait for result
    const result = await resultPromise;
    
    // Assert
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Shell command error:'));
    expect(result.success).toBe(false);
    expect(result.code).toBe(-1);
    expect(result.error).toBe(expectedError.message);
  });

  it('should handle command with non-zero exit code', async () => {
    // Arrange
    const { mockProc, mockStdout, mockStderr } = createMockProcess();
    mockSpawnDi.mockReturnValue(mockProc);
    const expectedStderr = 'command error';
    
    // Act
    const resultPromise = commandWrapper.execute('cat', ['nonexistent-file']);
    
    // Simulate process output and error completion
    mockStderr.emit('data', Buffer.from(expectedStderr));
    mockProc.emit('close', 1);
    
    // Wait for result
    const result = await resultPromise;
    
    // Assert
    expect(mockSpawnDi).toHaveBeenCalledWith('cat', ['nonexistent-file'], { shell: true });
    expect(result.success).toBe(false);
    expect(result.stderr).toBe(expectedStderr);
    expect(result.code).toBe(1);
  });

  it('should handle undefined exit code by defaulting to -1', async () => {
    // Arrange
    const { mockProc, mockStdout } = createMockProcess();
    mockSpawnDi.mockReturnValue(mockProc);
    
    // Act
    const resultPromise = commandWrapper.execute('echo', ['hello']);
    
    // Simulate process close with undefined code (which shouldn't happen in real life but testing the handler)
    mockProc.emit('close', undefined);
    
    // Wait for result
    const result = await resultPromise;
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.code).toBe(-1);
  });

  it('should combine multiple data events for stdout and stderr', async () => {
    // Arrange
    const { mockProc, mockStdout, mockStderr } = createMockProcess();
    mockSpawnDi.mockReturnValue(mockProc);
    
    // Act
    const resultPromise = commandWrapper.execute('echo', ['hello']);
    
    // Simulate multiple data events
    mockStdout.emit('data', Buffer.from('hello '));
    mockStdout.emit('data', Buffer.from('world'));
    mockStderr.emit('data', Buffer.from('warning: '));
    mockStderr.emit('data', Buffer.from('some warning'));
    mockProc.emit('close', 0);
    
    // Wait for result
    const result = await resultPromise;
    
    // Assert
    expect(result.stdout).toBe('hello world');
    expect(result.stderr).toBe('warning: some warning');
  });
});