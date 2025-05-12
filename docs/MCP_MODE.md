# MCP Mode

AgenticMCP now supports running as an MCP (Model Context Protocol) server with role-based AI tools. This allows other applications to leverage AgenticMCP's LLM capabilities via the standardized MCP protocol.

## Overview

MCP (Model Context Protocol) is a standardized protocol for exposing tools and resources to LLMs. By running AgenticMCP in MCP server mode, you can:

- Expose role-based AI tools like "coder", "qa", "analyst" to any MCP-compatible client
- Leverage AgenticMCP's LLM integration with Anthropic, OpenAI, and other providers
- Create standardized interfaces for AI-assisted tasks
- Connect to AgenticMCP from applications that support the MCP protocol

## Quick Start

To start AgenticMCP in MCP mode with stdio transport (useful for integrating with MCP clients that support stdio):

```bash
agenticmcp serve-mcp
```

To start AgenticMCP in MCP mode with HTTP transport (useful for connecting from web applications):

```bash
agenticmcp serve-mcp --transport http --port 3000
```

## Configuration Options

You can configure MCP mode either through command-line arguments or through the configuration file. The configuration file settings are used as defaults if no command-line arguments are provided.

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--transport <type>` | Transport type (`stdio` or `http`) | `stdio` |
| `--port <number>` | HTTP port (only used with http transport) | `3000` |
| `--host <string>` | HTTP host (only used with http transport) | `localhost` |
| `--base-dir <path>` | Base directory for file operations | Current working directory |
| `--name <string>` | Name of the MCP server | `AgenticMCP-MCP` |
| `--version <string>` | Version of the MCP server | `1.0.0` |
| `--description <string>` | Description of the MCP server | Default description |
| `--tool-prefix <string>` | Prefix for tool names | Empty string |
| `--provider <string>` | LLM provider to use for role-based tools | Default provider in config |

### Configuration File

You can add MCP server configuration to your AgenticMCP configuration file:

```json
{
  "defaultProvider": "anthropic",
  "mcp": {
    "enabled": true,
    "transport": "http",
    "name": "My AgenticMCP Server",
    "version": "1.0.0",
    "description": "AI role-based tools for development tasks",
    "http": {
      "port": 3000,
      "host": "localhost",
      "cors": true
    },
    "tools": {
      "namePrefix": "ai_"
    }
  },
  "providers": {
    "anthropic": {
      "providerType": "anthropic",
      "model": "claude-3-sonnet-20240229"
    }
  }
}
```

## Available Role-Based Tools

AgenticMCP exposes the following role-based AI tools through MCP:

| Tool Name | Description | Required Parameters | Optional Parameters |
|-----------|-------------|---------------------|---------------------|
| `coder` | Expert software developer that generates, analyzes, or refactors code | `prompt`, `base_path` | `context`, `related_files`, `language`, `architecture`, `tests` |
| `qa` | Quality assurance expert for testing and validation | `prompt`, `base_path` | `context`, `related_files`, `test_type`, `framework` |
| `project_manager` | Project planning and organization expert | `prompt`, `base_path` | `context`, `related_files`, `timeline`, `resources`, `methodology` |
| `cpo` | Chief Product Officer for strategy and roadmaps | `prompt`, `base_path` | `context`, `related_files`, `market`, `competitors`, `metrics` |
| `ui_ux` | User interface and experience designer | `prompt`, `base_path` | `context`, `related_files`, `platform`, `brand_guidelines`, `accessibility` |
| `summarizer` | Content summarizer for concise summaries | `prompt`, `base_path` | `context`, `related_files`, `length`, `focus`, `format` |
| `rewriter` | Content rewriter for text improvement | `prompt`, `base_path` | `context`, `related_files`, `style`, `tone`, `audience` |
| `analyst` | Data analyst for insights and patterns | `prompt`, `base_path` | `context`, `related_files`, `data_type`, `analysis_focus`, `visualization` |
| `custom` | Custom role based on provided description | `prompt`, `base_path`, `role` | `context`, `related_files`, `parameters` |

**Common Parameters:**
- `prompt`: The task or question for the role to address
- `base_path`: Base directory for all file operations (security boundary)
- `context`: Additional context or background information
- `related_files`: Paths to related files (relative to `base_path`)

## Usage Examples

### Example 1: Using the 'coder' Tool with stdio Transport

1. Start AgenticMCP in MCP mode:
   ```bash
   agenticmcp serve-mcp --provider anthropic
   ```

2. From a Python script, use the 'coder' tool:
   ```python
   import subprocess
   import json
   import os
   from anthropic import Anthropic

   # Start the AgenticMCP MCP server
   process = subprocess.Popen(
       ["agenticmcp", "serve-mcp", "--provider", "anthropic"],
       stdin=subprocess.PIPE,
       stdout=subprocess.PIPE,
       stderr=subprocess.PIPE,
       text=True
   )

   # Create Anthropic client for testing the generated code
   anthropic = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

   # Define the coder tool schema
   coder_tool = {
       "name": "coder",
       "description": "Expert software developer that can generate, analyze, or refactor code",
       "input_schema": {
           "type": "object",
           "properties": {
               "prompt": {
                   "type": "string",
                   "description": "The coding task or question"
               },
               "base_path": {
                   "type": "string",
                   "description": "Base directory for all file operations (security boundary)"
               },
               "language": {
                   "type": "string",
                   "description": "Programming language to use"
               },
               "related_files": {
                   "type": "array",
                   "items": {"type": "string"},
                   "description": "Paths to related code files for reference"
               }
           },
           "required": ["prompt", "base_path"]
       }
   }

   # Define message and tool use
   request = {
       "jsonrpc": "2.0",
       "method": "callTool",
       "params": {
           "name": "coder",
           "arguments": {
               "prompt": "Create a simple React component that displays a counter with increment and decrement buttons",
               "base_path": "/path/to/project",
               "language": "TypeScript",
               "context": "This is for a modern React application using React 18 with TypeScript."
           }
       },
       "id": "1"
   }

   # Send request to MCP server
   process.stdin.write(json.dumps(request) + "\n")
   process.stdin.flush()

   # Get response
   response = process.stdout.readline()
   response_data = json.loads(response)

   # Extract code from response
   result_text = response_data["result"]["content"][0]["text"]
   print(result_text)

   # Clean up
   process.terminate()
   ```

### Example 2: Using the HTTP Transport with Multiple AI Roles

1. Start AgenticMCP in MCP mode with HTTP transport:
   ```bash
   agenticmcp serve-mcp --transport http --port 3000 --provider openai
   ```

2. Connect to it using an MCP client:
   ```typescript
   import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
   import { HttpClientTransport } from '@modelcontextprotocol/sdk/client/http.js';

   async function main() {
     // Create HTTP transport
     const transport = new HttpClientTransport({
       url: 'http://localhost:3000'
     });

     // Create MCP client
     const client = new McpClient();
     await client.connect(transport);

     // List available tools
     const tools = await client.listTools();
     console.log('Available AI roles:', tools);

     // Use the coder tool
     const coderResult = await client.callTool('coder', {
       prompt: 'Create a utility function to format dates in ISO format',
       base_path: '/path/to/project',
       language: 'JavaScript'
     });

     console.log('Coder output:', coderResult);

     // Use the project_manager tool
     const pmResult = await client.callTool('project_manager', {
       prompt: 'Create a planning timeline for implementing a user authentication system',
       base_path: '/path/to/project',
       methodology: 'agile'
     });

     console.log('Project Manager output:', pmResult);

     // Disconnect
     await client.disconnect();
   }

   main().catch(console.error);
   ```

## XML-Based Prompt Structure and File Operations

All role-based tools use XML-formatted prompts for optimal LLM performance. They can also interact with the filesystem through structured file operations. Here's a sample of the XML structure used internally:

```xml
<role>You are an expert software developer with deep knowledge of clean code, design patterns, and software architecture.</role>

<task>Create a utility function to format dates in ISO format</task>

<context>This is for a modern React application using React 18 with TypeScript.</context>

<language>JavaScript</language>

<related_files>
<file path="src/utils/stringUtils.js">
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str, length = 50) {
  return str.length > length ? str.slice(0, length) + '...' : str;
}
</file>
</related_files>

<available_tools>
- read_file: Read a file from the filesystem
- write_file: Write content to a file
- create_directory: Create a new directory
- delete_file: Delete a file
- delete_directory: Delete a directory
- list_directory: List files in a directory
- search_codebase: Search for content in files
- find_files: Find files matching a pattern
</available_tools>

<instructions>
1. First, analyze the problem in <thinking> tags
2. Break down your approach and identify the key components
3. Write your solution in <solution> tags
4. Make your code efficient, clean, and well-documented
5. Follow best practices for JavaScript
6. Consider testability in your design

7. You can use file operations to help with this task by using <file_operation> tags. For example:
<file_operation>
command: read_file
path: path/to/file.txt
</file_operation>

<file_operation>
command: write_file
path: path/to/new-file.txt
content:
Your content goes here.
Multiple lines are supported.
</file_operation>

<file_operation>
command: list_directory
path: path/to/directory
</file_operation>
</instructions>
```

### Using File Operations

The role-based AI tools can perform file operations within their responses by using `<file_operation>` tags. These operations are securely contained within the specified `base_path` directory.

For example, if the AI needs to read a file, it can do:

```xml
<file_operation>
command: read_file
path: src/config.js
</file_operation>
```

The system will execute this operation and replace the tag with the result:

```xml
<file_operation_result command="read_file" path="src/config.js">
{
  "content": "export const config = {\n  apiUrl: 'https://api.example.com',\n  timeout: 5000\n};"
}
</file_operation_result>
```

If the AI needs to create or modify a file:

```xml
<file_operation>
command: write_file
path: src/utils/dateUtils.js
content:
/**
 * Formats a date in ISO format
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
export function formatDateISO(date) {
  return date.toISOString();
}
</file_operation>
```

Result:

```xml
<file_operation_result command="write_file" path="src/utils/dateUtils.js">
{
  "success": true
}
</file_operation_result>
```

This allows each AI role to have full filesystem access (within security boundaries) to complete its tasks effectively.

## Security Considerations

- `base_path` is a required parameter for all role-based tools and acts as a security boundary
- All file operations are constrained to the specified `base_path` directory
- Consider using HTTP transport only on trusted networks
- Role-based tools don't have direct filesystem access beyond what's explicitly provided
- Use the same caution you would with any LLM-powered tools regarding sensitive data

## Further Resources

- [Model Context Protocol Documentation](https://docs.anthropic.com/en/docs/model-context-protocol/overview)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [AgenticMCP Documentation](../README.md)