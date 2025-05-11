# Project Directory Structure
```markdown
.
├── CLAUDE.md
├── DIRECTORY.md
├── LICENSE
├── PROGRESS.jsonl
├── README.md
├── TASKS.jsonl
├── __mocks__/
│   ├── @/
│   │   └── core/
│   ├── @anthropic-ai/
│   │   └── sdk.ts
│   ├── core/
│   ├── openai.ts
│   └── src/
│       └── core/
│           └── utils/
├── context/
├── docs/
│   └── ARCHITECTURE.md
├── eslint.config.js
├── jest.config.js
├── package-lock.json
├── package.json
├── project-summary.md
├── src/
│   ├── commands/
│   │   ├── configCommands.ts
│   │   ├── credentialCommands.ts
│   │   └── mcpCommands.ts
│   ├── core/
│   │   ├── config/
│   │   │   ├── configManager.ts
│   │   │   └── index.ts
│   │   ├── credentials/
│   │   │   ├── credentialManager.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   ├── types/
│   │   │   ├── cli.types.ts
│   │   │   ├── command.types.ts
│   │   │   ├── config.types.ts
│   │   │   ├── context.types.ts
│   │   │   ├── credentials.types.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.types.ts
│   │   │   └── provider.types.ts
│   │   └── utils/
│   │       ├── index.ts
│   │       ├── logger.ts
│   │       └── validation.ts
│   ├── index.ts
│   ├── providers/
│   │   ├── anthropic/
│   │   │   ├── anthropicProvider.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   └── openai/
│   │       ├── index.ts
│   │       └── openaiProvider.ts
│   └── tools/
│       ├── localCliTool.ts
│       └── mcpTool.ts
├── tests/
│   ├── context/
│   │   └── contextManager.test.ts
│   ├── core/
│   │   ├── commands/
│   │   └── utils/
│   │       └── logger.test.ts
│   ├── index.test.ts
│   ├── jest.setup.ts
│   ├── providers/
│   │   ├── anthropic/
│   │   │   ├── anthropicProvider.test.ts
│   │   │   ├── anthropicProviderToolCalling2a.test.ts
│   │   │   └── anthropicProviderToolCalling2b.test.ts
│   │   ├── google/
│   │   └── openai/
│   │       ├── openaiProvider.test.ts
│   │       └── openaiProviderToolCalling.test.ts
│   └── tools/
│       └── localCliTool.test.ts
├── tree.sh
├── tsconfig.json
└── tsconfig.test.json
```

This document outlines the directory structure of the AgenticMCP.Typescript project.

## Key Files:

*   **`README.md`**: Provides an overview of the project, its objectives, and how to use the CLI tool.
*   **`DIRECTORY.md`**: (This file) Outlines the project directory structure.
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
    *   **`src/core/`**: Houses the core logic, types, and utilities shared across the application.
        *   **`src/core/config/`**: Manages application configuration.
            *   `configManager.ts`: Manages loading, saving, and accessing application configuration.
            *   `index.ts`: Barrel file re-exporting all config utils within `src/core/config`.
        *   **`src/core/credentials/`**: Handles secure storage and retrieval of credentials using the system keychain.
            *   `credentialManager.ts`: Provides methods to get, set, and delete secrets.
            *   `index.ts`: Barrel file for the credentials module.
        *   **`src/core/types/`**: Contains core TypeScript type and interface definitions for the application.
            *   `command.types.ts`: Defines types related to CLI commands.
            *   `config.types.ts`: Defines types for configuration structures.
            *   `context.types.ts`: Defines types for context management.
            *   `credentials.types.ts`: Defines TypeScript interfaces for credentials.
            *   `provider.types.ts`: Defines interfaces for LLM provider adapters.
            *   `index.ts`: Barrel file for all type definitions.
        *   `index.ts`: Barrel file for the `core` module.
    *   **`src/providers/`**: Contains adapters for different LLM providers.
        *   **`src/providers/openai/`**: OpenAI provider specific implementations.
            *   `openaiProvider.ts`: Class implementing `LLMProvider` for OpenAI with tool calling support.
            *   `index.ts`: Barrel file for the OpenAI provider module.
        *   **`src/providers/anthropic/`**: Anthropic provider specific implementations.
            *   `anthropicProvider.ts`: Class implementing `LLMProvider` for Anthropic.
            *   `index.ts`: Barrel file for the Anthropic provider module.
        *   `index.ts`: Barrel file re-exporting all provider modules.
    *   **`src/commands/`**: Contains modules for different CLI command groups.
        *   `configCommands.ts`: Defines and registers the 'config' command and its subcommands.
        *   `credentialCommands.ts`: Implements CLI commands for managing secure credentials (e.g., `credentials set`, `credentials get`).
    *   `index.ts`: Main entry point for the CLI application.
*   **`tests/`**: Houses all unit, integration, and end-to-end tests for the project.
    *   **`tests/providers/`**: Tests for all LLM provider adapters.
        *   **`tests/providers/openai/`**: Tests for the OpenAI provider.
            *   `openaiProvider.test.ts`: Tests for basic OpenAI provider functionality.
            *   `openaiProviderToolCalling.test.ts`: Tests for OpenAI tool calling functionality.
        *   **`tests/providers/anthropic/`**: Tests for the Anthropic provider.
            *   `anthropicProvider.test.ts`: Tests for Anthropic provider functionality.
    *   **`tests/tools/`**: Tests for tool implementations.
        *   `localCliTool.test.ts`: Tests for the local file CLI tool.
    *   **`tests/context/`**: Tests for context management.
        *   `contextManager.test.ts`: Tests for context management functionality.
    *   `index.test.ts`: Example test file.
*   **`docs/`**: Includes all project documentation, such as requirements, design documents, and user guides.
    *   `ARCHITECTURE.md`: Describes the software architecture of the project.
*   **`context/`**: (Purpose to be defined, seems project specific based on listing - e.g. stores contextual data for agent operations)
*   **`.vscode/`**: Contains VS Code editor-specific settings.
    *   `settings.json`: Workspace settings for VS Code.