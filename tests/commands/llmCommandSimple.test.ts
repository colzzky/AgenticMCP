/**
 * Simple functional tests for LLMCommand
 * Tests the functionality rather than the Commander.js implementation
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LLMCommand } from '../../src/commands/llmCommand.js';
import { Logger } from '../../src/core/types/logger.types.js';
import { FilePathProcessorFactory } from '../../src/core/commands/baseCommand.js';
import { ProviderFactory } from '../../src/providers/providerFactory.js';
import { LLMProvider } from '../../src/core/types/provider.types.js';
import { CommandContext } from '../../src/core/types/command.types.js';
import { IFileSystem } from '../../src/core/interfaces/file-system.interface.js';

describe('LLMCommand Functionality', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockFileSystem: IFileSystem = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn()
  };

  const mockPathDI = {
    isAbsolute: (jest.fn() as any).mockReturnValue(true),
    resolve: (jest.fn() as any).mockImplementation((base, path) => path),
    basename: (jest.fn() as any).mockImplementation((path) => path.split('/').pop())
  };

  const mockFileSystemDI = {
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      access: jest.fn(),
      stat: jest.fn(),
      mkdir: jest.fn(),
      readdir: jest.fn()
    },
    existsSync: jest.fn(),
    mkdirSync: jest.fn()
  };

  const mockProcessDI = {
    cwd: (jest.fn() as any).mockReturnValue('/fake/cwd')
  } as unknown as NodeJS.Process;

  // Create mock for FilePathProcessor
  const mockProcessFileArgs = jest.fn();
  
  // Create a mock FilePathProcessorFactory
  const mockFilePathProcessorFactory: FilePathProcessorFactory = {
    pathDI: mockPathDI,
    fileSystem: mockFileSystem,
    fileSystemDI: mockFileSystemDI,
    processDi: mockProcessDI,
    factory: jest.fn() as any, // Mock the factory
    create: (jest.fn() as any).mockReturnValue({
      processArgs: mockProcessFileArgs
    })
  };

  const mockLLMProvider: LLMProvider = {
    generateText: jest.fn(),
    configure: jest.fn(),
    providerType: 'openai'
  };

  const mockProviderFactory = {
    getProvider: (jest.fn() as any).mockReturnValue(mockLLMProvider)
  } as unknown as ProviderFactory;

  let llmCommand: LLMCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    llmCommand = new LLMCommand(
      mockLogger,
      mockFilePathProcessorFactory,
      mockProviderFactory
    );
    mockProcessFileArgs.mockReset();
  });

  describe('execute method', () => {
    it('should return error if no arguments are provided', async () => {
      // Setup
      const context: CommandContext = {};
      const args: unknown[] = [];

      // Execute
      const result = await llmCommand.execute(context, ...args);

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toContain('Please provide a prompt');
      expect(mockFilePathProcessorFactory.create).not.toHaveBeenCalled();
    });

    it('should process prompt with no file context', async () => {
      // Setup
      const context: CommandContext = {};
      const args = ['Explain how JavaScript works'];
      const promptText = args.join(' ');

      mockProcessFileArgs.mockResolvedValue({
        context: '',
        remainingArgs: args
      });

      (mockLLMProvider.generateText as jest.Mock).mockResolvedValue({ content: 'JavaScript is an interpreted language...' });

      // Execute
      const result = await llmCommand.execute(context, ...args);

      // Verify
      expect(mockFilePathProcessorFactory.create).toHaveBeenCalled();
      expect(mockProcessFileArgs).toHaveBeenCalledWith(args);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('openai');
      expect(mockLLMProvider.generateText).toHaveBeenCalledWith({ messages: [{ role: 'user', content: promptText }] });
      expect(result.success).toBe(true);
      expect(result.message).toBe('JavaScript is an interpreted language...');
      expect(result.data).toEqual({ fileContextAdded: false });
    });

    it('should process prompt with file context', async () => {
      // Setup
      const context: CommandContext = {};
      const args = ['Explain this code', 'file1.js', 'file2.js'];
      const fileContext = '--- file1.js ---\nconst a = 1;\n\n--- file2.js ---\nconst b = 2;';
      const promptText = 'Explain this code';
      const fullPrompt = `${promptText}\n\n<Context_from_files>\n${fileContext}\n</Context_from_files>\n\n${promptText}`;

      mockProcessFileArgs.mockResolvedValue({
        context: fileContext,
        remainingArgs: [promptText]
      });

      (mockLLMProvider.generateText as jest.Mock).mockResolvedValue('This code defines two constants...');

      // Execute
      const result = await llmCommand.execute(context, ...args);

      // Verify
      expect(mockFilePathProcessorFactory.create).toHaveBeenCalled();
      expect(mockProcessFileArgs).toHaveBeenCalledWith(args);
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('openai');
      expect(mockLLMProvider.generateText).toHaveBeenCalledWith({ messages: [{ role: 'user', content: fullPrompt }] });
      expect(mockLogger.debug).toHaveBeenCalledWith('Added context from files to prompt');
      expect(result.success).toBe(true);
      expect(result.message).toBe('This code defines two constants...');
      expect(result.data).toEqual({ fileContextAdded: true });
    });

    it('should use specified provider and model', async () => {
      // Setup
      const context: CommandContext = {
        options: {
          provider: 'anthropic',
          model: 'claude-3-opus'
        }
      };
      const args = ['Explain quantum computing'];
      const promptText = args.join(' ');

      mockProcessFileArgs.mockResolvedValue({
        context: '',
        remainingArgs: args
      });

      (mockLLMProvider.generateText as jest.Mock).mockResolvedValue('Quantum computing uses quantum bits...');

      // Execute
      const result = await llmCommand.execute(context, ...args);

      // Verify
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('anthropic');
      expect(mockLLMProvider.configure).toHaveBeenCalledWith({
        model: 'claude-3-opus',
        providerType: 'anthropic',
        instanceName: 'apiKey'
      });
      expect(mockLLMProvider.generateText).toHaveBeenCalledWith({ messages: [{ role: 'user', content: promptText }] });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Quantum computing uses quantum bits...');
    });

    it('should handle error when provider factory is not initialized', async () => {
      // Setup
      const context: CommandContext = {};
      const args = ['Explain quantum computing'];
      // Create a command instance with undefined provider factory
      const commandWithoutProvider = new LLMCommand(
        mockLogger,
        mockFilePathProcessorFactory,
        undefined as any
      );

      mockProcessFileArgs.mockResolvedValue({
        context: '',
        remainingArgs: args
      });

      // Execute
      const result = await commandWithoutProvider.execute(context, ...args);

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Provider factory not initialized.');
    });

    it('should handle errors during text generation', async () => {
      // Setup
      const context: CommandContext = {};
      const args = ['Explain JavaScript'];
      const error = new Error('API rate limit exceeded');

      mockProcessFileArgs.mockResolvedValue({
        context: '',
        remainingArgs: args
      });

      (mockLLMProvider.generateText as jest.Mock).mockRejectedValue(error);

      // Execute
      const result = await llmCommand.execute(context, ...args);

      // Verify
      expect(mockLLMProvider.generateText).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('LLM command failed: API rate limit exceeded');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Error: API rate limit exceeded');
    });
  });

  describe('generateText method', () => {
    it('should handle string response', async () => {
      // Setup
      (mockLLMProvider.generateText as jest.Mock).mockResolvedValue('This is a plain string response');

      // Execute
      // Access the private method using any type
      const result = await (llmCommand as any).generateText(mockLLMProvider, { messages: [{ role: 'user', content: 'Test prompt' }] });

      // Verify
      expect(mockLLMProvider.generateText).toHaveBeenCalledWith({ messages: [{ role: 'user', content: 'Test prompt' }] });
      expect(result).toBe('This is a plain string response');
    });

    it('should handle object response with content property', async () => {
      // Setup
      (mockLLMProvider.generateText as jest.Mock).mockResolvedValue({
        content: 'Response in content property'
      });

      // Execute
      const result = await (llmCommand as any).generateText(mockLLMProvider, { messages: [{ role: 'user', content: 'Test prompt' }] });

      // Verify
      expect(result).toBe('Response in content property');
    });

    it('should handle object response with text property', async () => {
      // Setup
      (mockLLMProvider.generateText as jest.Mock).mockResolvedValue({
        text: 'Response in text property'
      });

      // Execute
      const result = await (llmCommand as any).generateText(mockLLMProvider, { messages: [{ role: 'user', content: 'Test prompt' }] });

      // Verify
      expect(result).toBe('Response in text property');
    });

    it('should handle OpenAI-style response format', async () => {
      // Setup
      (mockLLMProvider.generateText as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: 'OpenAI style response'
          }
        }]
      });

      // Execute
      const result = await (llmCommand as any).generateText(mockLLMProvider, { messages: [{ role: 'user', content: 'Test prompt' }] });

      // Verify
      expect(result).toBe('OpenAI style response');
    });

    it('should handle errors during text generation', async () => {
      // Setup
      const error = new Error('Failed to generate text');
      (mockLLMProvider.generateText as jest.Mock).mockRejectedValue(error);

      // Execute & Verify
      await expect((llmCommand as any).generateText(mockLLMProvider, 'Test prompt'))
        .rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Error generating text: Failed to generate text');
    });
  });

  describe('getHelp method', () => {
    it('should return help text', () => {
      // Execute
      const helpText = llmCommand.getHelp();

      // Verify
      expect(helpText).toContain('LLM Command');
      expect(helpText).toContain('Usage:');
      expect(helpText).toContain('Description:');
      expect(helpText).toContain('Options:');
      expect(helpText).toContain('Examples:');
    });
  });
});