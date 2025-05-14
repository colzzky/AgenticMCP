/**
 * Unit tests for the program setup functionality
 * Tests the program execution flow
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { runProgram } from './../../../src/core/setup/programSetup';

// Define logger interface
interface LoggerMock {
  info: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
  warn: jest.Mock;
  setLogLevel: jest.Mock;
}

// Define Command interface
interface CommandMock {
  on: jest.Mock;
  parseAsync: jest.Mock;
  outputHelp: jest.Mock;
}

describe('Program Setup', () => {
  // Create mock for Command
  const mockCommand: CommandMock = {
    on: jest.fn().mockImplementation((event, handler) => {
      if (event === '--help') {
        mockHelpHandler = handler;
      }
      return mockCommand;
    }),
    parseAsync: jest.fn().mockResolvedValue(undefined),
    outputHelp: jest.fn()
  };
  
  // Store help handler for testing
  let mockHelpHandler: Function | null = null;
  
  // Create mock for Logger
  const mockLogger: LoggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    setLogLevel: jest.fn()
  };
  
  // Mock process
  const mockProcess = {
    cwd: jest.fn().mockReturnValue('/test/dir'),
    exit: jest.fn(),
    argv: ['node', 'app.js'],
    env: {}
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockHelpHandler = null;
  });
  
  it('should register help handler and display usage information', async () => {
    // Act
    await runProgram(
      mockCommand as any,
      mockProcess as any,
      mockLogger as any
    );
    
    // Assert
    expect(mockCommand.on).toHaveBeenCalledWith('--help', expect.any(Function));
    
    // Execute the help handler if it was registered
    if (mockHelpHandler) {
      (mockHelpHandler as Function)();
      
      // Verify logger output
      expect(mockLogger.info).toHaveBeenCalledWith('');
      expect(mockLogger.info).toHaveBeenCalledWith('Use "[command] --help" for more information on a command.');
      expect(mockLogger.info).toHaveBeenCalledWith('Displaying help information.');
    } else {
      fail('Help handler was not registered');
    }
  });
  
  it('should display help if no arguments are provided', async () => {
    // Arrange - empty args
    const emptyArgsProcess = {
      ...mockProcess,
      argv: ['node', 'app.js'] // No additional arguments
    };
    
    // Act
    await runProgram(mockCommand as any, emptyArgsProcess as any, mockLogger as any);
    
    // Assert
    expect(mockCommand.outputHelp).toHaveBeenCalled();
  });
  
  it('should not display help if arguments are provided', async () => {
    // Arrange - with args
    const processWithArgs = {
      ...mockProcess,
      argv: ['node', 'app.js', 'command', '--option']
    };
    
    // Act
    await runProgram(mockCommand as any, processWithArgs as any, mockLogger as any);
    
    // Assert
    expect(mockCommand.outputHelp).not.toHaveBeenCalled();
  });
  
  it('should handle errors during command execution', async () => {
    // Arrange - parseAsync throws error
    const error = new Error('Command failed');
    mockCommand.parseAsync.mockRejectedValueOnce(error);
    
    // Act
    await runProgram(mockCommand as any, mockProcess as any, mockLogger as any);
    
    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('Command execution failed: Command failed');
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });
  
  it('should display stack trace when DEBUG is true', async () => {
    // Arrange - parseAsync throws error with stack
    const error = new Error('Debug error');
    error.stack = 'Error stack trace';
    mockCommand.parseAsync.mockRejectedValueOnce(error);
    
    const debugProcess = {
      ...mockProcess,
      env: { DEBUG: 'true' }
    };
    
    // Act
    await runProgram(mockCommand as any, debugProcess as any, mockLogger as any);
    
    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('Command execution failed: Debug error');
    expect(mockLogger.error).toHaveBeenCalledWith(error.stack);
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });
  
  it('should handle non-Error objects during command execution', async () => {
    // Arrange - parseAsync throws non-Error object
    mockCommand.parseAsync.mockRejectedValueOnce('String error');
    
    // Act
    await runProgram(mockCommand as any, mockProcess as any, mockLogger as any);
    
    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred during command execution.');
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });
  
  it('should handle undefined errors during command execution', async () => {
    // Arrange - parseAsync throws undefined
    mockCommand.parseAsync.mockRejectedValueOnce(undefined);
    
    // Act
    await runProgram(mockCommand as any, mockProcess as any, mockLogger as any);
    
    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred during command execution.');
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });
});