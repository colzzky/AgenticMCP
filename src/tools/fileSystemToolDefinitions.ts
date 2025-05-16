/**
 * @file LocalCliTool definition schemas
 * Contains the JSON schema definitions for LocalCliTool operations
 */

import type { Tool, ToolParameterSchema } from '../core/types/provider.types';
import type {
  CreateDirectoryArgs,
  WriteFileArgs,
  ReadFileArgs,
  DeleteFileArgs,
  DeleteDirectoryArgs,
  ListDirectoryArgs,
  SearchCodebaseArgs,
  FindFilesArgs,
  DirectoryTreeArgs,
  GetFileInfoArgs,
  EditFileArgs,
  MoveFileArgs,
  ReadMultipleFilesArgs,
  LocalCliCommandMap
} from '../core/types/cli.types';
import type { ProviderType } from '../core/types/provider.types';

/**
 * Type definition for file system tool
 * Maps tool names to their parameter types from cli.types.ts
 */
type FileSystemTool<K extends keyof LocalCliCommandMap> = Tool & {
  type: 'function';
  name: K;
  description: string;
  parameters: ToolParameterSchema & {
    type: 'object';
    properties: Record<keyof Parameters<LocalCliCommandMap[K]>[0], ToolParameterSchema['properties'][string]>;
    required: Array<keyof Parameters<LocalCliCommandMap[K]>[0] & string>;
  };
};

/**
 * Provides standardized tool definitions for LocalCliTool operations
 * These definitions follow the JSON Schema format required by LLM providers
 */
export const getFileSystemToolDefinitions = (): Tool[] => {
  return [
    // Create directory
    {
      type: 'function',
      name: 'create_directory',
      description: 'Create a new directory or ensure a directory exists. Can create multiple nested directories in one operation. If the directory already exists, this operation will succeed silently. Perfect for setting up directory structures for projects or ensuring required paths exist. Only works within allowed directories.',
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
    } as FileSystemTool<'create_directory'>,
    
    // Get directory tree
    {
      type: 'function',
      name: 'get_directory_tree',
      description: 'Get a recursive tree view of files and directories as a JSON structure. Each entry includes \'name\', \'type\' (file/directory), and \'children\' for directories. Files have no children array, while directories always have a children array (which may be empty). The output is formatted with 2-space indentation for readability. Only works within allowed directories.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the directory to get the tree for'
          }
        },
        required: ['path']
      }
    } as FileSystemTool<'get_directory_tree'>,
    
    // Write file
    {
      type: 'function',
      name: 'write_file',
      description: 'Create a new file or completely overwrite an existing file with new content. Use with caution as it will overwrite existing files without warning. Handles text content with proper encoding. Only works within allowed directories.',
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
    } as FileSystemTool<'write_file'>,
    
    // Get file info
    {
      type: 'function',
      name: 'get_file_info',
      description: 'Retrieve detailed metadata about a file or directory. Returns comprehensive information including size, creation time, last modified time, permissions, and type. This tool is perfect for understanding file characteristics without reading the actual content. Only works within allowed directories.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file or directory to get information about'
          }
        },
        required: ['path']
      }
    } as FileSystemTool<'get_file_info'>,
    
    // Edit file
    {
      type: 'function',
      name: 'edit_file',
      description: 'Make line-based edits to a text file. Each edit replaces exact line sequences with new content. Returns a git-style diff showing the changes made. Only works within allowed directories.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to edit'
          },
          edits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                oldText: {
                  type: 'string',
                  description: 'Text to search for - must match exactly'
                },
                newText: {
                  type: 'string',
                  description: 'Text to replace with'
                }
              },
              required: ['oldText', 'newText']
            },
            description: 'List of text replacements to make'
          },
          dryRun: {
            type: 'boolean',
            description: 'Whether to preview changes using git-style diff format (default: false)'
          },
          allowOverwrite: {
            type: 'boolean',
            description: 'Whether to allow overwriting the file if it already exists (default: false)'
          }
        },
        required: ['path', 'edits']
      }
    } as FileSystemTool<'edit_file'>,
    
    // Move file
    {
      type: 'function',
      name: 'move_file',
      description: 'Move or rename files and directories. Can move files between directories and rename them in a single operation. If the destination exists, the operation will fail. Works across different directories and can be used for simple renaming within the same directory. Both source and destination must be within allowed directories.',
      parameters: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description: 'Relative path of the file or directory to move'
          },
          destination: {
            type: 'string',
            description: 'Relative path where the file or directory should be moved to'
          }
        },
        required: ['source', 'destination']
      }
    } as FileSystemTool<'move_file'>,
    
    // Read file
    {
      type: 'function',
      name: 'read_file',
      description: 'Read the complete contents of a file from the file system. Handles various text encodings and provides detailed error messages if the file cannot be read. Use this tool when you need to examine the contents of a single file. Only works within allowed directories.',
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
    } as FileSystemTool<'read_file'>,
    
    // Read multiple files
    {
      type: 'function',
      name: 'read_multiple_files',
      description: 'Read the contents of multiple files simultaneously. This is more efficient than reading files one by one when you need to analyze or compare multiple files. Each file\'s content is returned with its path as a reference. Failed reads for individual files won\'t stop the entire operation. Only works within allowed directories.',
      parameters: {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of relative paths of the files to read'
          }
        },
        required: ['paths']
      }
    } as FileSystemTool<'read_multiple_files'>,
    
    // Delete file
    {
      type: 'function',
      name: 'delete_file',
      description: 'Deletes a file at the specified path. Will fail if the path doesn\'t exist or points to a directory. Only works within allowed directories.',
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
    } as FileSystemTool<'delete_file'>,
    
    // Delete directory
    {
      type: 'function',
      name: 'delete_directory',
      description: 'Deletes a directory at the specified path. Will fail if the path doesn\'t exist or points to a file. Only works within allowed directories.',
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
    } as FileSystemTool<'delete_directory'>,
    
    // List directory
    {
      type: 'function',
      name: 'list_directory',
      description: 'Get a detailed listing of all files and directories in a specified path. Results clearly distinguish between files and directories with [FILE] and [DIR] prefixes. This tool is essential for understanding directory structure and finding specific files within a directory. Only works within allowed directories.',
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
    } as FileSystemTool<'list_directory'>,
    
    // Search codebase
    {
      type: 'function',
      name: 'search_codebase',
      description: 'Searches for a string pattern in files within the specified directory. Returns matches with file paths, line numbers, and matching line content. Only works within allowed directories.',
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
    } as FileSystemTool<'search_codebase'>,
    
    // Find files
    {
      type: 'function',
      name: 'find_files',
      description: 'Recursively search for files and directories matching a pattern. Searches through all subdirectories from the starting path. The search is case-insensitive and matches partial names. Returns full paths to all matching items. Great for finding files when you don\'t know their exact location. Only searches within allowed directories.',
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
          },
          exclude: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Glob patterns to exclude from the search'
          }
        },
        required: ['pattern']
      }
    } as FileSystemTool<'find_files'>
  ];
};

/**
 * Validates tool definitions against provider requirements.
 * @param tools - The tool definitions to validate
 * @param provider - The provider to validate against
 * @returns Validation results including whether valid, invalid tools, and error messages
 */
export const validateToolDefinitions = (
  tools: Tool[],
  provider: ProviderType
): { valid: boolean; invalidTools: string[]; messages: string[] } => {
  const messages: string[] = [];
  const invalidTools: string[] = [];
  
  for (const tool of tools) {
    // Common validation for all providers
    if (!tool.name || !tool.type || !tool.parameters) {
      messages.push(`Tool '${tool.name || 'unnamed'}' is missing required fields`);
      invalidTools.push(tool.name || 'unnamed');
      continue;
    }
    
    // Provider-specific validation
    switch (provider) {
      case 'grok':
      case 'openai': {
        // OpenAI requires 'function' type and parameters.type to be 'object'
        if (tool.type !== 'function') {
          messages.push(`Tool '${tool.name}' has invalid type for ${provider.charAt(0).toUpperCase() + provider.slice(1)}: ${tool.type}`);
          invalidTools.push(tool.name);
        }
        if (tool.parameters.type !== 'object') {
          messages.push(`Tool '${tool.name}' parameters must have type 'object' for ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
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