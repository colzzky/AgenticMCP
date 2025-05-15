# AgenticMCP CLI

[![Open Source](https://img.shields.io/badge/Open%20Source-MIT-green.svg)](LICENSE)

## Overview

AgenticMCP (Agentic Model Communication Protocol) is an open source TypeScript-based command-line interface (CLI) tool that enables users to leverage various Large Language Models (LLMs) as predefined agents with specific roles and contexts. It provides a unified, extensible, and secure interface for interacting with LLM providers such as OpenAI, Anthropic, Google, and more.

## Features
- Unified CLI for multiple LLM providers
- Predefined agent commands with role-based context
- Secure credential management (keytar integration)
- Tool system for file/code operations and shell integration
- Modular, testable architecture with dependency injection
- Cross-platform (Linux, macOS, Windows)

## Installation

```bash
npm install -g agenticmcp
```

## Usage

```bash
# List available agent commands
agenticmcp --help

# Run a writer agent with file context
agenticmcp writer requirements.txt

# Use multiple files or directories as context
agenticmcp analyst report1.pdf data.csv
agenticmcp summarizer ./docs/

# Start as an MCP server for tool-based AI workflows
agenticmcp serve:mcp --provider openai
```

See [REQUIREMENTS.md](REQUIREMENTS.md) for detailed CLI examples and advanced usage.

## Architecture

- **Core Framework:** Configuration, credentials, type system, and logging
- **Provider System:** Factory pattern for LLM providers (OpenAI, Anthropic, Google, Grok)
- **Command System:** Decorator-based registry for agent commands
- **Context Management:** File/directory context ingestion, token optimization
- **Tool System:** Registry and executor for tool calls, shell/file operations
- **Conversation Management:** Multi-turn session state, tool call integration

See [KNOWLEDGE.md](KNOWLEDGE.md) for a detailed architecture analysis.

## Security
- Credentials stored securely via keytar in the OS keychain
- API keys resolved from env, config, or keychain (see REQUIREMENTS.md)
- Data protection, error handling, and privacy controls

## Contributing
Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) if available, or open an issue/pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
