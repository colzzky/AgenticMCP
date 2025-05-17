import { orchestrateToolLoop } from '@/providers/providerUtils';
import type { PathDI } from '../../types/global.types';
import { createFileSystemTool } from '@/tools/factory/fileSystemToolFactory';
import type { Logger } from '../../core/types/logger.types.js';
import type { LLMProvider } from '../../core/types/provider.types.js';
import { constructXmlPrompt, selectModelForRole } from './xmlPromptUtils';
import { roleEnums, AllRoleSchemas } from './roleSchemas';
import { ToolExecutor } from '@/tools/toolExecutor';

/**
 * Interface to define the structure of regex matches
 */
interface FileOperationMatch {
  fullMatch: string;
  content: string;
}

/**
 * Processes file operations found in the LLM response
 */
export async function processFileOperations(
  response: string,
  fileSystemTool: ReturnType<typeof createFileSystemTool>,
  logger: Logger
): Promise<string> {
  const fileOpRegex = /<file_operation>([^]*?)<\/file_operation>/g;
  let match;
  let processedResponse = response;
  const matches: FileOperationMatch[] = [];
  while ((match = fileOpRegex.exec(response)) !== null) {
    if (match && match.length >= 2) {
      matches.push({ fullMatch: match[0], content: match[1] });
    }
  }
  for (const match of matches) {
    try {
      const commandMatch = /command:\s*(\w+)/i.exec(match.content);
      const pathMatch = /path:\s*([^\n]+)/i.exec(match.content);
      const contentMatch = /content:\s*([^]*?)(?=<\/file_operation>|$)/i.exec(match.content);
      if (commandMatch && pathMatch) {
        const command = commandMatch[1];
        const filePath = pathMatch[1].trim();
        const content = contentMatch ? contentMatch[1].trim() : undefined;
        logger.debug(`Executing file operation: ${command} on path: ${filePath}`);
        let result;
        switch (command) {
          case 'read_file': { result = await fileSystemTool.execute('read_file', { path: filePath }); break; }
          case 'write_file': {
            // Check for allowOverwrite parameter in the file operation
            const allowOverwriteMatch = /allowoverwrite:\s*(true|false)/i.exec(match.content);
            const allowOverwrite = allowOverwriteMatch ? allowOverwriteMatch[1].toLowerCase() === 'true' : false;

            // Make sure content is a string
            const contentStr = content || '';

            result = await fileSystemTool.execute('write_file', {
              path: filePath,
              content: contentStr,
              allowOverwrite
            });

            // If file exists and we're not allowed to overwrite, provide a clear message in the result
            if (result.fileExists && !result.success) {
              logger.warn(`File exists at ${filePath} and allowOverwrite is false - confirmation required`);
            }
            break;
          }
          case 'create_directory': { result = await fileSystemTool.execute('create_directory', { path: filePath }); break; }
          case 'delete_file': { result = await fileSystemTool.execute('delete_file', { path: filePath }); break; }
          case 'delete_directory': { result = await fileSystemTool.execute('delete_directory', { path: filePath }); break; }
          case 'list_directory': { result = await fileSystemTool.execute('list_directory', { path: filePath }); break; }
          case 'search_codebase': { result = await fileSystemTool.execute('search_codebase', { query: content || filePath, recursive: true }); break; }
          case 'find_files': { result = await fileSystemTool.execute('find_files', { pattern: filePath, recursive: true }); break; }
          default: { throw new Error(`Unknown file operation command: ${command}`); }
        }
        const resultText = `<file_operation_result command="${command}" path="${filePath}">\n${JSON.stringify(result, undefined, 2)}\n</file_operation_result>`;
        processedResponse = processedResponse.replace(match.fullMatch, resultText);
        logger.debug(`File operation ${command} completed successfully`);
      } else {
        throw new Error('Invalid file operation format. Must include command and path.');
      }
    } catch (error) {
      logger.error(`Error processing file operation: ${error instanceof Error ? error.message : String(error)}`);
      const errorText = `<file_operation_error>\nError: ${error instanceof Error ? error.message : String(error)}\n</file_operation_error>`;
      processedResponse = processedResponse.replace(match.fullMatch, errorText);
    }
  }
  return processedResponse;
}

export type HandleRoleBasedToolArgs = {
  args: AllRoleSchemas;
  role: roleEnums;
  logger: Logger;
  llmProvider: LLMProvider;
  pathDI: PathDI;
};

/**
 * Handles execution of a role-based tool
 */
export async function handleRoleBasedTool({
  args,
  role,
  logger,
  llmProvider,
  pathDI
}: HandleRoleBasedToolArgs): Promise<any> {
  const { prompt, base_path, context, related_files, allow_file_overwrite } = args;
  // Create a dedicated FileSystemTool instance with the specified base path
  // Set allowFileOverwrite to false by default for safety
  const dedicatedLocalCliTool = createFileSystemTool({
    baseDir: pathDI.resolve(base_path),
    allowFileOverwrite: allow_file_overwrite || false // Default to safe mode - require explicit allowOverwrite for existing files
  });
  const fileContents = [] as Array<{ path: string, content: string }>;
  if (related_files && related_files.length > 0) {
    for (const filePath of related_files) {
      try {
        const content = await dedicatedLocalCliTool.execute('read_file', { path: filePath });
        fileContents.push({ path: filePath, content: content.content });
      } catch (error) {
        logger.warn(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const systemPrompt = constructXmlPrompt(role, prompt, context, fileContents, args);
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: prompt }
  ];
  try {
    logger.info(`Executing ${role} role-based tool with prompt: ${prompt.slice(0, 100)}...`);
    /*const providerResponse = await llmProvider.chat({
      messages,
      maxTokens: 4000,
      temperature: 0.2,
      model: selectModelForRole(role)
    });*/

    const providerResponse = await orchestrateToolLoop(
      llmProvider,
      {
        messages,
        maxTokens: 4000,
        temperature: 0.2,
        model: selectModelForRole(role)
      },
      logger
    );
    logger.debug(`Processing file operations in ${role} response`);
    const responseContent = providerResponse.content || '';
    const processedResponse = await processFileOperations(
      responseContent,
      dedicatedLocalCliTool,
      logger
    );
    return {
      content: [{ type: 'text', text: processedResponse }]
    };
  } catch (error) {
    logger.error(`Error executing ${role} role-based tool:`, error);
    throw error;
  }
}
