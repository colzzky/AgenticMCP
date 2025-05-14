/**
 * Unit tests for llmCommandSetup
 * Tests the registration of LLM commands with the CLI program
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { registerLlmCommand } from '../../../src/core/setup/llmCommandSetup.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { FilePathProcessorFactory } from '../../../src/core/commands/type.js';

describe('llmCommandSetup', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };
  
  // Mock Command object
  const mockCommand = {
    command: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    allowUnknownOption: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis()
  };
  
  // Mock LLMCommand class and instance
  const mockLLMCommandInstance = {
    name: 'llm',
    description: 'Execute LLM commands',
    execute: jest.fn().mockResolvedValue({ success: true, message: 'Command executed successfully' })
  };
  
  const MockLLMCommand = jest.fn().mockImplementation(() => mockLLMCommandInstance);
  
  // Mock FilePathProcessorFactory
  const mockFilePathProcessorFactory: FilePathProcessorFactory = () => ({
    processFilePaths: jest.fn()
  });
  
  // Mock ProviderFactoryInstance
  const mockProviderFactory = {
    createProvider: jest.fn()
  };
  
  // Save original console.log and console.error
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.log and console.error
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  // Restore console.log and console.error after tests
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  it('should register LLM command with the CLI program', () => {
    // Act
    registerLlmCommand(
      mockCommand as any,
      MockLLMCommand as any,
      mockLogger,
      mockFilePathProcessorFactory,
      mockProviderFactory as any
    );
    
    // Assert
    // Verify LLMCommand instantiation
    expect(MockLLMCommand).toHaveBeenCalledWith(
      mockLogger,
      mockFilePathProcessorFactory,
      mockProviderFactory
    );
    
    // Verify command registration
    expect(mockCommand.command).toHaveBeenCalledWith('llm');
    expect(mockCommand.description).toHaveBeenCalledWith('Execute LLM commands');
    
    // Verify options
    expect(mockCommand.option).toHaveBeenCalledWith(
      '-p, --provider <provider>',
      'LLM provider to use (default: openai)'
    );
    expect(mockCommand.option).toHaveBeenCalledWith(
      '-m, --model <model>',
      'Model to use with the provider'
    );
    
    // Verify allow unknown options for file paths
    expect(mockCommand.allowUnknownOption).toHaveBeenCalledWith(true);
    
    // Verify action registration
    expect(mockCommand.action).toHaveBeenCalled();
  });
  
  it('should execute command and log success message', async () => {
    // Act
    registerLlmCommand(
      mockCommand as any,
      MockLLMCommand as any,
      mockLogger,
      mockFilePathProcessorFactory,
      mockProviderFactory as any
    );
    
    // Get action callback
    const actionCallback = mockCommand.action.mock.calls[0][0];
    
    // Execute action callback with mock options and command
    await actionCallback(
      { provider: 'openai', model: 'gpt-4' },
      { args: ['input.txt'] }
    );
    
    // Assert
    // Verify LLM command execution
    expect(mockLLMCommandInstance.execute).toHaveBeenCalledWith(
      { options: { provider: 'openai', model: 'gpt-4' } },
      'input.txt'
    );
    
    // Verify console output
    expect(console.log).toHaveBeenCalledWith('Command executed successfully');
  });
  
  it('should handle command execution errors', async () => {
    // Arrange
    mockLLMCommandInstance.execute.mockRejectedValueOnce(new Error('Command failed'));
    
    // Act
    registerLlmCommand(
      mockCommand as any,
      MockLLMCommand as any,
      mockLogger,
      mockFilePathProcessorFactory,
      mockProviderFactory as any
    );
    
    // Get action callback
    const actionCallback = mockCommand.action.mock.calls[0][0];
    
    // Execute action callback with mock options and command
    await actionCallback(
      { provider: 'openai', model: 'gpt-4' },
      { args: ['input.txt'] }
    );
    
    // Assert
    // Verify error logging
    expect(mockLogger.error).toHaveBeenCalledWith('Error executing LLM command: Command failed');
    expect(console.error).toHaveBeenCalledWith('Error: Command failed');
  });
  
  it('should handle command result with error', async () => {
    // Arrange
    mockLLMCommandInstance.execute.mockResolvedValueOnce({ 
      success: false, 
      message: 'Invalid provider specified' 
    });
    
    // Act
    registerLlmCommand(
      mockCommand as any,
      MockLLMCommand as any,
      mockLogger,
      mockFilePathProcessorFactory,
      mockProviderFactory as any
    );
    
    // Get action callback
    const actionCallback = mockCommand.action.mock.calls[0][0];
    
    // Execute action callback with mock options and command
    await actionCallback(
      { provider: 'invalid', model: 'gpt-4' },
      { args: ['input.txt'] }
    );
    
    // Assert
    // Verify error console output
    expect(console.error).toHaveBeenCalledWith('Invalid provider specified');
  });
});