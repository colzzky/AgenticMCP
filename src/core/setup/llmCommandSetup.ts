import { Command } from 'commander';
import { LLMCommand } from '../../commands/llmCommand';
import { FilePathProcessorFactory } from '../commands/type';
import type { Logger } from '../types/logger.types';
import type { ProviderFactoryInterface } from '../../providers/types';

/**
 * Registers the LLM command with the CLI program
 */
export function registerLlmCommand(
  program: Command,
  llmCommand: typeof LLMCommand,
  loggerTool: Logger,
  filePathProcessorFactory: FilePathProcessorFactory,
  providerFactoryInstance: ProviderFactoryInterface
): void {
  const llmCommandInstance = new llmCommand(
    loggerTool, filePathProcessorFactory, providerFactoryInstance
  );
  program
    .command(`${llmCommandInstance.name} [prompt] [filePaths...]`)
    .description(llmCommandInstance.description)
    .option('-p, --provider <provider>', 'LLM provider to use (default: openai)')
    .option('-m, --model <model>', 'Model to use with the provider')
    .allowUnknownOption(true)
    .action(async (prompt, filePaths, options, command) => {
      try {
        // Normalize filePaths (Commander may pass undefined if not provided)
        const fileArgs = Array.isArray(filePaths) ? filePaths : (filePaths ? [filePaths] : []);
        // Combine prompt and file paths into argument list for execute()
        const args = [prompt, ...fileArgs].filter(Boolean);
        const result = await llmCommandInstance.execute({ options }, ...args);

        if (result.success) {
          console.log(result.message || "");
        } else {
          loggerTool.error(result.message || "");
        }
      } catch (error) {
        if (error instanceof Error) {
          loggerTool.error(`Error executing LLM command: ${error.message}`);
        }
      }
    });
}
