# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgenticMCP (Agentic Model Communication Protocol) is a TypeScript-based CLI tool that provides a unified interface to interact with various Large Language Models (LLMs) through predefined agent commands. The CLI enables users to leverage different LLM providers (OpenAI, Anthropic, etc.) with specialized system prompts and roles via a simple terminal interface.

## Memories

- "globalThis" pattern is prohibited
- **Dependency Injection Policy/Standards for TypeScript (Without Third-Party Libraries)**

## Development Workflow and Best Practices

1. Write robust and testable code by fully adopting dependency injection - refer to ** Dependency Injection Policy/Standards for TypeScript (Without Third-Party Libraries)**

2. Always log your Progress to PROGRESS.jsonl - each line should be a valid JSON object and should contain the following fields:
    - timestamp: the current time in ISO 8601 format
    - action: the action you are taking
    - file: the file you are working on
    - line: the line number you are working on
    - column: the column number you are working on
    - message: a message describing what you are doing
    - task_number: the task number you are working on
    - task_title: the task title you are working on
    - task_description: the task description you are working on
    - task_assigned_to: the person assigned to the task you are working on
    - task_status: the status of the task you are working on

3. Always update task status in TASKS.jsonl - each line should be a valid JSON object and should contain the following fields:
    - task_number: the task number
    - title: the task title
    - description: the task description
    - assigned_to: the person assigned to the task
    - status: the status of the task

4. For Any new files added, run the "bash tree.sh" CLI command to list all the files and directories and update DIRECTORY.md

5. Always read the DIRECTORY.md to understand the project structure before working on a task
 - 5.1 when looking for files, always first refer to the DIRECTORY.md before using filesystem search tool
 - 5.2 if DIRECTORY.md is not helpful, only then should you use the filesystem search tool

6. Always read the TASKS.jsonl to understand the task list, and to understand the current task and its status before working on a task

7. Always read the PROGRESS.jsonl to understand the progress made on the project before working on a task

8. Always read the README.md to understand the project requirements before working on a task

9. Before marketing the task as complete, make sure to run tests and ensure that the code works as expected - only if test is applicable

10. For every completed task, do a "git add --all", "git commit" and "git push"

11. Everytime you need to use a library or third-party package/SDK/API, always make sure that you look-out for the latest documentation and use the latest version of the library or third-party package by using the tool "Context7" - if the library or third-party package is not available in the tool, use the web to search for the latest documentation and use the latest version of the library or third-party package

12. After creating or editing a file, always run "npm run lint --fix" to see any type/linting errors, and proceed to fix if errors are found - then run "npm run lint" to ensure that there are no errors - repeat process until there are no errors

13. When working on test files - Always run "npm run type-check:tests" to ensure that there are no type errors in the tests - repeat process until there are no errors
 - 13.1 When working on src files - Always run "npm run type-check:src" to ensure that there are no type errors in the src files - repeat process until there are no errors
 - 13.2 Finally run "npm run type-check" to ensure that there are no type errors in the entire project - repeat process until there are no errors

14. when creating/editing a javascript or typescript file, check the line count of the file and make sure it does not exceed the ideal line count per file. you can use tools such as "wc -l filename" to check the line count of the file of an existing file or count lines of a string using the tool "wc -l <(echo "string")" before creating a new file to make sure it does not exceed the ideal line count per file

15. If the file lines number exceeds the suggested number of lines based on "Rules: Ideal Line Count per File", then split the file into multiple files, just use "import" and "export" to share code between files, or use composables

16. If the library does not expose the type definitions, use the "Github" tool inspect the files in the github repository of the library to get the type definitions

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

8. **If a file contains more than \~10 screenfuls of code, consider refactoring**
   * This is a soft limit based on visual length and ease of navigation.

9. **Split files when editing requires frequent scrolling or search**
   * Ease of navigation is critical for collaborative teams and future maintainers.

10. **Maintain separation of concerns across layers (service, controller, utils, etc.)**
    * Don't mix types, logic, and API handlers in the same file.

## Dependency Injection Policy

Refer to the existing detailed **Dependency Injection Policy/Standards for TypeScript (Without Third-Party Libraries)** section from the previous CLAUDE.md content, which provides comprehensive guidelines for implementing dependency injection.

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

## Architecture Overview

The codebase follows a modular architecture with key components:

1. **CLI (src/index.ts)** - Entry point using Commander.js for command registration
2. **Core Services**
   - **Configuration** - Manages application settings
   - **Credentials** - Securely stores API keys
   - **Logger** - Centralized logging utilities
3. **Providers** - Adapters for different LLM services
4. **Commands** - CLI command definitions and handlers
5. **Tools** - Utilities for tool implementations

## Testing Conventions

- Test files named `*.test.ts` in `tests/` directory
- Use Jest for mocking and assertions
- Mock external dependencies
- Define types/interfaces in types directory
- Consult latest library documentation before creating tests

## Project Workflow Rules

Refer to the detailed workflow rules from the previous CLAUDE.md content, which cover:
- Progress tracking
- Task management
- Project structure maintenance
- Code quality checks
- File structure guidelines

## Developer Best Practices

Follow the comprehensive best practices outlined in the previous CLAUDE.md content, with a focus on:
- Dependency injection
- Code quality
- Type checking
- Linting
- Testing
- File structure management