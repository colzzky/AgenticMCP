```markdown
.
├── AUDIT.md
├── CLAUDE.md
├── DIRECTORY.md
├── FIXED_TESTS.md
├── KNOWLEDGE.md
├── LICENSE
├── PROGRESS.jsonl
├── README.md
├── SHELL_TOOL_INTEGRATION.md
├── TASKS.jsonl
├── TESTING.md
├── commands/
│   └── turnover.txt
├── context/
│   ├── README.md
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
│   │   │   ├── file-keytar/
│   │   │   │   ├── crypto-service.ts
│   │   │   │   ├── file-keytar.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces.ts
│   │   │   │   ├── key-management.ts
│   │   │   │   └── storage-service.ts
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
│   ├── index.ts
│   ├── mainDI.ts
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
│   │   │   ├── openaiProviderMappers.ts
│   │   │   └── openaiProviderUtils.ts
│   │   ├── providerFactory.ts
│   │   ├── providerInitializer.ts
│   │   ├── providerModuleFactory.ts
│   │   └── types.ts
│   ├── tools/
│   │   ├── factory/
│   │   │   ├── localCliToolFactory.ts
│   │   │   └── unifiedShellToolFactory.ts
│   │   ├── fileSystemTool.ts
│   │   ├── fileSystemToolDefinitions.ts
│   │   ├── localShellCliTool.ts
│   │   ├── localShellCliToolDefinitions.ts
│   │   ├── services/
│   │   │   └── diffService.ts
│   │   ├── shellCommandWrapper.ts
│   │   ├── toolExecutor.ts
│   │   ├── toolRegistry.ts
│   │   ├── toolResultFormatter.ts
│   │   ├── unifiedShellCliTool.ts
│   │   └── unifiedShellToolDefinition.ts
│   ├── tsconfig.json
│   └── types/
│       ├── global.types.ts
│       ├── shell.types.d.ts
│       ├── shell.types.js
│       └── shell.types.ts
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
│   │   │   ├── credentialManager.test.ts
│   │   │   └── file-keytar/
│   │   │       ├── crypto-service.test.ts
│   │   │       └── file-keytar.test.ts
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
│   │       ├── logger.test.ts
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
│   │       ├── roleBasedTools.test.ts
│   │       ├── roleHandlers.test.ts
│   │       ├── roleSchemas.test.ts
│   │       ├── xmlPromptUtils.test.ts
│   │       └── xmlPromptUtilsHelpers.test.ts
│   ├── providers/
│   │   ├── anthropic/
│   │   │   ├── anthropicProvider.test.ts
│   │   │   ├── anthropicProvider.toolCalling.test.ts
│   │   │   └── anthropicProviderParallelToolCalling.test.ts
│   │   ├── environmentVariables.test.ts
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
│   │   │   ├── localCliToolFactory.test.ts
│   │   │   └── unified-shell-cli-tool-factory.test.ts
│   │   ├── fileSystemTool.test.ts
│   │   ├── fileSystemToolDefinitions.test.ts
│   │   ├── localShellCliTool.test.ts
│   │   ├── localShellCliToolDefinitions.test.ts
│   │   ├── services/
│   │   │   └── diffService.test.ts
│   │   ├── shellCommandWrapper.test.ts
│   │   ├── toolExecutor.test.ts
│   │   ├── toolRegistry.test.ts
│   │   ├── toolResultFormatter.test.ts
│   │   ├── unifiedShellCliTool.test.ts
│   │   └── unifiedShellToolDefinition.test.ts
│   └── tsconfig.json
├── tree.sh
└── tsconfig.json
```