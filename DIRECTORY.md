```markdown
.
├── CLAUDE.md
├── DIRECTORY.md
├── KNOWLEDGE.md
├── LICENSE
├── PROGRESS.jsonl
├── README.md
├── TASKS.jsonl
├── TESTING.md
├── backup_mocks/
│   ├── file-path-processor.js
│   └── file-path-processor.js.bak
├── commands/
│   └── turnover.txt
├── context/
│   ├── anthropic-tool-use.md
│   ├── gemini-tool-calling.md
│   ├── jest-mock.md
│   ├── mcp-typescript-sdk.md
│   ├── openai-tool-calling.md
│   └── xm-based-prompting.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ES_MODULE_TESTING.md
│   ├── MCP_MODE.md
│   └── TOOLS.md
├── eslint.config.js
├── examples/
│   ├── es-module-testing.md
│   ├── fix-test-modules.md
│   ├── mcp/
│   │   ├── anthropic-integration.js
│   │   ├── http-client.js
│   │   └── stdio-client.js
│   └── mock-utility-test.ts
├── jest.config.js
├── package-lock.json
├── package.json
├── project-summary.md
├── src/
│   ├── commands/
│   │   ├── configCommands.ts
│   │   ├── credentialCommands.ts
│   │   ├── llmCommand.ts
│   │   ├── mcpCommands.ts
│   │   └── toolCommands.ts
│   ├── config/
│   │   └── appConfig.ts
│   ├── context/
│   │   ├── contextManager.ts
│   │   ├── filePathProcessor.ts
│   │   └── index.ts
│   ├── core/
│   │   ├── adapters/
│   │   │   └── nodeFileSystemAdapter.ts
│   │   ├── commands/
│   │   │   ├── baseCommand.ts
│   │   │   ├── decorators.ts
│   │   │   └── type.ts
│   │   ├── config/
│   │   │   ├── configManager.ts
│   │   │   └── index.ts
│   │   ├── credentials/
│   │   │   ├── credentialManager.ts
│   │   │   └── index.ts
│   │   ├── di/
│   │   │   ├── container.ts
│   │   │   ├── registry.ts
│   │   │   └── tokens.ts
│   │   ├── interfaces/
│   │   │   ├── diff-service.interface.ts
│   │   │   └── file-system.interface.ts
│   │   ├── services/
│   │   │   ├── diff.service.ts
│   │   │   └── file-system.service.ts
│   │   ├── setup/
│   │   │   ├── cliCommandsSetup.ts
│   │   │   ├── dependencySetup.ts
│   │   │   ├── index.ts
│   │   │   ├── llmCommandSetup.ts
│   │   │   ├── programSetup.ts
│   │   │   ├── providerSystemSetup.ts
│   │   │   ├── toolCommandsSetup.ts
│   │   │   └── toolSystemSetup.ts
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
│   ├── global.types.ts
│   ├── index.ts
│   ├── mcp/
│   │   ├── index.ts
│   │   ├── mcpServer.ts
│   │   ├── tools/
│   │   │   ├── registrarFactory.ts
│   │   │   ├── roleBasedTools.ts
│   │   │   ├── roleHandlers.ts
│   │   │   ├── roleSchemas.ts
│   │   │   ├── types.ts
│   │   │   ├── xmlPromptUtils.ts
│   │   │   └── xmlPromptUtilsHelpers.ts
│   │   └── types.ts
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
│   │   │   ├── openaiProvider.ts
│   │   │   └── openaiProviderMappers.ts
│   │   ├── providerFactory.ts
│   │   ├── providerInitializer.ts
│   │   ├── providerModuleFactory.ts
│   │   └── types.ts
│   ├── tools/
│   │   ├── factory/
│   │   │   └── localCliToolFactory.ts
│   │   ├── localCliTool.ts
│   │   ├── localCliToolDefinitions.ts
│   │   ├── services/
│   │   │   └── diffService.ts
│   │   ├── toolExecutor.ts
│   │   ├── toolRegistry.ts
│   │   └── toolResultFormatter.ts
│   └── tsconfig.json
├── tests/
│   ├── examples/
│   ├── index.test.ts
│   └── tsconfig.json
├── tree.sh
├── tsconfig.json
└── turn-over-details.md
```