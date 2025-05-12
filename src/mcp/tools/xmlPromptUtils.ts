import { getRoleDescription, getRoleInstructions } from './xmlPromptUtilsHelpers';
import { roleEnums } from './roleSchemas';
import type { AllRoleSchemas } from './roleSchemas';

export function constructXmlPrompt(
  role: roleEnums,
  prompt: string,
  context: string,
  fileContents: Array<{ path: string, content: string }> = [],
  specializedArgs: AllRoleSchemas
): string {
  let xmlPrompt = `<role>${getRoleDescription(role, specializedArgs)}</role>\n\n`;
  xmlPrompt += `<task>${prompt}</task>\n\n`;
  if (context) {
    xmlPrompt += `<context>${context}</context>\n\n`;
  }
  if (fileContents.length > 0) {
    xmlPrompt += `<related_files>\n`;
    for (const file of fileContents) {
      xmlPrompt += `<file path="${file.path}">\n${file.content}\n</file>\n`;
    }
    xmlPrompt += `</related_files>\n\n`;
  }
  for (const [key, value] of Object.entries(specializedArgs)) {
    if (value !== undefined && value !== '') {
      xmlPrompt += `<${key}>${value}</${key}>\n`;
    }
  }
  xmlPrompt += `\n<available_tools>`
  xmlPrompt += `\n- read_file: Read a file from the filesystem`
  xmlPrompt += `\n- write_file: Write content to a file`
  xmlPrompt += `\n- create_directory: Create a new directory`
  xmlPrompt += `\n- delete_file: Delete a file`
  xmlPrompt += `\n- delete_directory: Delete a directory`
  xmlPrompt += `\n- list_directory: List files in a directory`
  xmlPrompt += `\n- search_codebase: Search for content in files`
  xmlPrompt += `\n- find_files: Find files matching a pattern`
  xmlPrompt += `</available_tools>\n`;
  xmlPrompt += `\n<instructions>\n${getRoleInstructions(role, specializedArgs)}\n</instructions>`;
  return xmlPrompt;
}

export function selectModelForRole(role: string): string {
  // Placeholder: actual implementation depends on available models
  return 'claude-3-sonnet-20240229';
}
