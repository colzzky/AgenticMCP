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
│   ├── MCP_MODE.md
│   └── TOOLS.md
├── eslint.config.js
├── examples/
│   └── mcp/
│       ├── anthropic-integration.js
│       ├── http-client.js
│       └── stdio-client.js
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
│   │   ├── mcpCommands.ts
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
│   │   │   ├── configManager.ts
│   │   │   └── index.ts
│   │   ├── credentials/
│   │   │   ├── credentialManager.ts
│   │   │   └── index.ts
│   │   ├── di/
│   │   │   ├── container.ts
│   │   │   ├── registry.ts
│   │   │   └── tokens.ts
│   │   ├── index.ts
│   │   ├── interfaces/
│   │   │   ├── diff-service.interface.ts
│   │   │   └── file-system.interface.ts
│   │   ├── services/
│   │   │   ├── diff.service.ts
│   │   │   └── file-system.service.ts
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
│   ├── di-setup.ts
│   ├── global.d.ts
│   ├── index.ts
│   ├── mcp/
│   │   ├── index.ts
│   │   ├── mcpServer.ts
│   │   ├── tools/
│   │   │   ├── index.ts
│   │   │   ├── roleBasedTools.ts
│   │   │   ├── roleHandlers.ts
│   │   │   ├── roleSchemas.ts
│   │   │   ├── xmlPromptUtils.ts
│   │   │   └── xmlPromptUtilsHelpers.ts
│   │   └── transports/
│   │       ├── httpTransport.ts
│   │       ├── index.ts
│   │       └── stdioTransport.ts
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
│   ├── tools/
│   │   ├── di-local-cli-tool.ts
│   │   ├── factory/
│   │   │   └── di-local-cli-tool-factory.ts
│   │   ├── localCliToolDefinitions.ts
│   │   ├── services/
│   │   │   └── diff-service.ts
│   │   ├── toolDefinitions.md
│   │   ├── toolEvents.ts
│   │   ├── toolExecutionFlow.md
│   │   ├── toolExecutionManager.ts
│   │   ├── toolExecutor.ts
│   │   ├── toolRegistry.ts
│   │   ├── toolResultFormatter.ts
│   │   └── utils/
│   │       └── diffUtils.ts
│   └── tsconfig.json
├── tests/
│   ├── CORE_SERVICES_TESTING.md
│   ├── ES_MODULE_TESTING.md
│   ├── SUMMARY.md
│   ├── TESTING_STRATEGY.md
│   ├── conversation/
│   │   └── conversationManager.test.ts
│   ├── core/
│   │   ├── config/
│   │   │   └── configManager.test.ts
│   │   ├── credentials/
│   │   │   └── credentialManager.test.ts
│   │   ├── di/
│   │   │   ├── container.test.ts
│   │   │   └── registry.test.ts
│   │   ├── services/
│   │   │   └── node-file-system.adapter.test.ts
│   │   └── utils/
│   │       ├── logger.test.ts
│   │       └── validation.test.ts
│   ├── examples/
│   │   ├── credentials-mock-example.test.ts
│   │   └── fs-mock-example.test.ts
│   ├── index.test.ts
│   ├── jest.setup.js
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
│   │       ├── openaiProvider.basic.test.ts
│   │       ├── openaiProvider.shared.test.ts
│   │       ├── openaiProvider.toolCalling.test.ts
│   │       └── openaiProviderTestUtils.ts
│   ├── tools/
│   ├── tsconfig.json
│   └── utils/
│       ├── ES_MODULE_TESTING.md
│       ├── config-manager-example.ts
│       ├── fs-keytar-mock-example.test.ts
│       ├── in-memory-filesystem.ts
│       ├── jest-mock-extended-patterns.md
│       ├── logger-module.ts
│       ├── mock-example-module.ts
│       ├── mock-example.test.ts
│       ├── service-module.ts
│       └── test-setup.ts
├── tree.sh
├── tsconfig.json
└── turn-over-details.md
```