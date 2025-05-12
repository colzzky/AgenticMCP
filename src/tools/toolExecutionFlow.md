# Tool Execution Flow

This document describes the tool execution flow in the AgenticMCP.Typescript project, explaining how tools are executed and how results are fed back to LLMs.

## Overview

The tool execution flow follows these steps:

1. **LLM Decides What Tool to Use**
   - Tools are registered and made available to the LLM provider
   - During generation, the LLM itself decides which tool(s) to call based on the user's request
   - This decision is not predetermined by CLI input or hardcoded in advance

2. **Tool Execution Based on LLM's Decision**
   - Once the LLM generates a response that includes tool calls, those specific tools are executed
   - The system takes the tool call details (name and arguments) and passes them to the appropriate tool handler

3. **Results Fed Back to the LLM**
   - The output from the tool execution is then fed back to the LLM
   - This creates a conversational loop where the LLM can analyze the tool results

4. **Final Response Generation**
   - The LLM then generates a final response based on the original prompt and the tool execution results
   - This allows the LLM to provide contextual, informed responses based on real-time data or actions

## Components

The tool execution flow is implemented using the following components:

### ToolRegistry

The `ToolRegistry` class manages tool definitions and provides methods for registering, validating, and retrieving tools. It ensures that tools are properly formatted for different LLM providers.

```typescript
// Example of registering tools
const toolRegistry = new ToolRegistry(logger);
toolRegistry.registerTools([
  {
    type: 'function',
    name: 'get-weather',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The location to get weather for',
        },
      },
      required: ['location'],
    },
  },
]);
```

### ToolExecutor

The `ToolExecutor` class is responsible for executing tool calls from LLMs and formatting the results. It provides methods for executing individual tool calls and batches of tool calls.

```typescript
// Example of executing a tool call
const toolExecutor = new ToolExecutor(toolRegistry, toolImplementations, logger);
const result = await toolExecutor.executeToolCall({
  id: 'call-123',
  type: 'function_call',
  name: 'get-weather',
  arguments: JSON.stringify({ location: 'New York' }),
});
```

### ConversationManager

The `ConversationManager` class manages the conversation flow between the user, LLM, and tools. It handles starting and continuing conversations, executing tool calls, and feeding results back to the LLM.

```typescript
// Example of starting a conversation
const conversationManager = new ConversationManager(toolExecutor, toolResultFormatter, logger);
const result = await conversationManager.startConversation(provider, [
  { role: 'user', content: 'What\'s the weather in New York?' },
]);
```

### ToolResultFormatter

The `ToolResultFormatter` class formats tool execution results for different LLM providers, ensuring that the results are in the correct format for each provider.

```typescript
// Example of formatting a tool result
const toolResultFormatter = new ToolResultFormatter(logger);
const formattedResult = toolResultFormatter.formatResult(result, 'call-123', 'openai');
```

### ToolEventEmitter

The `ToolEventEmitter` class provides an event system for tool calls, allowing subscribers to listen for tool call events and respond accordingly.

```typescript
// Example of subscribing to tool events
const toolEventEmitter = new ToolEventEmitter(logger);
toolEventEmitter.on(ToolEventType.TOOL_EXECUTION_COMPLETED, (event) => {
  console.log(`Tool ${event.toolCall.name} executed successfully`);
});
```

## Usage

To use the tool execution flow in your application:

1. Create a `ToolRegistry` and register your tools
2. Create a `ToolExecutor` with your tool implementations
3. Create a `ToolResultFormatter` to format tool results
4. Create a `ConversationManager` to manage the conversation flow
5. Start a conversation with an LLM provider

```typescript
// Example usage
const toolRegistry = new ToolRegistry(logger);
toolRegistry.registerTools([/* tool definitions */]);

const toolImplementations = {
  'get-weather': async (args) => {
    // Implementation of the get-weather tool
    return { temperature: 72, condition: 'sunny' };
  },
  // Other tool implementations
};

const toolExecutor = new ToolExecutor(toolRegistry, toolImplementations, logger);
const toolResultFormatter = new ToolResultFormatter(logger);
const conversationManager = new ConversationManager(toolExecutor, toolResultFormatter, logger);

// Start a conversation
const result = await conversationManager.startConversation(provider, [
  { role: 'user', content: 'What\'s the weather in New York?' },
]);

console.log(result.response);
```

## Error Handling

The tool execution flow includes robust error handling to ensure that errors in tool execution do not break the conversation flow. If a tool execution fails, the error is formatted and returned to the LLM, which can then respond appropriately.

## Configuration

The tool execution flow can be configured using the following options:

- `toolTimeoutMs`: Maximum time in milliseconds to wait for a tool to execute before timing out
- `maxRetries`: Maximum number of retries for failed tool executions
- `parallelExecution`: Whether to execute multiple tool calls in parallel (when supported)
- `maxTurns`: Maximum number of conversation turns
- `autoExecuteTools`: Whether to automatically execute tool calls
- `llmTimeoutMs`: Maximum time in milliseconds to wait for LLM response

## Best Practices

- Register tools with clear descriptions and parameter schemas
- Implement tool functions that handle errors gracefully
- Use the event system to monitor tool execution and debug issues
- Configure timeouts and retries based on your application's needs
- Use parallel execution for independent tool calls to improve performance
