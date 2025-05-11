# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgenticMCP (Agentic Model Communication Protocol) is a TypeScript-based CLI tool that provides a unified interface to interact with various Large Language Models (LLMs) through predefined agent commands. The CLI enables users to leverage different LLM providers (OpenAI, Anthropic, etc.) with specialized system prompts and roles via a simple terminal interface.

## Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
npm run test:watch

# Linting and formatting
npm run lint
npm run lint:fix
npm run format

# Type checking
npm run type-check

# Start the CLI
npm run start
```

## Architecture

The codebase follows a modular architecture with these key components:

1. **CLI (src/index.ts)** - Entry point using Commander.js for command registration

2. **Core Services**
   - **Configuration (src/core/config/)** - Manages application settings using file-based storage
   - **Credentials (src/core/credentials/)** - Securely stores API keys using system keychain (keytar)
   - **Logger (src/core/utils/logger.ts)** - Centralized logging utilities

3. **Providers (src/providers/)**
   - Adapters implementing a common interface for different LLM services
   - Includes OpenAIProvider and AnthropicProvider

4. **Commands (src/commands/)**
   - CLI command definitions and handlers for configuration and credential management

5. **Tools (src/tools/)**
   - Utilities for tool implementations (local file operations, etc.)

## Type System

The project uses TypeScript's type system extensively to ensure type safety:

- Provider-specific configuration types
- Common interfaces for standardizing LLM provider interactions
- Tool calling interfaces for function execution

## Working with Providers

When implementing new LLM providers:

1. Create a new directory under `src/providers/` for the provider
2. Implement the `LLMProvider` interface with provider-specific logic
3. Add appropriate type definitions for provider configuration
4. Register the provider in the provider index file

## Testing Conventions

- Test files are named `*.test.ts` and located in the `tests/` directory
- Use Jest for mocking and assertions
- Each core component should have corresponding unit tests
- Mock external dependencies (API clients, filesystem, etc.) in tests
- Always define types/interfaces in the types directory, not in test files
- Import types/interfaces from the relevant modules' types directory
- Consult latest documentation of libraries before creating/mocking tests

## Configuration System

The configuration system uses JSON files stored in platform-specific locations:
- Configuration precedence: explicit configs > stored configs > default configs
- API keys can be stored in the system keychain using keytar
- Keychain service is named `agenticmcp_cli`
- Account names follow the pattern `provider_type-instance_name`

## Error Handling

- Use custom error types extending the base `Error` class
- Report errors through the centralized logger
- Provide meaningful error messages to CLI users

## Project Workflow Rules

1. **Progress Tracking**
   - Always log progress to PROGRESS.jsonl with timestamps, actions, file info, and task details

2. **Task Management**
   - Update task status in TASKS.jsonl when working on or completing tasks
   - Run tests before marking tasks as complete
   - After task completion, commit and push changes: `git add --all && git commit && git push`

3. **Project Structure**
   - For new files, run `bash tree.sh` to update DIRECTORY.md
   - Always refer to DIRECTORY.md first when looking for files

4. **Code Quality**
   - After creating/editing files, run `npm run lint --fix` followed by `npm run lint`
   - Always run `npm run type-check` to ensure no type errors
   - When using third-party packages, refer to the latest documentation

5. **File Structure Guidelines**
   - Keep most files between 100-300 lines
   - Limit utility/helper files to under 150 lines
   - Test files should not exceed 300 lines
   - Interface and type files should stay under 150 lines
   - Index files should stay under 50 lines
   - Split files when they require excessive scrolling or contain multiple unrelated concerns
   - Maintain separation of concerns across layers