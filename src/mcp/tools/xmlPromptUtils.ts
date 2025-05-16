import { getRoleDescription, getRoleInstructions } from './xmlPromptUtilsHelpers';
import { roleEnums } from './roleSchemas';
import type { AllRoleSchemas } from './roleSchemas';
import type { Tool } from '../../core/types/provider.types';
import { getFileSystemToolDefinitions } from '../../tools/fileSystemToolDefinitions';
import { getUnifiedShellToolDefinition, shellCommandDescriptions } from '../../tools/unifiedShellToolDefinition';
import { getModelConfigForRole } from './config/roleModelConfig.js';

/**
 * Formats tool definitions for inclusion in an XML prompt
 * @param tools - Array of tool definitions
 * @returns Formatted string of available tools
 */
export function formatAvailableTools(tools: Tool[]): string {
  let toolsText = '\n<available_tools>';
  
  // Sort tools alphabetically for consistent presentation
  const sortedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  
  for (const tool of sortedTools) {
    // Handle the shell tool differently to include command descriptions
    if (tool.name === 'shell') {
      toolsText += `\n- ${tool.name}: ${tool.description?.split('.')[0]}`;
      
      // Add a subsection for shell commands with detailed descriptions
      toolsText += '\n  Available shell commands:';
      const commands = Object.keys(shellCommandDescriptions).sort();
      for (const cmd of commands) {
        // Format each shell command with its description
        toolsText += `\n  * ${cmd}: ${shellCommandDescriptions[cmd]}`;
      }
    } else {
      // Regular tools just get their brief description
      toolsText += `\n- ${tool.name}: ${tool.description?.split('.')[0]}`;
    }
  }
  
  toolsText += '\n</available_tools>\n';
  return toolsText;
}

/**
 * Gets available tools string directly from the file system tool definitions
 * and unified shell tool definition
 * @returns Formatted string of available tools
 */
export function getAvailableToolsString(): string {
  // Get the file system tools and unified shell tool definition directly
  const fileSystemTools = getFileSystemToolDefinitions();
  const unifiedShellTool = getUnifiedShellToolDefinition();
  
  // Combine all tools
  // Cast the unified shell tool to Tool type explicitly
  const allTools = [...fileSystemTools, unifiedShellTool as Tool];
  
  return formatAvailableTools(allTools);
}

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
      xmlPrompt += `<${key}>${typeof value === 'string' ? value : JSON.stringify(value)}</${key}>\n`;
    }
  }
  xmlPrompt += getAvailableToolsString();
  xmlPrompt += `\n<instructions>\n${getRoleInstructions(role, specializedArgs)}\n</instructions>`;
  return xmlPrompt;
}

/**
 * Selects the appropriate model for a given role based on configuration
 * 
 * @param role The role to select a model for
 * @returns The model ID to use for the specified role
 */
export function selectModelForRole(role: string): string {
  // Get the model configuration for this role from our config system
  const modelConfig = getModelConfigForRole(role);
  
  // Return the configured model for the role
  return modelConfig.model;
}
