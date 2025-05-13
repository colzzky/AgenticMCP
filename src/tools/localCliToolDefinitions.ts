/**
 * @file LocalCliTool definition schemas
 * Contains the JSON schema definitions for LocalCliTool operations
 */

import type { Tool } from '../core/types/provider.types';

/**
 * Provides standardized tool definitions for LocalCliTool operations
 * These definitions follow the JSON Schema format required by LLM providers
 */
export const getLocalCliToolDefinitions = (): Tool[] => {
  return [
    {
      type: 'function',
      name: 'create_directory',
      description: 'Creates a new directory at the specified path',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path where the directory should be created'
          }
        },
        required: ['path']
      }
    },
    {
      type: 'function',
      name: 'write_file',
      description: 'Writes content to a file at the specified path and returns a GitHub-style diff',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path where the file should be written'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          },
          allowOverwrite: {
            type: 'boolean',
            description: 'Whether to overwrite the file if it already exists (default: false)'
          }
        },
        required: ['path', 'content']
      }
    },
    {
      type: 'function',
      name: 'read_file',
      description: 'Reads the content of a file at the specified path',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to read'
          }
        },
        required: ['path']
      }
    },
    {
      type: 'function',
      name: 'delete_file',
      description: 'Deletes a file at the specified path',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to delete'
          }
        },
        required: ['path']
      }
    },
    {
      type: 'function',
      name: 'delete_directory',
      description: 'Deletes a directory at the specified path',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the directory to delete'
          }
        },
        required: ['path']
      }
    },
    {
      type: 'function',
      name: 'list_directory',
      description: 'Lists the contents of a directory at the specified path',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the directory to list'
          }
        },
        required: ['path']
      }
    },
    {
      type: 'function',
      name: 'search_codebase',
      description: 'Searches for a string pattern in files within the specified directory',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'String pattern to search for'
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to search recursively in subdirectories (default: true)'
          }
        },
        required: ['query']
      }
    },
    {
      type: 'function',
      name: 'find_files',
      description: 'Finds files matching a pattern within the specified directory',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Glob pattern to match files against'
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to search recursively in subdirectories (default: true)'
          }
        },
        required: ['pattern']
      }
    }
  ];
};

/**
 * Validates that tool definitions are compatible with the specified LLM provider
 * @param tools - The tool definitions to validate
 * @param provider - The LLM provider to validate against
 * @returns Validation results with any issues found
 */
export const validateToolDefinitions = (
  tools: Tool[],
  provider: 'openai' | 'anthropic' | 'google'
): { 
  valid: boolean; 
  invalidTools: string[];
  messages: string[];
} => {
  const invalidTools: string[] = [];
  const messages: string[] = [];
  
  for (const tool of tools) {
    // Common validation for all providers
    if (!tool.name || !tool.type || !tool.parameters) {
      messages.push(`Tool '${tool.name || 'unnamed'}' is missing required fields`);
      invalidTools.push(tool.name || 'unnamed');
      continue;
    }
    
    // Provider-specific validation
    switch (provider) {
      case 'openai': {
        // OpenAI requires 'function' type and parameters.type to be 'object'
        if (tool.type !== 'function') {
          messages.push(`Tool '${tool.name}' has invalid type for OpenAI: ${tool.type}`);
          invalidTools.push(tool.name);
        }
        if (tool.parameters.type !== 'object') {
          messages.push(`Tool '${tool.name}' parameters must have type 'object' for OpenAI`);
          invalidTools.push(tool.name);
        }
        break;
      }
        
      case 'anthropic': {
        // Anthropic has similar requirements to OpenAI
        if (tool.type !== 'function') {
          messages.push(`Tool '${tool.name}' has invalid type for Anthropic: ${tool.type}`);
          invalidTools.push(tool.name);
        }
        if (tool.parameters.type !== 'object') {
          messages.push(`Tool '${tool.name}' parameters must have type 'object' for Anthropic`);
          invalidTools.push(tool.name);
        }
        break;
      }
        
      case 'google': {
        // Google/Gemini has similar requirements but might have different constraints
        if (tool.type !== 'function') {
          messages.push(`Tool '${tool.name}' has invalid type for Google: ${tool.type}`);
          invalidTools.push(tool.name);
        }
        if (tool.parameters.type !== 'object') {
          messages.push(`Tool '${tool.name}' parameters must have type 'object' for Google`);
          invalidTools.push(tool.name);
        }
        break;
      }
    }
  }
  
  // Remove duplicates from invalidTools
  const uniqueInvalidTools = [...new Set(invalidTools)];
  
  return {
    valid: uniqueInvalidTools.length === 0,
    invalidTools: uniqueInvalidTools,
    messages
  };
};
