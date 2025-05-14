/**
 * @file Command for interacting with LLMs with file path context support
 */

import type { CommandContext, CommandOutput } from '../core/types/command.types';
import type { LLMProvider } from '../core/types/provider.types';
import { BaseCommand, type FilePathProcessorFactory } from '../core/commands/baseCommand';
import type { Logger } from '../core/types/logger.types';
import type { ProviderFactoryInterface } from '../providers/types';

/**
 * LLMCommand - Interact with LLMs using file paths as context
 */
export class LLMCommand extends BaseCommand {
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

  providerFactoryInstance: ProviderFactoryInterface;

  constructor(
    logger: Logger,
    filePathProcessorFactory: FilePathProcessorFactory,
    providerFactoryInstance: ProviderFactoryInterface
  ) {
    super(logger, filePathProcessorFactory);
    this.providerFactoryInstance = providerFactoryInstance;
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

      // Prepare the full prompt with file context
      let fullPrompt = promptText;
      if (fileContext) {
        fullPrompt = `${promptText}\n\nContext from files:\n${fileContext}`;
        this.logger.info('Added context from files to prompt');
      }

      // Get provider from context or use default
      const providerName = (context.options?.provider as string) || 'openai';
      const modelName = context.options?.model as string;

      // Get provider from global provider factory
      if (!this.providerFactoryInstance) {
        return {
          success: false,
          message: 'Provider factory not initialized.'
        };
      }

      const provider = this.providerFactoryInstance.getProvider(providerName as any);

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM command failed: ${errorMessage}`);
      return {
        success: false,
        message: `Error: ${errorMessage}`
      };
    }
  }

  /**
   * Generate text using the provided LLM
   * @param provider - LLM provider
   * @param prompt - Prompt text
   * @returns Generated text
   */
  private async generateText(provider: LLMProvider, prompt: string): Promise<string> {
    try {
      // Call provider with prompt
      const response = await provider.generateText({ prompt });

      // Extract content from response
      let content = '';
      if (typeof response === 'string') {
        content = response;
      } else if (response && typeof response === 'object') {
        // Try to extract content from various response formats
        content = (response as any).content ||
          (response as any).text ||
          (response as any).choices?.[0]?.text ||
          (response as any).choices?.[0]?.message?.content ||
          JSON.stringify(response);
      }

      return content;
    } catch (error) {
      this.logger.error(`Error generating text: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get help text for the command
   */
  getHelp(): string {
    let output = '';
    output += 'LLM Command\n\n';
    output += 'Usage:\n';
    output += '  agenticmcp llm [options] <prompt> [file paths...]\n\n';
    output += 'Description:\n';
    output += '  Interact with LLMs, using file paths as context.\n';
    output += '  Any file paths provided will be loaded and added as context to the prompt.\n\n';
    output += 'Options:\n';
    output += '  -p, --provider <provider>  LLM provider to use (default: openai)\n';
    output += '  -m, --model <model>        Model to use with the provider\n\n';
    output += 'Examples:\n';
    output += '  agenticmcp llm "Summarize these files" file1.txt file2.md\n';
    output += '  agenticmcp llm --provider anthropic --model claude-3-opus "Explain this code" src/index.ts\n';
    output += '  agenticmcp llm "Find bugs in" ./*.js\n';
    return output;
  }
}

export default LLMCommand;