# Business Requirements Document: AgenticMCP CLI

## Executive Summary

AgenticMCP (Agentic Model Communication Protocol) is a TypeScript-based command-line interface (CLI) tool that enables users to leverage various Large Language Models (LLMs) as predefined agents with specific roles and contexts. The system provides a simple terminal interface to interact with multiple LLM providers (such as OpenAI, Anthropic, Google, etc.) through a set of command-based agents, each with predetermined roles, system prompts, model configurations, and capabilities. Users need only provide the context relevant to their specific task, making complex LLM interactions accessible through simple command-line operations.

## Business Objectives

1. Create a user-friendly CLI tool for accessing predefined LLM-powered agents
2. Enable easy integration with multiple LLM providers through a command-based interface
3. Provide a library of preconfigured agent roles with optimized system prompts
4. Simplify LLM interactions by requiring only context input from users
5. Facilitate efficient task completion through specialized command agents
6. Support installation across different environments with minimal dependencies

## Stakeholders

- **Development Teams**: Engineers building AI-powered applications
- **AI/ML Operations Teams**: Teams managing LLM deployments and costs
- **Business Units**: Departments utilizing AI agents for specific business functions
- **End Users**: Individuals interacting with deployed agents
- **LLM Provider Partners**: Third-party services providing the foundational models

## Project Scope

### In Scope

1. **CLI Tool Development**:
   - TypeScript-based command-line interface
   - Installable package via npm
   - Command discovery and help documentation
   - Configuration file management

2. **Predefined Agent Commands**:
   - Library of specialized command agents with specific roles
   - Optimized system prompts for different use cases
   - Command parameter standardization
   - Command execution and output formatting

3. **LLM Provider Integration**:
   - Adapters for major LLM providers (OpenAI, Anthropic, Google, etc.)
   - Unified model parameter configuration
   - Provider-specific optimizations and features
   - Fallback and redundancy mechanisms

4. **Context Management**:
   - Methods to inject user-provided context into predefined agents
   - File and directory input support
   - Context window optimization strategies
   - Context preprocessing and formatting

5. **Local Execution Environment**:
   - Local history and cache management
   - Session management for continued conversations
   - Local storage of configurations and credentials
   - Output export capabilities (text, markdown, JSON)

6. **Packaging and Distribution**:
   - Node.js package with minimal dependencies
   - Cross-platform support (Linux, macOS, Windows)
   - NPM ecosystem compatibility
   - Installation documentation

### Out of Scope

1. Web or GUI interfaces
2. Server deployment features
3. Training or fine-tuning of underlying models
4. Non-LLM AI capabilities (computer vision, audio processing, etc.)
5. Multi-user authentication systems
6. Direct billing integration with LLM providers

## Functional Requirements

### CLI Tool Requirements

1. **Command-Line Interface**
   - FR1.1: Provide a TypeScript-based CLI tool installable via npm
   - FR1.2: Support command discovery with help documentation
   - FR1.3: Enable configuration via config files and environment variables
   - FR1.4: Implement proper error handling and user feedback

2. **Command Structure**
   - FR2.1: Implement a consistent command structure (agenticmcp [agent-command] [options])
   - FR2.2: Support common flags across all commands (--verbose, --output, etc.)
   - FR2.3: Enable both interactive and non-interactive mode
   - FR2.4: Provide comprehensive command documentation and examples

3. **Output Formatting**
   - FR3.1: Support multiple output formats (text, markdown, JSON)
   - FR3.2: Enable streaming output for long-running operations
   - FR3.3: Implement progress indicators for ongoing processes
   - FR3.4: Support pagination for large outputs

4. **Configuration Management**
   - FR4.1: Implement secure storage for API keys and credentials
     - The AgenticMCP CLI utilizes the `keytar` library to securely store and retrieve API keys for LLM providers.
     - API keys are stored in the operating system's native credential store (e.g., macOS Keychain, Freedesktop Secret Service on Linux, Windows Credential Manager), rather than in plaintext configuration files.
     - **Configuration Precedence for API Keys**:
         - If an `api_key` is explicitly defined for a provider instance in your `config.json` file, that key will be used.
         - If the `api_key` field is *missing or left empty* in `config.json`, the CLI will attempt to retrieve it from the system's keychain.
         - The keychain service name used is `agenticmcp_cli`.
         - The account name (or username) in the keychain is structured as `provider_type-instance_name` (e.g., `openai-my_personal_account`, `anthropic-work_key`).
     - **Prerequisites**: To use this feature, users must have `keytar` properly installed, which may require additional system dependencies depending on the OS.
     - **Managing Stored Credentials**: CLI commands (e.g., `agenticmcp credentials set ...`, `agenticmcp credentials delete ...`) will be provided in a future update to allow users to easily manage these stored API keys.
   - FR4.2: Support default configurations with user overrides
   - FR4.3: Enable environment-specific configuration profiles
   - FR4.4: Provide configuration validation and troubleshooting

### Predefined Agent Commands

1. **Command Library**
   - FR5.1: Provide a rich library of predefined agent commands
   - FR5.2: Categorize commands by function (writing, coding, analysis, etc.)
   - FR5.3: Ensure each command uses an appropriate LLM and configuration
   - FR5.4: Support command aliases for common use cases

2. **Role Definitions**
   - FR6.1: Implement optimized system prompts for each agent command
   - FR6.2: Define clear purposes and capabilities for each command
   - FR6.3: Document command limitations and best use cases
   - FR6.4: Ensure consistent behavior across similar commands

3. **Context Input**
   - FR7.1: Support multiple context input methods (files, directories, stdin)
   - FR7.2: Enable context preprocessing for different input types
   - FR7.3: Implement context window management to optimize token usage
   - FR7.4: Support context caching for repeated command execution

4. **Command State Management**
   - FR8.1: Implement conversation history for multi-turn interactions
   - FR8.2: Support saving and loading of command session states
   - FR8.3: Enable command chaining and piping between commands
   - FR8.4: Provide mechanisms to reset command state when needed

5. **Command Discovery**
   - FR9.1: Implement comprehensive help system for command discovery
   - FR9.2: Support command suggestions based on user input
   - FR9.3: Enable searching and filtering of available commands
   - FR9.4: Provide detailed documentation for each command

### LLM Provider Integration Requirements

1. **Provider Adapters**
   - FR10.1: Create adapters for major LLM providers (OpenAI, Anthropic, Google, etc.)
   - FR10.2: Support provider-specific features and parameters
   - FR10.3: Implement standardized error handling across providers
   - FR10.4: Enable custom adapter creation for new providers
   - FR10.5: Implement support for tool calling (function calling) capabilities offered by providers

2. **Unified Configuration**
   - FR11.1: Provide a unified parameter schema across different providers
   - FR11.2: Support model-specific parameter validation
   - FR11.3: Enable provider-specific optimizations
   - FR11.4: Implement parameter mapping between providers for easier switching

3. **Provider Management**
   - FR12.1: Support multiple API keys for the same provider
   - FR12.2: Implement provider health checking and status monitoring
   - FR12.3: Enable cost tracking and quota management
   - FR12.4: Provide usage analytics per provider

4. **Fallback Mechanisms**
   - FR13.1: Support automatic fallback to alternative providers on failure
   - FR13.2: Implement retry strategies with configurable parameters
   - FR13.3: Enable load balancing across multiple instances of the same provider
   - FR13.4: Provide circuit breaker patterns for failing providers

### Context Management Requirements

1. **Knowledge Ingestion**
   - FR14.1: Support ingestion of text documents for context building
   - FR14.2: Enable structured data integration (JSON, CSV, etc.)
   - FR14.3: Implement chunking strategies for large documents
   - FR14.4: Support metadata assignment to knowledge chunks

2. **Context Optimization**
   - FR15.1: Implement context window management to maximize token efficiency
   - FR15.2: Support context compression techniques
   - FR15.3: Enable context prioritization strategies
   - FR15.4: Provide mechanisms to refresh stale context

3. **Knowledge Retrieval**
   - FR16.1: Support vector database integration for retrieval
   - FR16.2: Implement relevance scoring for retrieved context
   - FR16.3: Enable hybrid retrieval strategies
   - FR16.4: Support query reformulation for improved retrieval

4. **Context Persistence**
   - FR17.1: Implement storage of agent contexts
   - FR17.2: Support versioning of context data
   - FR17.3: Enable context sharing across agents
   - FR17.4: Provide export and import functionality for contexts

### Command Interaction Requirements

1. **Input/Output Handling**
   - FR18.1: Define standard input/output formats for all commands
   - FR18.2: Support multiple input sources (files, stdin, arguments)
   - FR18.3: Enable option for structured output (JSON, YAML)
   - FR18.4: Implement input validation mechanisms

2. **Command Chaining**
   - FR19.1: Create mechanisms for piping output between commands
   - FR19.2: Support command composition for complex workflows
   - FR19.3: Implement intermediate result storage for multi-step processes
   - FR19.4: Enable conditional execution based on command results

3. **Session Management**
   - FR20.1: Track and persist command execution histories
   - FR20.2: Support session context maintenance across invocations
   - FR20.3: Implement interactive session management
   - FR20.4: Enable session export and import

4. **Tool Integration**
   - FR21.1: Support integration with local tools and utilities
   - FR21.2: Implement file system operations for context and output
   - FR21.3: Enable network operations for additional context gathering
   - FR21.4: Support execution of shell commands when appropriate

## Non-Functional Requirements

### Performance Requirements

1. **Responsiveness**
   - NFR1.1: Minimize additional latency over direct LLM provider calls (<100ms overhead)
   - NFR1.2: Ensure CLI startup time is under 1 second
   - NFR1.3: Implement efficient context processing to reduce wait times
   - NFR1.4: Provide configurable timeout mechanisms

2. **Resource Usage**
   - NFR2.1: Minimize memory footprint for CLI operations
   - NFR2.2: Enable efficient processing of large context files
   - NFR2.3: Implement smart caching for frequently used data
   - NFR2.4: Support operations on resource-constrained systems

3. **Compatibility**
   - NFR3.1: Support all major operating systems (Linux, macOS, Windows)
   - NFR3.2: Ensure compatibility with Node.js 16.x+
   - NFR3.3: Implement resource-efficient dependency management
   - NFR3.4: Support various terminal environments and shells

### Security Requirements

1. **Data Protection**
   - NFR4.1: Ensure secure handling of sensitive context data
   - NFR4.2: Support secure storage of API keys and credentials
   - NFR4.3: Enable data masking for sensitive information
   - NFR4.4: Implement proper data sanitization for inputs and outputs

2. **Local Security**
   - NFR5.1: Store credentials with appropriate filesystem permissions
   - NFR5.2: Implement audit logging for command execution
   - NFR5.3: Enable secure deletion of sensitive temporary files
   - NFR5.4: Support encrypted configuration files

3. **Compliance**
   - NFR6.1: Maintain compliance with data protection regulations
   - NFR6.2: Support local data retention and deletion options
   - NFR6.3: Implement privacy controls and data minimization
   - NFR6.4: Provide transparency about data sent to LLM providers

### Reliability Requirements

1. **Robustness**
   - NFR7.1: Design for graceful handling of network issues
   - NFR7.2: Implement resilient error handling for all commands
   - NFR7.3: Support offline operation for previously cached data
   - NFR7.4: Enable fallback options for provider outages

2. **Resilience**
   - NFR8.1: Implement circuit breakers for external dependencies
   - NFR8.2: Support automatic recovery from common failure scenarios
   - NFR8.3: Enable session recovery after interruptions
   - NFR8.4: Implement proper exception handling throughout the system

3. **Data Durability**
   - NFR9.1: Ensure persistence of user configurations and history
   - NFR9.2: Support backup and restore mechanisms for command history
   - NFR9.3: Implement data validation to prevent corruption
   - NFR9.4: Enable recovery of interrupted command executions

### Operational Requirements

1. **Usability**
   - NFR10.1: Implement intuitive command interfaces
   - NFR10.2: Support progressive disclosure of command complexity
   - NFR10.3: Provide helpful error messages and suggestions
   - NFR10.4: Enable customization of CLI behavior

2. **Maintainability**
   - NFR11.1: Follow TypeScript best practices and coding standards
   - NFR11.2: Maintain comprehensive documentation
   - NFR11.3: Support easy configuration management
   - NFR11.4: Enable plugin architecture for extensibility

3. **Installation & Updates**
   - NFR12.1: Support standard npm package installation
   - NFR12.2: Minimize external dependencies
   - NFR12.3: Enable auto-update capabilities
   - NFR12.4: Support global and local package installation

## System Interfaces

1. **External Interfaces**
   - LLM Provider APIs (OpenAI, Anthropic, Google, etc.)
   - Local filesystem for context input and output
   - Terminal/console for user interaction
   - Configuration files for persistent settings

2. **Internal Interfaces**
   - Command Registry System
   - Context Processing System
   - Provider Adapter Framework
   - Session Management System

## Package Dependencies

1. **Core Dependencies**
   - `commander`: For CLI command structure and argument parsing
   - `chalk` or `colorette`: For terminal formatting and output styling
   - `inquirer`: For interactive prompts and input gathering
   - `conf`: For configuration file management
   - `dotenv`: For environment variable management

2. **LLM Provider SDKs**
   - `openai`: For OpenAI API integration
   - `@anthropic-ai/sdk`: For Anthropic Claude API integration
   - `@google-ai/generativelanguage`: For Google Gemini API integration
   - Custom clients for other LLM providers

3. **Utility Dependencies**
   - `js-tiktoken` or similar: For token counting and context management
   - `keytar`: For secure credential storage
   - `table`: For structured output formatting
   - `ora`: For spinners and progress indicators
   - `fs-extra`: For extended file system operations

4. **Development Dependencies**
   - `typescript`: For TypeScript compilation
   - `jest` or `mocha`: For unit testing
   - `eslint`: For code quality and style checking
   - `prettier`: For code formatting
   - `esbuild` or `webpack`: For bundling

## Integration Requirements

1. **Shell Integration**
   - Command completion for shells (bash, zsh, fish)
   - Integration with shell pipes and redirects
   - Support for environment variables
   - Man pages and help documentation

2. **Third-Party Integrations**
   - LLM provider integrations
   - Local editor integration capabilities
   - Version control system awareness
   - Common developer tool integration

## Implementation Phases

### Phase 1: Core CLI Framework
- Basic command-line interface
- Initial LLM provider integrations (OpenAI, Anthropic)
- Configuration management and API key storage
- Essential command implementations

### Phase 2: Command Library Expansion
- Expanded predefined agent commands
- Enhanced context handling for different input types
- Output formatting and export options
- Session management capabilities

### Phase 3: Advanced User Experience
- Command chaining and piping
- Interactive mode improvements
- Advanced error handling and feedback
- Performance optimizations

### Phase 4: Ecosystem Expansion
- Additional provider integrations
- Plugin architecture for custom commands
- Integration with developer workflows
- Extended documentation and examples

## Acceptance Criteria

1. AgenticMCP CLI can be installed via npm with minimal dependencies
2. Predefined agent commands execute successfully with appropriate contexts
3. Commands successfully communicate with underlying LLM providers
4. Context can be provided via files, directories, or standard input
5. Command output can be formatted and exported in different formats
6. System meets performance and security requirements
7. Command documentation is complete and accessible via help system
8. CLI operates consistently across different operating systems

## Technical Constraints

- Node.js 16.x+ compatibility required
- Must support major operating systems (Linux, macOS, Windows)
- Should minimize external dependencies where possible
- Must ensure secure handling of API keys and credentials
- Package size should be kept under 10MB (excluding dependencies)

## Glossary

- **AgenticMCP**: Agentic Model Communication Protocol
- **LLM**: Large Language Model
- **Command**: A predefined agent with specific role, model, and capabilities
- **Provider**: A service offering LLM capabilities (OpenAI, Anthropic, etc.)
- **Context**: The user-provided information or data for the command to process
- **Role**: The specific function, personality, or purpose assigned to a command
- **System Prompt**: Predefined instructions that shape the behavior of a command

# AgenticMCP CLI File Context Examples

Below are examples of how to use the AgenticMCP CLI with file-based context. The examples demonstrate how the CLI can ingest file contents as context for various agent commands.

## Basic File Context Examples

### Single File Context

```bash
# Use a single file as context
$ agenticmcp writer requirements.txt

# The above command will:
# 1. Read the contents of requirements.txt
# 2. Send the contents to the writer agent as context
# 3. The writer agent will generate content based on the file contents
```

### Multiple File Context

```bash
# Use multiple files as context
$ agenticmcp analyst financial_report.pdf quarterly_data.csv

# The above command will:
# 1. Read both files (with appropriate parsers for each file type)
# 2. Send the combined contents to the analyst agent
# 3. The analyst agent will analyze both documents together
```

### Directory Context

```bash
# Use all files in a directory as context
$ agenticmcp summarizer ./project_documentation/

# The above command will:
# 1. Recursively read all files in the project_documentation directory
# 2. Send the contents to the summarizer agent
# 3. The summarizer agent will generate a summary of all documents
```

## Advanced File Context Usage

### Specifying File Context with an Explicit Flag

```bash
# Use --context flag to explicitly specify context files
$ agenticmcp writer --context background_info.txt "Write a blog post about quantum computing"

# You can specify multiple context files
$ agenticmcp researcher --context paper1.pdf --context paper2.pdf "Analyze these research papers"
```

### Context Directory with Filtering

```bash
# Use only specific file types from a directory as context
$ agenticmcp coder --context-type ts,js ./src/

# Exclude specific files or patterns
$ agenticmcp summarizer --exclude "*.log,temp_*" ./project_files/
```

### Context Processing Options

```bash
# Specify how the context should be processed
$ agenticmcp writer --context-format raw data.txt

# Chunk large files for better processing
$ agenticmcp analyst --chunk-size 2000 large_document.pdf

# Process structured data appropriately
$ agenticmcp analyst --structured-data sales_data.csv
```

## Task-Specific File Context Examples

### Code Generation with Requirements File

```bash
# Generate code based on requirements document
$ agenticmcp coder --output app.ts requirements.txt

# This reads requirements.txt and generates TypeScript code in app.ts
```

### Document Analysis with Multiple Files

```bash
# Analyze multiple related documents
$ agenticmcp analyst --task compare financial_2023.pdf financial_2024.pdf

# This compares the contents of both PDF files
```

### Content Summarization

```bash
# Summarize a long document
$ agenticmcp summarizer --length short long_report.pdf

# This creates a concise summary of the PDF file
```

### Translation with Context File

```bash
# Translate document with terminology glossary
$ agenticmcp translator --from en --to fr --context terminology.csv document.txt

# This translates document.txt using terminology.csv as reference
```

## Combining File Context and Command-Line Input

```bash
# Process a file in the context of a specific question
$ agenticmcp analyst "What are the key financial trends?" annual_report.pdf

# This will analyze annual_report.pdf specifically for financial trends
```

## Working with Special File Types

### Processing Code Files

```bash
# Generate documentation for code files
$ agenticmcp writer --task document --output docs.md source_code.ts

# This creates documentation based on the TypeScript source code
```

### Analyzing Data Files

```bash
# Analyze CSV data
$ agenticmcp analyst --task insights sales_data.csv

# This generates insights from the CSV file
```

### Processing Configuration Files

```bash
# Explain configuration
$ agenticmcp explain config.json

# This explains what the configuration file does
```

## Using Context From Standard Input

```bash
# Pipe file content to AgenticMCP
$ cat document.txt | agenticmcp summarizer

# Use here document for context
$ agenticmcp writer << EOF
This is some text that I want to use as context.
It can span multiple lines.
EOF

# Combine piped content with file context
$ cat instructions.txt | agenticmcp coder --context codebase.ts
```

## Context Management Features

### Caching Context

```bash
# Cache context for repeated use
$ agenticmcp writer --cache-context project_files.txt

# Use previously cached context
$ agenticmcp writer --use-cached-context "Write a different version"
```

### Context Preprocessing

```bash
# Preprocess context before sending to agent
$ agenticmcp writer --preprocess extract_key_points document.pdf

# Clean up context before processing
$ agenticmcp analyst --preprocess clean_data raw_data.csv
```

### Context Metadata

```bash
# Include metadata about the context file
$ agenticmcp analyst --include-metadata financial_data.xlsx

# The above command will include file metadata like creation date, size, etc.
```

## Complex Context Scenarios

### Multi-Stage Context Processing

```bash
# Process context through multiple stages
$ agenticmcp researcher --context paper.pdf | agenticmcp writer --style academic > research_summary.md

# This first analyzes the paper and then generates an academic summary
```

### Context Merging

```bash
# Merge multiple context sources with different weights
$ agenticmcp writer --context main.txt --context-weight 0.8 --context reference.txt --context-weight 0.2

# This uses both files as context but gives more importance to main.txt
```

### Context Augmentation

```bash
# Augment file context with additional information
$ agenticmcp analyst --context data.csv --augment-with related_terms.txt "Analyze market trends"

# This uses the CSV as primary context but enhances it with related terms
```

## Tool System

AgenticMCP includes a robust tool system that allows LLMs to interact with external tools and data sources. This feature enables the integration of specialized tools and services, enhancing the capabilities of the LLM agents.

### Available Tools

- **File System Operations**: read_file, write_file, create_directory, delete_file, etc.
- **Code and Codebase Tools**: search_codebase, find_files, etc.

### Using Tools

Tools can be accessed in various ways:

```bash
# List all available tools
agenticmcp tools list

# Execute a specific tool
agenticmcp tools execute read_file --args '{"path": "./example.txt"}'
```

For more information on the tool system, see [Tool System Documentation](docs/TOOLS.md).

## MCP Mode with Role-Based AI Tools

AgenticMCP can now run as a Model Context Protocol (MCP) server, providing role-based AI tools like "coder", "qa", "analyst", and more through the standardized MCP protocol. This allows other applications to leverage AgenticMCP's LLM capabilities for specialized tasks.

### Starting MCP Server

```bash
# Start with stdio transport (for piping to other processes)
agenticmcp serve-mcp --provider anthropic

# Start with HTTP transport (for web clients)
agenticmcp serve-mcp --transport http --port 3000 --provider openai
```

Available role-based tools include:
- `coder`: Expert software developer for code generation and analysis
- `qa`: Quality assurance specialist for testing and validation
- `project_manager`: Planning and organization expert
- `cpo`: Chief Product Officer for product strategy
- `ui_ux`: User interface and experience designer
- `summarizer`: Content summary specialist
- `rewriter`: Content improvement expert
- `analyst`: Data pattern analysis expert
- `custom`: Define your own custom role

Each role has full access to file operations (within a secure base_path) and can read, write, search, and manipulate files as needed to complete its tasks.

For detailed documentation on MCP mode, see [MCP Mode Documentation](docs/MCP_MODE.md).

These examples demonstrate the various ways to use AgenticMCP, allowing users to provide rich context information to the underlying LLM agents and leverage specialized AI roles through the MCP protocol.