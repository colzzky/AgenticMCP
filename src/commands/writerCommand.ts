import type { Command, CommandContext, CommandOutput } from '../core/types/command.types';
import type { LLMProvider } from '../core/types/provider.types';
import { info, error } from '../core/utils/logger';

/**
 * WriterCommand: Generates text using the configured LLM provider with XML-formatted prompts.
 */
export class WriterCommand implements Command {
  name = 'writer';
  description = 'Generate text or content using the default LLM provider. Prompts are structured using XML tags for optimal LLM performance.';
  aliases = ['write', 'w'];

  async execute(context: CommandContext, ...args: unknown[]): Promise<CommandOutput> {
    // Parse arguments
    const [prompt, contextArg, output, tone, validation] = args as [string, string?, string?, string?, string?];
    if (!prompt) {
      return { success: false, message: 'Prompt is required.' };
    }
    // Compose XML-style prompt
    const xmlPrompt = [
      '<role>Writer</role>',
      contextArg ? `<context>${contextArg}</context>` : '',
      `<task>${prompt}</task>`,
      output ? `<output>${output}</output>` : '',
      tone ? `<tone>${tone}</tone>` : '',
      validation ? `<validation>${validation}</validation>` : ''
    ].filter(Boolean).join('\n');

    // Get provider from context (assume context.options.provider or context.provider)
    const provider: LLMProvider | undefined = (context as any).provider || (context.options && (context.options as any).provider);
    if (!provider || typeof provider.generateText !== 'function') {
      error('No valid LLM provider found for writer command.');
      return { success: false, message: 'No valid LLM provider found.' };
    }

    try {
      const response = await provider.generateText({ prompt: xmlPrompt });
      info('Writer Command Output:');
      // Extract the most relevant text from ProviderResponse
      let output = response.content || (response.choices && response.choices[0]?.text) || (response.choices && response.choices[0]?.message && response.choices[0]?.message.content) || (typeof response.rawResponse === 'string' ? response.rawResponse : undefined) || '';

      if ((context as any).stdout && typeof (context as any).stdout.write === 'function') {
        (context as any).stdout.write(output);
      } else {
        // fallback
        
        console.log(output);
      }
      return { success: true, message: output };

    } catch (error_) {
      error(`Writer command failed: ${error_ instanceof Error ? error_.message : String(error_)}`);
      return { success: false, message: error_ instanceof Error ? error_.message : String(error_) };
    }
  }

  getHelp(): string {
    return `Usage: writer <prompt> [context] [output] [tone] [validation]\n\nGenerates text using the default LLM provider with XML-formatted prompts.`;
  }
}
