```markdown
.
├── AUDIT.md
├── CLAUDE.md
├── DIRECTORY.md +6
├── KNOWLEDGE.md
├── LICENSE
├── PROGRESS.jsonl +1
├── README.md
├── TASKS.jsonl
├── TESTING.md
├── commands/
│   └── turnover.txt
├── context/
│   ├── anthropic-docs.md
│   ├── anthropic-tool-use.md
│   ├── gemini-docs.md
│   ├── gemini-tool-calling.md
│   ├── jest-mock.md
│   ├── mcp-typescript-sdk.md
│   ├── openai-docs.md
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
│   │   │   └── tokens.ts +1
│   │   ├── interfaces/
│   │   │   ├── diff-service.interface.ts
│   │   │   └── file-system.interface.ts
│   │   ├── services/
│   │   │   ├── diff.service.ts
│   │   │   └── file-system.service.ts
│   │   ├── setup/
│   │   │   ├── cliCommandsSetup.ts
│   │   │   ├── dependencySetup.ts +18
│   │   │   ├── index.ts
│   │   │   ├── llmCommandSetup.ts
│   │   │   ├── programSetup.ts
│   │   │   ├── providerSystemSetup.ts
│   │   │   ├── toolCommandsSetup.ts
│   │   │   └── toolSystemSetup.ts +11
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
│   ├── global.types.ts +2
│   ├── index.ts +8
│   ├── mainDI.ts +19
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
│   ├── ENTRY_POINT_TESTS.md
│   ├── EXPANDED_COVERAGE.md
│   ├── commands/
│   │   ├── configCommandsSimple.test.ts
│   │   ├── credentialCommandsSimple.test.ts
│   │   ├── llmCommandSimple.test.ts
│   │   ├── mcpCommandsSimple.test.ts
│   │   └── toolCommandsSimple.test.ts
│   ├── context/
│   │   ├── contextManager.test.ts
│   │   └── filePathProcessor.test.ts
│   ├── core/
│   │   ├── commands/
│   │   │   ├── baseCommand.test.ts
│   │   │   └── decorators.test.ts
│   │   ├── config/
│   │   │   └── configManager.test.ts
│   │   ├── credentials/
│   │   │   └── credentialManager.test.ts
│   │   ├── di/
│   │   │   ├── container.test.ts
│   │   │   ├── registry.test.disabled.ts
│   │   │   └── registry.test.ts
│   │   ├── services/
│   │   │   ├── diff.service.test.ts
│   │   │   └── file-system.service.test.ts
│   │   ├── setup/
│   │   │   ├── dependencySetup.test.ts
│   │   │   ├── llmCommandSetup.test.ts
│   │   │   ├── programSetup.test.ts
│   │   │   ├── providerSystemSetup.test.ts
│   │   │   └── toolSystemSetup.test.ts
│   │   └── utils/
│   │       └── validation.test.ts
│   ├── entry-point.test.ts
│   ├── index.test.ts
│   ├── jest-setup-esm.js
│   ├── jest.setup.js
│   ├── mainDI.test.ts
│   ├── mcp/
│   │   ├── mcpServer.test.ts
│   │   └── tools/
│   │       ├── processFileOperations.test.ts
│   │       ├── registrarFactory.test.ts
│   │       ├── roleHandlers.test.ts
│   │       ├── roleSchemas.test.ts
│   │       ├── xmlPromptUtils.test.ts
│   │       └── xmlPromptUtilsHelpers.test.ts
│   ├── providers/
│   │   ├── anthropic/
│   │   │   ├── anthropicProvider.test.ts
│   │   │   ├── anthropicProvider.toolCalling.test.ts
│   │   │   └── anthropicProviderParallelToolCalling.test.ts
│   │   ├── google/
│   │   │   ├── googleMessageConversion.test.ts
│   │   │   ├── googleProvider.test.ts
│   │   │   ├── googleProvider.toolCalling.test.ts
│   │   │   ├── googleProviderParallelToolCalling.test.ts
│   │   │   └── googleToolExtraction.test.ts
│   │   ├── grok/
│   │   │   └── grokProvider.test.ts
│   │   ├── openai/
│   │   │   ├── openaiProvider.basic.test.ts
│   │   │   ├── openaiProvider.functionCalling.test.ts
│   │   │   └── openaiProvider.toolCalling.test.ts
│   │   ├── providerFactory.test.ts
│   │   └── providerInitializer.test.ts
│   ├── tools/
│   │   ├── factory/
│   │   │   ├── di-local-cli-tool-factory.test.ts
│   │   │   ├── factoryMocks.ts
│   │   ├── localCliTool.test.ts
│   │   ├── localCliToolDefinitions.test.ts
│   │   ├── localShellCliTool.test.ts
│   │   ├── toolExecutor.test.ts
│   │   ├── toolRegistry.test.ts
│   │   └── toolResultFormatter.test.ts
│   └── tsconfig.json
├── tree.sh
├── tsconfig.json
├── turn-over-details.md +50
└── types/
```