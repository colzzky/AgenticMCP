/**
 * @file Tests for LLMCommand
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
// Import the original modules before mocking
import { LLMCommand } from '../../src/commands/llmCommand';
import { FilePathProcessor } from '../../src/context/filePathProcessor';

// No need to re-declare mock here - the mock file will be used automatically

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
      // Set up mock provider to better check arguments
      mockProvider.generateText.mockImplementation(({ prompt }) => {
        // Just return generated text for the test
        return Promise.resolve({ content: 'Generated text response' });
      });
      
      // Execute command with file paths
      const result = await llmCommand.execute({ options: {} }, 'Summarize', 'file.txt', 'example.md');

      // Verify that the provider was called with the right prompt
      expect(mockProvider.generateText).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Summarize')
      });
      
      // This assertion is handled by our mock file-path-processor.js which adds file content
      // to any paths with .txt or .md extensions

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