# Project Directory Structure
```markdown
.
├── CLAUDE.md
├── DIRECTORY.md
├── KNOWLEDGE.md
├── LICENSE
├── PROGRESS.jsonl +66
├── README.md +30
├── TASKS.jsonl
├── __mocks__/
│   ├── @/
│   │   └── core/
│   ├── @anthropic-ai/
│   │   └── sdk.ts
│   ├── core/
│   ├── openai.ts
│   ├── path.js
│   └── src/
│       ├── core/
│       │   ├── config/
│       │   │   ├── config-manager.js
│       │   │   └── configManager.ts
│       │   └── utils/
│       ├── providers/
│       │   ├── anthropic/
│       │   │   └── anthropic-provider.js
│       │   └── openai/
│       │       └── openai-provider.js
│       └── tools/
│           ├── tool-executor.js
│           ├── tool-registry.js
│           └── toolRegistry.ts
├── commands/
│   └── turnover.txt
├── context/
│   ├── anthropic-tool-use.md
│   ├── gemini-tool-calling.md
│   ├── mcp-typescript-sdk.md
│   ├── openai-tool-calling.md
│   └── xm-based-prompting.md
├── docs/
│   ├── ARCHITECTURE.md
│   └── TOOLS.md
├── eslint.config.js
├── examples/
│   └── mcp/
├── jest.config.js
├── package-lock.json
├── package.json
├── project-summary.md
├── src/
│   ├── commands/
│   │   ├── configCommands.ts
│   │   ├── credentialCommands.ts
│   │   ├── di-llm-command.ts
│   │   ├── examples/
│   │   │   ├── basicCommand.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   ├── llmCommand.ts
│   │   ├── toolCommands.ts
│   │   └── writerCommand.ts
│   ├── context/
│   │   ├── contextManager.ts
│   │   ├── di-file-path-processor.ts
│   │   ├── filePathProcessor.ts
│   │   └── index.ts
│   ├── conversation/
│   │   └── conversationManager.ts
│   ├── core/
│   │   ├── adapters/
│   │   │   └── node-file-system.adapter.ts
│   │   ├── commands/
│   │   │   ├── baseCommand.ts
│   │   │   ├── decorators.ts
│   │   │   ├── di-base-command.ts
│   │   │   ├── index.ts
│   │   │   ├── initializer.ts
│   │   │   └── registry.ts
│   │   ├── config/
│   │   ├── di/
│   │   │   ├── container.ts
│   │   │   ├── registry.ts
│   │   │   └── tokens.ts
│   │   ├── interfaces/
│   │   │   └── file-system.interface.ts
│   │   │   ├── configManager.ts +46
│   │   │   └── index.ts
│   │   ├── credentials/
│   │   │   ├── credentialManager.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   ├── types/
│   │   │   ├── cli.types.ts
│   │   │   ├── command.types.ts
│   │   │   ├── config.types.ts +35
│   │   │   ├── context.types.ts
│   │   │   ├── credentials.types.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.types.ts
│   │   │   └── provider.types.ts
│   │   └── utils/
│   │       ├── index.ts
│   │       ├── logger.ts
│   │       └── validation.ts
│   ├── global.d.ts
│   ├── index.ts
│   ├── mcp/
│   │   ├── adapters/
│   │   │   ├── index.ts
│   │   │   └── localCliToolAdapter.ts
│   │   ├── index.ts
│   │   ├── mcpServer.ts +134
│   │   ├── tools/
│   │   └── transports/
│   │       ├── httpTransport.ts +5
│   │       ├── index.ts
│   │       └── stdioTransport.ts +16
│   ├── providers/
│   │   ├── anthropic/
│   │   │   ├── anthropicProvider.ts
│   │   │   └── index.ts
│   │   ├── google/
│   │   │   ├── googleMessageConversion.ts
│   │   │   ├── googleProvider.ts
│   │   │   ├── googleToolExtraction.ts
│   │   │   ├── googleTypes.ts
│   │   │   └── index.ts
│   │   ├── grok/
│   │   │   ├── grokProvider.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   ├── openai/
│   │   │   ├── index.ts
│   │   │   └── openaiProvider.ts
│   │   ├── providerFactory.ts
│   │   └── providerInitializer.ts
│   └── tools/
│       ├── localCliTool.ts
│       ├── localCliToolDefinitions.ts
│       ├── toolDefinitions.md
│       ├── toolEvents.ts
│       ├── toolExecutionFlow.md
│       ├── toolExecutionManager.ts
│       ├── toolExecutor.ts
│       ├── toolRegistry.ts
│       └── toolResultFormatter.ts
├── tests/
│   ├── commands/
│   │   ├── di-llm-command.test.ts
│   │   ├── llmCommand.test.ts
│   │   └── writerCommand.test.ts
│   ├── context/
│   │   ├── contextManager.test.ts
│   │   └── filePathProcessor.test.ts
│   ├── conversation/
│   │   └── conversationManager.test.ts
│   ├── core/
│   │   ├── commands/
│   │   │   ├── baseCommand.test.ts
│   │   │   ├── di-baseCommand.test.ts
│   │   │   └── registry.test.ts
│   │   └── utils/
│   │       └── logger.test.ts
│   ├── index.test.ts
│   ├── jest.setup.ts
│   ├── mcp/
│   │   ├── adapters/
│   │   ├── tools/
│   │   └── transports/
│   ├── providers/
│   │   ├── anthropic/
│   │   │   ├── anthropicProvider.test.ts
│   │   │   ├── anthropicProviderToolCalling.test.ts
│   │   │   ├── anthropicProviderToolCalling2a.test.ts
│   │   │   └── anthropicProviderToolCalling2b.test.ts
│   │   ├── google/
│   │   │   ├── googleProvider.sharedTestUtils.ts
│   │   │   ├── googleProvider.test.ts
│   │   │   ├── googleProviderBasicToolCalling.test.ts
│   │   │   ├── googleProviderCompositionalCalling.test.ts
│   │   │   ├── googleProviderToolCalling.test.ts
│   │   │   └── importConfigManager.test.ts
│   │   ├── grok/
│   │   │   └── grokProvider.test.ts
│   │   └── openai/
│   │       ├── openaiProvider.chat.test.ts
│   │       ├── openaiProvider.completion.test.ts
│   │       ├── openaiProvider.completionTestUtils.ts
│   │       ├── openaiProvider.constructor.test.ts
│   │       ├── openaiProvider.errors.test.ts
│   │       ├── openaiProvider.sharedTestUtils.ts
│   │       └── openaiProviderToolCalling.test.ts
│   ├── tools/
│   │   ├── localCliTool.test.ts
│   │   ├── toolCommands.test.ts
│   │   ├── toolExecutionManager.test.ts
│   │   ├── toolExecutor.test.ts
│   │   ├── toolIntegration.test.ts
│   │   └── toolRegistry.test.ts
│   └── utils/
│       ├── test-di-setup.ts
│       └── test-fs.adapter.ts
├── tree.sh
├── tsconfig.json
├── tsconfig.test.json
└── turn-over-details.md +371
```

This document outlines the directory structure of the AgenticMCP.Typescript project.

## Key Files:

*   **`README.md`**: Provides an overview of the project, its objectives, and how to use the CLI tool.
*   **`DIRECTORY.md`**: Outlines the project directory structure.
*   **`PROGRESS.jsonl`**: Logs the agent's progress, with each line being a JSON object detailing an action.
*   **`TASKS.jsonl`**: Manages tasks, with each line being a JSON object describing a task's status and details.
*   **`LICENSE`**: Contains the project's licensing information.
*   **`package.json`**: Defines project metadata, dependencies, and scripts.
*   **`package-lock.json`**: Records the exact versions of dependencies.
*   **`tsconfig.json`**: Configures the TypeScript compiler options.
*   **`jest.config.js`**: Configuration file for the Jest testing framework.
*   **`tree.sh`**: A shell script used to generate a tree-like representation of the directory structure.
*   **`project-summary.md`**: Provides a high-level summary of the project.

## Key Directories:

*   **`src/`**: Contains the main source code for the AgenticMCP CLI application.
    *   **`src/commands/`**: Contains modules for different CLI command groups and their implementations.
        *   `llmCommand.ts`: Implementation of the LLM interaction command that processes user prompts with file context.
        *   `di-llm-command.ts`: Dependency injection-enabled version of LLM command for improved testability.
        *   `configCommands.ts`: Defines and registers the 'config' command and its subcommands.
        *   `credentialCommands.ts`: Implements CLI commands for managing secure credentials.
        *   `writerCommand.ts`: Implements command for generating content using LLMs based on prompts.
    *   **`src/context/`**: Handles processing and managing context from files for LLM interactions.
        *   `contextManager.ts`: Manages file content as context sources for LLMs.
        *   `filePathProcessor.ts`: Processes file paths from user input into context.
        *   `di-file-path-processor.ts`: Dependency injection version of file path processor.
    *   **`src/core/`**: Houses the core logic, types, and utilities shared across the application.
        *   **`src/core/adapters/`**: Contains adapter implementations for external services and interfaces.
            *   `node-file-system.adapter.ts`: Node.js implementation of the file system interface for production use.
        *   **`src/core/commands/`**: Base classes and utilities for command handling.
            *   `baseCommand.ts`: Abstract base class for all CLI commands.
            *   `di-base-command.ts`: Dependency injection version of the base command.
            *   `registry.ts`: Registry for command registration and discovery.
        *   **`src/core/config/`**: Manages application configuration with extensible options.
            *   `configManager.ts`: Manages loading, saving, and accessing application configuration.
        *   **`src/core/credentials/`**: Handles secure storage and retrieval of credentials.
            *   `credentialManager.ts`: Provides methods to get, set, and delete secrets.
        *   **`src/core/di/`**: Dependency injection system for improved testability and modularity.
            *   `container.ts`: Simple DI container implementation that manages dependencies.
            *   `registry.ts`: Registry functions to set up initial dependencies.
            *   `tokens.ts`: Constants used as keys for dependency resolution.
        *   **`src/core/interfaces/`**: Contains interfaces for dependency injection and abstraction.
            *   `file-system.interface.ts`: Interface for file system operations to decouple from Node.js.
        *   **`src/core/types/`**: Contains core TypeScript type definitions.
            *   `command.types.ts`: Defines types related to CLI commands.
            *   `logger.types.ts`: Defines the logger interface for consistent logging.
            *   `provider.types.ts`: Defines interfaces for LLM provider adapters.
    *   **`src/di-setup.ts`**: Central setup file for the dependency injection system.
    *   **`src/providers/`**: Contains adapters for different LLM providers.
        *   **`src/providers/openai/`**: OpenAI provider implementation with tool calling support.
        *   **`src/providers/anthropic/`**: Anthropic Claude provider implementation.
        *   **`src/providers/google/`**: Google Gemini provider implementation.
        *   **`src/providers/grok/`**: Grok provider implementation.
        *   `providerFactory.ts`: Factory for creating provider instances based on configuration.
    *   **`src/mcp/`**: Model Context Protocol server implementation (read-only directory).
    *   **`src/tools/`**: Tool implementations for LLMs to use for function calling.
        *   `toolRegistry.ts`: Registry for available tools and their definitions.
        *   `toolExecutor.ts`: Executor for tool invocations from LLMs.
    *   `index.ts`: Main entry point for the CLI application.
*   **`tests/`**: Houses all unit, integration, and end-to-end tests for the project.
    *   **`tests/commands/`**: Tests for command implementations.
        *   `llmCommand.test.ts`: Tests for the LLM command.
        *   `di-llm-command.test.ts`: Tests for the DI-enabled LLM command.
        *   `writerCommand.test.ts`: Tests for the writer command.
    *   **`tests/context/`**: Tests for context management.
        *   `contextManager.test.ts`: Tests for context manager functionality.
        *   `filePathProcessor.test.ts`: Tests for file path processor.
        *   `di-file-path-processor.test.ts`: Tests for the DI-enabled file path processor.
    *   **`tests/core/`**: Tests for core functionality.
        *   **`tests/core/commands/`**: Tests for base command classes.
            *   `baseCommand.test.ts`: Tests for the original base command.
            *   `di-baseCommand.test.ts`: Tests for the DI-enabled base command.
    *   **`tests/providers/`**: Tests for all LLM provider adapters.
        *   **`tests/providers/openai/`**: Tests for the OpenAI provider.
        *   **`tests/providers/anthropic/`**: Tests for the Anthropic provider.
        *   **`tests/providers/google/`**: Tests for the Google provider.
        *   **`tests/providers/grok/`**: Tests for the Grok provider.
    *   **`tests/tools/`**: Tests for tool implementations.
        *   `toolExecutor.test.ts`: Tests for tool execution.
        *   `toolRegistry.test.ts`: Tests for tool registration.
    *   **`tests/utils/`**: Test utilities and helpers.
        *   `test-di-setup.ts`: Utilities for setting up dependency injection in tests.
        *   `test-fs.adapter.ts`: In-memory file system implementation for testing.
*   **`docs/`**: Includes all project documentation, such as requirements, design documents, and user guides.
    *   `ARCHITECTURE.md`: Describes the software architecture of the project.
*   **`context/`**: (Purpose to be defined, seems project specific based on listing - e.g. stores contextual data for agent operations)
*   **`.vscode/`**: Contains VS Code editor-specific settings.
    *   `settings.json`: Workspace settings for VS Code.