# AgenticMCP CLI - Architecture Guidelines

## 1. Introduction

This document outlines the architectural guidelines, coding standards, and testing approach for the AgenticMCP CLI project. Adhering to these guidelines will help ensure a maintainable, scalable, and robust codebase.

## 2. Architectural Principles

- **Modularity:** The system will be designed as a collection of loosely coupled modules. Each module will have a single, well-defined responsibility (e.g., provider integration, command handling, configuration management).
- **Separation of Concerns:** Core business logic will be separated from framework-specific code (e.g., CLI parsing, external API interactions). This promotes testability and flexibility.
- **Clear Interfaces:** Modules will interact through well-defined TypeScript interfaces, promoting decoupling and making it easier to replace or mock implementations.
- **Extensibility:** The architecture should allow for easy addition of new LLM providers, agent commands, and features without requiring significant refactoring of existing code.
- **SOLID Principles:** We will strive to follow SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) where applicable.
- **DRY (Don't Repeat Yourself):** Avoid code duplication by abstracting common functionality into reusable utilities or services.
- **KISS (Keep It Simple, Stupid):** Favor simple and straightforward solutions over complex ones.

## 3. Directory Structure Philosophy

- **`src/`**: Contains all core TypeScript source code.
  - **`src/commands/`**: CLI command definitions and handlers.
  - **`src/providers/`**: Adapters for different LLM providers.
  - **`src/core/`**: Core logic, type definitions, utilities, and services shared across the application.
  - **`src/models/`**: Data models and type definitions (can be part of `core/` or separate if complex).
  - **`src/config/`**: Configuration loading and management.
- **`tests/`**: Contains all test files, mirroring the `src/` directory structure.
  - **`tests/unit/`**: Unit tests.
  - **`tests/integration/`**: Integration tests.
- **`docs/`**: Project documentation, including this file, API documentation, etc.

## 4. Coding Standards (Initial Outline)

- **Language:** TypeScript (latest stable version).
- **Formatting:** Prettier will be used for automatic code formatting (details in Task 4).
- **Linting:** ESLint will be used for static code analysis (details in Task 4).
- **Naming Conventions:** 
  - `PascalCase` for classes, interfaces, enums, and type aliases.
  - `camelCase` for functions, methods, and variables.
  - Constants may use `UPPER_SNAKE_CASE`.
- **Comments:** JSDoc for all public functions, methods, classes, and complex logic sections.
- **File Structure:** Maintain a consistent order for imports (e.g., external libraries, then project modules).
- **Type Safety:** Leverage TypeScript's type system. Avoid `any` where possible; prefer `unknown` or more specific types. Use `strict` mode in `tsconfig.json`.
- **File Line Count:** Adhere to the project's ideal line count rules (typically 100-300 lines for most files, see project rules for specifics).

## 5. Testing Approach (Initial Outline)

- **Framework:** Jest will be used as the primary testing framework (details in Task 4).
- **Types of Tests:**
  - **Unit Tests:** Focus on testing individual functions, methods, and classes in isolation.
  - **Integration Tests:** Test the interaction between different modules or components (e.g., a command interacting with a provider mock).
  - **End-to-End (E2E) Tests:** (To be considered later) Test the full CLI application flow from the user's perspective.
- **Code Coverage:** Aim for high code coverage (specific targets to be defined, e.g., >80%).
- **Mocking/Stubbing:** Use Jest's built-in mocking capabilities and consider libraries like `ts-mockito` if needed for more complex scenarios.
- **Test File Organization:** Test files will be co-located with the code they test or placed in a parallel `tests/` directory structure (e.g., `src/core/utils.ts` would have tests in `tests/unit/core/utils.test.ts`).

## 6. Dependency Management

- **Package Manager:** npm (or yarn, to be decided consistently). Package versions should be managed in `package.json`.
- **Dependency Updates:** Regularly review and update dependencies to patch vulnerabilities and leverage new features.

## 7. Error Handling

- **Custom Error Types:** Define custom error classes extending the base `Error` class for more specific error handling and identification.
- **Consistent Logging:** Implement a consistent logging strategy for errors and important application events.

## 8. Configuration Management

- Configuration will be loaded from files (e.g., JSON, TOML) and environment variables, with a clear order of precedence.
- Sensitive information (like API keys) should be handled securely (e.g., using `keytar` as per Task 8).

*(This document will be expanded and refined as the project progresses.)*
