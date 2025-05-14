/**
 * Unit tests for the program setup functionality
 * Tests the program execution flow
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

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
  
  // Mock console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockHelpHandler = null;
    
    // Mock console methods for testing
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  // Function that simulates runProgram
  async function runProgram(
    program: CommandMock,
    processDi: any,
    loggerTool: LoggerMock
  ): Promise<void> {
    // Add help handler
    program.on('--help', () => {
      console.log('');
      console.log('Use "[command] --help" for more information on a command.');
      loggerTool.info('Displaying help information.');
    });
  
    try {
      await program.parseAsync(processDi.argv);
      if (processDi.argv.slice(2).length === 0) {
        program.outputHelp();
      }
    } catch (error) {
      if (error instanceof Error) {
        loggerTool.error(`Command execution failed: ${error.message}`);
        if (processDi.env.DEBUG === 'true') {
          console.error(error.stack);
        }
      } else if (error === undefined) {
        loggerTool.error('An unknown error occurred during command execution.');
      } else {
        loggerTool.error(`Command execution failed: ${String(error)}`);
      }
      processDi.exit(1);
    }
  }
  
  it('should register help handler and display usage information', async () => {
    // Act
    await runProgram(mockCommand, mockProcess, mockLogger);
    
    // Assert
    expect(mockCommand.on).toHaveBeenCalledWith('--help', expect.any(Function));
    
    // Execute the help handler if it was registered
    if (mockHelpHandler) {
      (mockHelpHandler as Function)();
      
      // Verify console output
      expect(console.log).toHaveBeenCalledWith('');
      expect(console.log).toHaveBeenCalledWith('Use "[command] --help" for more information on a command.');
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
    await runProgram(mockCommand, emptyArgsProcess, mockLogger);
    
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
    await runProgram(mockCommand, processWithArgs, mockLogger);
    
    // Assert
    expect(mockCommand.outputHelp).not.toHaveBeenCalled();
  });
  
  it('should handle errors during command execution', async () => {
    // Arrange - parseAsync throws error
    const error = new Error('Command failed');
    mockCommand.parseAsync.mockRejectedValueOnce(error);
    
    // Act
    await runProgram(mockCommand, mockProcess, mockLogger);
    
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
    await runProgram(mockCommand, debugProcess, mockLogger);
    
    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('Command execution failed: Debug error');
    expect(console.error).toHaveBeenCalledWith(error.stack);
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });
  
  it('should handle non-Error objects during command execution', async () => {
    // Arrange - parseAsync throws non-Error object
    mockCommand.parseAsync.mockRejectedValueOnce('String error');
    
    // Act
    await runProgram(mockCommand, mockProcess, mockLogger);
    
    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('Command execution failed: String error');
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });
  
  it('should handle undefined errors during command execution', async () => {
    // Arrange - parseAsync throws undefined
    mockCommand.parseAsync.mockRejectedValueOnce(undefined);
    
    // Act
    await runProgram(mockCommand, mockProcess, mockLogger);
    
    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('An unknown error occurred during command execution.');
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });
});