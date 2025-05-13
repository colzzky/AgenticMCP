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

## 🧪 Jest Mocking Guide for TypeScript Projects

(... rest of the existing content ...)

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

## Line Count and File Management Guidelines

14. When creating/editing a JavaScript or TypeScript file, check the line count of the file and make sure it does not exceed the ideal line count per file. You can use tools such as `wc -l filename` to check the line count of an existing file or count lines of a string using the tool `wc -l <(echo "string")` before creating a new file to ensure it does not exceed the ideal line count per file.

15. If the file's line count exceeds the suggested number of lines based on "Rules: Ideal Line Count per File", then split the file into multiple files, using `import` and `export` to share code between files, or use composables.

### ✅ **Rules: Ideal Line Count per File**

1. **Limit each file to a single responsibility**
   * If a file is handling multiple unrelated concerns, split it.

2. **Cap most files between 100–300 lines**
   * This range supports readability and testability while allowing meaningful logic.

3. **Keep utility/helper files under 150 lines**
   * Utility files should focus on small, reusable functions. Split them when they start housing unrelated utilities.

4. **Limit test files to 300 lines max**
   * Group related test cases in the same file, but break them up if there are too many logical variations being tested.

5. **Interface and type files should stay under 150 lines**
   * Keep closely related types together; split into multiple files if modeling large, unrelated entities.

6. **Index (`index.ts`) and entry point files should stay under 50 lines**
   * These should primarily import, re-export, or initialize — avoid complex logic.

7. **Avoid nesting more than 2 classes or large functions in a single file**
   * Deep nesting harms testability and makes files harder to reason about.

8. **If a file contains more than ~10 screenfuls of code, consider refactoring**
   * This is a soft limit based on visual length and ease of navigation.

9. **Split files when editing requires frequent scrolling or search**
   * Ease of navigation is critical for collaborative teams and future maintainers.

10. **Maintain separation of concerns across layers (service, controller, utils, etc.)**
    * Don't mix types, logic, and API handlers in the same file.

## Developer Best Practices

- After creating or editing a file, always run "npm run lint --fix" to see any type/linting errors, and proceed to fix if errors are found - then run "npm run lint" to ensure that there are no errors - repeat process until there are no errors

- When working on test files - Always run "npm run type-check:tests" to ensure that there are no type errors in the tests - repeat process until there are no errors
 - 13.1 When working on src files - Always run "npm run type-check:src" to ensure that there are no type errors in the src files - repeat process until there are no errors
 - 13.2 Finally run "npm run type-check" to ensure that there are no type errors in the entire project - repeat process until there are no errors