import { Command } from 'commander';
import { LLMCommand } from '../../commands/llmCommand';
import { FilePathProcessorFactory } from '../commands/type';
import type { Logger } from '../types/logger.types';
import type { ProviderFactoryInstance } from '../../providers/types';

/**
 * Registers the LLM command with the CLI program
 */
export function registerLlmCommand(
  program: Command,
  llmCommand: typeof LLMCommand,
  loggerTool: Logger,
  filePathProcessorFactory: FilePathProcessorFactory,
  providerFactoryInstance: ProviderFactoryInstance
): void {
  const llmCommandInstance = new llmCommand(
    loggerTool, filePathProcessorFactory, providerFactoryInstance
  );
  program
    .command(llmCommandInstance.name)
    .description(llmCommandInstance.description)
    .option('-p, --provider <provider>', 'LLM provider to use (default: openai)')
    .option('-m, --model <model>', 'Model to use with the provider')
    .allowUnknownOption(true) // Allow file paths to be passed as args
    .action(async (options, command) => {
      try {
        const args = command.args;
        const result = await llmCommandInstance.execute({ options }, ...args);

        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
      } catch (error) {
        if (error instanceof Error) {
          loggerTool.error(`Error executing LLM command: ${error.message}`);
          console.error(`Error: ${error.message}`);
        }
      }
    });
}
