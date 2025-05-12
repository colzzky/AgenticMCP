# LocalCliTool Definitions

This document provides detailed information about the tool definitions exposed by the LocalCliTool class. These definitions can be used by LLM providers to enable AI models to interact with the local filesystem in a controlled manner.

## Available Tools

The LocalCliTool provides the following tools:

### 1. `create_directory`

Creates a new directory at the specified path.

**Parameters:**
- `path` (string, required): The relative path where the directory should be created.

**Returns:**
- `success` (boolean): Whether the directory was created successfully.

**Example:**
```json
{
  "path": "projects/new-project"
}
```

### 2. `write_file`

Writes content to a file at the specified path.

**Parameters:**
- `path` (string, required): The relative path where the file should be written.
- `content` (string, required): The content to write to the file.

**Returns:**
- `success` (boolean): Whether the file was written successfully.

**Example:**
```json
{
  "path": "projects/new-project/README.md",
  "content": "# New Project\n\nThis is a new project."
}
```

### 3. `read_file`

Reads the content of a file at the specified path.

**Parameters:**
- `path` (string, required): The relative path of the file to read.

**Returns:**
- `content` (string): The content of the file, or an empty string if the file doesn't exist or can't be read.

**Example:**
```json
{
  "path": "projects/existing-project/README.md"
}
```

### 4. `delete_file`

Deletes a file at the specified path.

**Parameters:**
- `path` (string, required): The relative path of the file to delete.

**Returns:**
- `success` (boolean): Whether the file was deleted successfully.

**Example:**
```json
{
  "path": "projects/old-project/temp.txt"
}
```

### 5. `delete_directory`

Deletes a directory at the specified path.

**Parameters:**
- `path` (string, required): The relative path of the directory to delete.

**Returns:**
- `success` (boolean): Whether the directory was deleted successfully.

**Example:**
```json
{
  "path": "projects/old-project"
}
```

### 6. `list_directory`

Lists the contents of a directory at the specified path.

**Parameters:**
- `path` (string, required): The relative path of the directory to list.

**Returns:**
- `entries` (array): An array of directory entries, each with a `name` and `type` property.

**Example:**
```json
{
  "path": "projects"
}
```

### 7. `search_codebase`

Searches for a string pattern in files within the specified directory.

**Parameters:**
- `query` (string, required): The string pattern to search for.
- `recursive` (boolean, optional): Whether to search recursively in subdirectories. Default is `true`.

**Returns:**
- `results` (array): An array of search results, each with `file`, `line_number`, and `line_content` properties.

**Example:**
```json
{
  "query": "function main",
  "recursive": true
}
```

### 8. `find_files`

Finds files matching a pattern within the specified directory.

**Parameters:**
- `pattern` (string, required): The glob pattern to match files against.
- `recursive` (boolean, optional): Whether to search recursively in subdirectories. Default is `true`.

**Returns:**
- `files` (array): An array of matching file paths.

**Example:**
```json
{
  "pattern": "*.ts",
  "recursive": true
}
```

## Security Considerations

- All paths are relative to the base directory configured for the LocalCliTool.
- Path traversal attacks are prevented by validating and normalizing paths.
- Hidden files and directories (starting with `.`) are filtered out from directory listings.
- Access to system directories outside the base directory is not allowed.

## Integration with LLM Providers

These tool definitions can be used with the following LLM providers:

- **OpenAI**: Compatible with the function calling API
- **Anthropic**: Compatible with Claude's tool use capability
- **Google/Gemini**: Compatible with Gemini's function calling feature

Use the `ToolRegistry` class to register these tools and validate them for specific providers.
