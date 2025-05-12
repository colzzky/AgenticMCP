/**
 * @file Tests for LLMCommand
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { LLMCommand } from '../../src/commands/llmCommand';
import { FilePathProcessor } from '../../src/context/filePathProcessor';

// Create mock for FilePathProcessor
jest.mock('../../src/context/filePathProcessor', () => {
  return {
    FilePathProcessor: jest.fn().mockImplementation(() => {
      return {
        processArgs: jest.fn().mockImplementation(async (...args: unknown[]): Promise<{ context: string; remainingArgs: string[] }> => {
          const [argArray] = args as [string[]];
          // Simple mock implementation for testing
          const fileArgs = (argArray as string[]).filter((arg: string) => arg.includes('.txt') || arg.includes('.md'));
          const remainingArgs = (argArray as string[]).filter((arg: string) => !(fileArgs as string[]).includes(arg));
          const context = (fileArgs as string[]).length > 0 ?
            `Content from files: ${(fileArgs as string[]).join(', ')}` :
            '';

          return { context, remainingArgs };
        })
      };
    })
  };
});

// Mock logger
jest.mock('../../src/core/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('LLMCommand', () => {
  let llmCommand: LLMCommand;
  let mockProvider: {
    generateText: jest.MockedFunction<(options: { prompt: string }) => Promise<{ content: string }>>;
    configure: jest.MockedFunction<(options: { model: string; providerType: string }) => Promise<void>>;
  };
  let mockProviderFactory: {
    getProvider: jest.MockedFunction<(provider: string) => unknown>;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock provider
    mockProvider = {
      generateText: jest.fn<(options: { prompt: string }) => Promise<{ content: string }>>().mockResolvedValue({ content: 'Generated text response' }),
      configure: jest.fn<(options: { model: string; providerType: string }) => Promise<void>>()
    };

    // Mock provider factory
    mockProviderFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider)
    };

    // Assign to globalThis
    (globalThis as typeof globalThis & { providerFactory?: any }).providerFactory = mockProviderFactory;

    // Create command instance
    llmCommand = new LLMCommand();

    // Mock FilePathProcessor implementation
    (FilePathProcessor.prototype.processArgs as unknown as jest.MockedFunction<(args: string[]) => Promise<{ context: string; remainingArgs: string[] }>>).mockImplementation(async (args: string[]): Promise<{ context: string; remainingArgs: string[] }> => {
      // If args contain 'file.txt', treat it as a file path
      const filePaths = args.filter((arg: string) => arg.includes('.txt') || arg.includes('.md'));
      const remainingArgs = args.filter((arg: string) => !filePaths.includes(arg));

      const hasFiles = filePaths.length > 0;
      const context = hasFiles ?
        `--- File Content ---\nThis is the content of ${filePaths.join(', ')}` :
        '';

      return { context, remainingArgs };
    });
  });

  afterEach(() => {
    // Clean up global
    delete (globalThis as typeof globalThis & { providerFactory?: any }).providerFactory;
  });

  describe('execute', () => {
    it('should handle prompts without file paths', async () => {
      // Execute command with simple prompt
      const result = await llmCommand.execute({ options: {} }, 'Generate a poem');

      // Verify that provider was called with prompt
      expect(mockProvider.generateText).toHaveBeenCalledWith({
        prompt: 'Generate a poem'
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.message).toBe('Generated text response');
      expect(result.data).toEqual({ fileContextAdded: false });
    });

    it('should process file paths and add context to prompt', async () => {
      // Execute command with file paths
      const result = await llmCommand.execute(
        { options: {} },
        'Summarize',
        'file.txt',
        'example.md'
      );

      // Verify that provider was called with prompt including file content
      expect(mockProvider.generateText).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Summarize')
      });
      expect(mockProvider.generateText).toHaveBeenCalledWith({
        prompt: expect.stringContaining('File Content')
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fileContextAdded: true });
    });

    it('should use specified provider and model', async () => {
      // Execute command with provider and model options
      await llmCommand.execute(
        {
          options: {
            provider: 'anthropic',
            model: 'claude-3-opus'
          }
        },
        'Generate a poem'
      );

      // Verify that provider factory was called with correct provider
      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith('anthropic');

      // Verify that provider was configured with model
      expect(mockProvider.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus',
          providerType: 'anthropic'
        })
      );
    });

    it('should handle provider errors', async () => {
      // Mock provider to throw error
      mockProvider.generateText.mockRejectedValue(new Error('Provider error'));

      // Execute command
      const result = await llmCommand.execute({ options: {} }, 'Generate a poem');

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.message).toContain('Provider error');
    });

    it('should handle missing provider factory', async () => {
      // Remove provider factory from global
      delete globalThis.providerFactory;

      // Execute command
      const result = await llmCommand.execute({ options: {} }, 'Generate a poem');

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.message).toContain('Provider factory not initialized');
    });
  });
});