/**
 * @file LLM Command with dependency injection for better testability
 */

import type { CommandContext, CommandOutput } from '../core/types/command.types';
import type { LLMProvider } from '../core/types/provider.types';
import { DIBaseCommand } from '../core/commands/di-base-command';
import { DIContainer } from '../core/di/container';
import { DI_TOKENS } from '../core/di/tokens';
import type { Logger } from '../core/types/logger.types';

/**
 * LLMCommand with dependency injection for testability
 * Interact with LLMs using file paths as context
 */
export class DILLMCommand extends DIBaseCommand {
  name = 'llm';
  description = 'Interact with LLMs, using file paths as context';
  aliases = ['ask', 'query'];
  options = [
    {
      flags: '-p, --provider <provider>',
      description: 'LLM provider to use (default: openai)'
    },
    {
      flags: '-m, --model <model>',
      description: 'Model to use with the provider'
    }
  ];

  // Provider factory injected from DI container
  private providerFactory: any;

  /**
   * Create a new LLMCommand with DI
   * @param logger - Logger instance
   * @param container - DI container
   */
  constructor(logger: Logger, container?: DIContainer) {
    super(logger, container);
    
    // Get provider factory from container or fallback to global
    this.providerFactory = this.container.get(DI_TOKENS.PROVIDER_FACTORY) || globalThis.providerFactory;
  }

  /**
   * Execute the LLM command
   * @param context - Command context
   * @param args - Command arguments (can include file paths and prompt text)
   */
  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    if (args.length === 0) {
      return {
        success: false,
        message: 'Please provide a prompt or file paths as arguments.'
      };
    }
    
    try {
      // Process file paths in arguments
      const { context: fileContext, remainingArgs } = await this.processFileArgs(args);
      
      // Remaining args form the prompt
      const promptText = remainingArgs.join(' ');
      
      // Prepare the full prompt with file context using XML-formatted prompting
      let fullPrompt = '';
      
      // Format prompt using XML tags for role, context, task, etc.
      fullPrompt = this.formatPromptWithXmlTags(promptText, fileContext);
      
      if (fileContext) {
        this.logger.info('Added context from files to prompt');
      }
      
      // Get provider from context or use default
      const providerName = (context.options?.provider as string) || 'openai';
      const modelName = context.options?.model as string;
      
      // Check if provider factory is available
      if (!this.providerFactory) {
        return {
          success: false,
          message: 'Provider factory not initialized.'
        };
      }
      
      const provider = this.providerFactory.getProvider(providerName as any);
      
      // Configure the provider if model is specified
      if (modelName && provider.configure) {
        await provider.configure({
          model: modelName,
          // Include other required config properties
          providerType: providerName as any,
          instanceName: 'command-instance'
        });
      }
      
      // Generate text using the provider
      const response = await this.generateText(provider, fullPrompt);
      
      return {
        success: true,
        message: response,
        data: { fileContextAdded: !!fileContext }
      };
    } catch (error) {
      this.logger.error('Error executing LLM command:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate text using the provided LLM provider
   * @param provider - LLM provider
   * @param prompt - Prompt text
   * @returns Generated text
   */
  private async generateText(provider: LLMProvider, prompt: string): Promise<string> {
    try {
      const result = await provider.generateText({ prompt });
      return result.content || 'No content returned from provider';
    } catch (error) {
      this.logger.error('Error generating text:', error);
      throw error;
    }
  }

  /**
   * Format prompt using XML tags according to Anthropic Claude guidelines
   * @param promptText - The main prompt text
   * @param fileContext - Optional file context
   * @returns Formatted prompt with XML tags
   */
  private formatPromptWithXmlTags(promptText: string, fileContext?: string): string {
    // Role tag - defines the assistant's role
    const role = '<role>You are a helpful AI assistant</role>';
    
    // Context tag - includes any file content
    const context = fileContext ? 
      `<context>\n${fileContext}\n</context>` : '';
    
    // Task tag - the actual request
    const task = `<task>${promptText}</task>`;
    
    // Output tag - format guidance
    const output = '<output>Provide a helpful, accurate, and concise response</output>';
    
    // Tone tag - defines the response tone
    const tone = '<tone>Professional, helpful, and clear</tone>';
    
    // Combine all tags
    return `${role}\n${context}\n${task}\n${output}\n${tone}`;
  }
}
