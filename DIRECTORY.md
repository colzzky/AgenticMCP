# Project Directory Structure

```
. (AgenticMCP.Typescript)
├── .aider.chat.history.md
├── .aider.tags.cache.v4/
├── .eslintrc.js
├── .git/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── .prettierrc.js
├── .vscode/
├── .windsurfrules
├── DIRECTORY.md
├── LICENSE
├── package.json
├── PROGRESS.jsonl
├── README.md
├── TASKS.jsonl
├── tsconfig.json
├── context/
├── dist/
├── docs/
│   └── ARCHITECTURE.md
├── project-summary.md
├── src/
│   ├── core/
│   │   ├── index.ts
│   │   ├── types/
│   │   │   ├── command.types.ts
│   │   │   ├── provider.types.ts
│   │   │   ├── context.types.ts
│   │   │   ├── config.types.ts
│   │   │   ├── credentials.types.ts
│   │   │   └── index.ts
│   │   ├── config/
│   │   │   ├── configManager.ts
│   │   │   └── index.ts
│   │   ├── credentials/
│   │   │   ├── credentialManager.ts
│   │   │   └── index.ts
│   │   └── utils/
│   ├── commands/
│   │   ├── configCommands.ts
│   │   └── credentialCommands.ts
│   └── index.ts
├── tests/
│   └── index.test.ts
├── tree.sh

## Key Directories:

*   **`src/`**: Contains the main source code for the AgenticMCP CLI application.
*   **`src/core/types/`**: Contains core TypeScript type and interface definitions for the application.
*   **`src/core/config/`**: Manages application configuration.
    *   `configManager.ts`: Manages loading, saving, and accessing application configuration.
    *   `index.ts`: Barrel file re-exporting all config utils within `src/core/config`.
*   **`src/core/credentials/`**: Handles secure storage and retrieval of credentials using the system keychain.
    *   `credentialManager.ts`: Provides methods to get, set, and delete secrets.
    *   `index.ts`: Barrel file for the credentials module.
*   **`src/core/utils/`**: Utility functions and helper modules.
*   **`src/commands/`**: Contains modules for different CLI command groups.
    *   `configCommands.ts`: Defines and registers the 'config' command and its subcommands.
    *   `credentialCommands.ts`: Implements CLI commands for managing secure credentials (e.g., `credentials set`, `credentials get`).
*   **`tests/`**: Houses all unit, integration, and end-to-end tests for the project.
*   **`docs/`**: Includes all project documentation, such as requirements, design documents, and user guides.
*   **`dist/`**: Contains the compiled JavaScript code output by the TypeScript compiler.
*   **`context/`**: (Purpose to be defined, seems project specific based on listing)

## Key Files:

*   **`README.md`**: Main project overview, requirements, and setup instructions.
*   **`TASKS.jsonl`**: Tracks project tasks, their status, and assignments.
*   **`PROGRESS.jsonl`**: Logs detailed progress on tasks and development activities.
*   **`LICENSE`**: Project's open-source license information (MIT License).
*   **`package.json`**: Manages project dependencies and scripts.
*   **`.gitignore`**: Specifies intentionally untracked files that Git should ignore.
*   **`project-summary.md`**: (Purpose to be defined, seems project specific based on listing)
*   **`tsconfig.json`**: TypeScript compiler configuration.
*   **`.eslintrc.js`**: ESLint configuration file.
*   **`.prettierrc.js`**: Prettier configuration file.
*   **`tree.sh`**: (Purpose to be defined, seems project specific based on listing)
*   **`src/core/config/configManager.ts`**: Manages loading, saving, and accessing application configuration.
*   **`src/core/config/index.ts`**: Barrel file re-exporting all config utils within `src/core/config`.
*   **`src/core/index.ts`**: Barrel file re-exporting all modules within `src/core`.
*   **`src/core/types/credentials.types.ts`**: Defines TypeScript interfaces for credentials.
*   **`src/core/credentials/credentialManager.ts`**: Class for managing credentials via `keytar`.
*   **`src/core/credentials/index.ts`**: Barrel file for the `credentials` module.