# Shell Tool Integration Architecture

This document provides an overview of how shell commands are securely integrated into the AgenticMCP framework through dependency injection.

## Architecture Components

### 1. Core Components

- **DefaultShellCommandWrapper**: Provides a secure wrapper around shell commands with allowlist functionality
- **DILocalShellCliTool**: Exposes shell commands as CLI tools through the DI system
- **ShellCommandDefinitions**: Defines available shell commands and their descriptions

### 2. Type System

- **SpawnDi**: Central type definition in `global.types.ts` for the spawn function dependency
- **ShellCommandWrapper**: Interface defining the contract for shell command execution
- **ShellCommandResult**: Type for standardized shell command results

### 3. Integration Points

- **Tool System Setup**: Shell tools are registered alongside regular CLI tools
- **Command Map Merging**: Shell command maps are merged with CLI command maps for consistent access

## Security Model

The shell integration follows a strict security model:

1. **Allowlist Only**: Commands must be explicitly included in the allowlist (SHELL_COMMANDS)
2. **No Shell Injection**: Arguments are passed as arrays, not strings, preventing command injection
3. **Result Validation**: All command results are validated and standardized
4. **Dependency Injection**: The spawn function is injected, not directly imported

## Flow of Execution

1. **Command Registration**: Shell commands are registered during application startup:
   ```typescript
   const shellToolDefs = localShellCliToolInstance.getToolDefinitions();
   const shellRegisteredCount = toolRegistryInstance.registerTools(shellToolDefs as Tool[]);
   ```

2. **Command Maps**: Tool implementations for shell commands are created:
   ```typescript
   const commandMap = localCliToolInstance.getCommandMap();
   const shellCommandMap = localShellCliToolInstance.getCommandMap();
   const toolImplementations = { ...commandMap, ...shellCommandMap };
   ```

3. **Execution**: When tools are executed, they flow through:
   - Tool Executor → DILocalShellCliTool → DefaultShellCommandWrapper → Spawn

## Shell Command Execution

The `DefaultShellCommandWrapper` provides a secure execution model:

```typescript
async execute(command: string, args: string[] = []): Promise<ShellCommandResult> {
  // Security check: command must be in allowlist
  if (!this.allowedCommands.has(command)) {
    const msg = `Command '${command}' is not allowed.`;
    this.logger.warn(msg);
    return { success: false, stdout: '', stderr: '', code: 126, error: msg };
  }
  
  // Execution with properly injected spawn
  return new Promise((resolve) => {
    const proc = this.spawnDi(command, args, { shell: true });
    // Process output and provide standardized result...
  });
}
```

## Testing

The shell integration components are thoroughly tested:

1. **DefaultShellCommandWrapper**: Tests verify security checks, command execution, and error handling
2. **DILocalShellCliTool**: Tests confirm command map creation and proper delegation to the wrapper
3. **ShellCommandDefinitions**: Tests validate the definition structure and descriptions

## Best Practices

When expanding the shell command integration:

1. **Keep allowlist minimal**: Only include necessary commands
2. **Use types consistently**: Maintain the type safety through all execution paths
3. **Validate inputs**: Always validate commands and arguments before execution
4. **Test security**: Include tests that verify security constraints are enforced