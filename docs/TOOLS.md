# Tool System Documentation

The AgenticMCP tool system provides a unified interface for LLM providers to execute local system tools. This document explains how to use and extend the tool system.

## Architecture

The tool system consists of several key components:

1. **ToolRegistry**: Central registry for tool definitions
2. **ToolExecutor**: Executes tool calls from LLMs
3. **ToolResultFormatter**: Formats tool results for different LLM providers
4. **LocalCliTool**: Implementation of local system tools (file operations, etc.)

These components work together to provide a seamless experience for LLM providers to execute external tools.

## LocalCliTool Integration

The LocalCliTool is integrated with LLM providers through the ToolRegistry and ProviderFactory. Here's how it works:

1. **Initialization**: The application initializes the LocalCliTool, ToolRegistry, and ToolExecutor during startup.

2. **Registration**: Tool definitions from LocalCliTool are registered with the ToolRegistry.

3. **Provider Integration**: The ToolRegistry is attached to the ProviderFactory, which passes it to providers that support tool calling.

4. **Tool Execution**: When an LLM provider generates a tool call, the ToolExecutor executes the corresponding tool implementation from LocalCliTool.

## Using Tools

Tools can be used in various ways:

### 1. CLI Interface

The `tools` command provides access to the tool system:

```bash
# List all registered tools
agenticmcp tools list

# Execute a specific tool
agenticmcp tools execute read_file --args '{"path": "./example.txt"}'
```

### 2. Programmatic API

Tools can be accessed programmatically:

```typescript
// Get the tool registry
const toolRegistry = global.toolRegistry;

// Get all available tools
const tools = toolRegistry.getAllTools();

// Execute a tool
const result = await global.toolExecutor.executeTool('read_file', { path: './example.txt' });
```

### 3. LLM Provider Integration

Tools are automatically available to LLM providers that support tool calling:

```typescript
// Configure a provider with tools
const openaiProvider = providerFactory.getProvider('openai');
await openaiProvider.configure({
  apiKey: 'your-api-key',
  model: 'gpt-4-turbo'
});

// Tools from the registry are automatically available
const response = await openaiProvider.generateText({
  messages: [
    { role: 'user', content: 'Read the file at ./example.txt' }
  ]
});
```

## Available Tools

The LocalCliTool provides the following tools:

- **read_file**: Read the complete contents of a file from the file system
- **write_file**: Write content to a file
- **create_directory**: Create a directory
- **delete_file**: Delete a file
- **delete_directory**: Delete a directory
- **list_directory**: List contents of a directory
- **search_codebase**: Search for text in files
- **find_files**: Find files matching a pattern

## Extending the Tool System

### Adding New Tool Implementations

To add a new tool implementation:

1. Create a class implementing the necessary functionality
2. Register the tool definition with the ToolRegistry
3. Register the tool implementation with the ToolExecutor

Example:

```typescript
// Define the tool
const weatherTool = {
  type: 'function',
  name: 'get_weather',
  description: 'Gets the current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'The location to get weather for' }
    },
    required: ['location']
  }
};

// Register the tool definition
toolRegistry.registerTool(weatherTool);

// Register the tool implementation
toolExecutor.registerToolImplementation('get_weather', async (args: { location: string }) => {
  // Implementation logic here
  return { temperature: 72, conditions: 'sunny' };
});
```

### Adding Provider-Specific Integration

To add tool support for a new LLM provider:

1. Implement the required interfaces in the provider class:
   - `setToolRegistry(toolRegistry: ToolRegistry): void`
   - `getAvailableTools(): Tool[]`

2. Update the provider's `generateText` method to include tools from the registry

## Security Considerations

- The LocalCliTool restricts file operations to a specific base directory
- Tool executions have a configurable timeout to prevent long-running operations
- Arguments should be validated before executing tools

## Future Enhancements

- Add support for streaming tool results
- Implement tool versioning
- Add authentication for sensitive tools
- Support for sequential/chain tool calling