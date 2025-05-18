import { Command } from 'commander';
import { LLMCommand } from '../../commands/llmCommand';
import { FilePathProcessorFactory } from '../commands/type';
import type { Logger } from '../types/logger.types';
import type { ProviderFactoryInterface } from '../../providers/types';
import { createFileSystemTool } from '@/tools/factory/fileSystemToolFactory';
import { constructXmlPrompt, getRoleLlmConfig } from '../../mcp/tools/xmlPromptUtils';
import { processFileOperations, handleRoleBasedTool } from '../../mcp/tools/roleHandlers';
import { orchestrateToolLoop } from '../..//providers/providerUtils';

export const doRole = async (
  args: { role: string, prompt: string, filePaths: string[], verbose: boolean },
  deps: {
    loggerTool: Logger,
    providerFactoryInstance: ProviderFactoryInterface,
    createFileSystemTool: typeof createFileSystemTool,
    handleRoleBasedTool: typeof handleRoleBasedTool,
    orchestrateToolLoop: typeof orchestrateToolLoop,
    getRoleLlmConfig: typeof getRoleLlmConfig,
    constructXmlPrompt: typeof constructXmlPrompt,
    processFileOperations: typeof processFileOperations
  }
) => {
  const { role, prompt, filePaths, verbose } = args;
  const fileSystemTool = deps.createFileSystemTool({});
  const handler = {
    orchestrateToolLoop: deps.orchestrateToolLoop,
    getRoleLlmConfig: deps.getRoleLlmConfig,
    constructXmlPrompt: deps.constructXmlPrompt,
    processFileOperations: deps.processFileOperations
  }

  const result = await deps.handleRoleBasedTool({
    args: {
      prompt,
      related_files: filePaths,
      role: role as any,
      base_path: '',
      context: ''
    },
    role: role as any,
    logger: deps.loggerTool,
    providerFactoryInstance: deps.providerFactoryInstance,
    fileSystemTool,
    handlers: handler,
    options: { verbose }
  })

  console.log(result);

}

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
  const name = 'llm';
  const description = 'Interact with LLMs, using file paths as context';
  program
    .command(`${name} [prompt] [filePaths...]`)
    .description(description)
    .option('-p, --provider <provider>', 'LLM provider to use (default: openai)')
    .option('-m, --model <model>', 'Model to use with the provider')
    .option('-r, --role <role>', 'Role to use with the provider')
    .option('-v, --verbose', 'Enable verbose logging')
    .allowUnknownOption(true)
    .action(async (prompt, filePaths, options, command) => {
      try {
        if (options.role) {
          doRole(
            { role: options.role, prompt, filePaths, verbose: options.verbose },
            {
              loggerTool,
              providerFactoryInstance,
              createFileSystemTool,
              handleRoleBasedTool,
              orchestrateToolLoop,
              getRoleLlmConfig,
              constructXmlPrompt,
              processFileOperations
            }
          );
          return;
        }

        const llmCommandInstance = new llmCommand(
          loggerTool, filePathProcessorFactory, providerFactoryInstance
        );

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
