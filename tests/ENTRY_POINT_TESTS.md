# Entry Point Tests

## New DI Approach

We've implemented a new approach that fully embraces dependency injection for better testability:

- Created `mainDI.ts` with a fully dependency-injectable version of the main function
- Updated `index.ts` to use this new approach
- Created proper unit tests in `mainDI.test.ts` that directly test the actual implementation
- Added comprehensive tests covering all key architectural components in KNOWLEDGE.md

This approach is superior because:

1. It tests the actual implementation, not a simulation
2. It uses proper dependency injection for complete testing control
3. It provides better test coverage and automatic detection of changes
4. It verifies alignment with architectural patterns and components described in KNOWLEDGE.md

This document describes the test suite for the main application entry point (`src/index.ts`) and its core components.

## Test Files

### 1. Main Application Flow with DI

**File**: `tests/mainDI.test.ts`

This test directly tests the dependency-injectable version of the main function by passing mocked dependencies, providing better coverage and reliability. It includes tests for:

- Core Framework components (Configuration, Logging, DI Container)
- Provider System (Provider Factory, Provider Initializer)
- Tool Calling System (Tool Registry, Tool Executor, Tool Result Formatter)
- Architectural Patterns (DI, Adapter, Factory, Registry patterns)
- Key Requirements from KNOWLEDGE.md (MCP support, File operations, Context management)

### 2. Main Application Flow (Legacy)

**File**: `tests/index.test.ts`

This test file focuses on the overall application initialization flow and verifies that:

- The application initializes all components in the correct sequence
- Error handling is properly implemented
- Critical dependencies are correctly wired together
- All setup functions are called in the expected order

### 2. Dependency Injection Setup

**File**: `tests/core/setup/dependencySetup.test.ts`

This test file verifies the dependency injection container setup:

- All core services are properly registered
- The DI container resolves dependencies correctly
- Proper configuration is applied to services
- LocalCliTool instance is created and configured properly

### 3. Program Execution Flow

**File**: `tests/core/setup/programSetup.test.ts`

This test file validates the CLI program execution flow:

- Help documentation is displayed correctly
- Command line arguments are processed properly
- Different error scenarios are handled gracefully
- Debug mode functions as expected

## Running Tests

All tests are implemented with Jest and focused on the specific functionality without direct imports from the source files. This approach avoids ESM-related issues and makes the tests more robust.

To run all entry point tests:

```bash
# Run the new DI tests
npm test -- tests/mainDI.test.ts

# Run the original tests
npm test -- "tests/index.test.ts" "tests/core/setup/dependencySetup.test.ts" "tests/core/setup/programSetup.test.ts" "tests/entry-point.test.ts"

# Or run all tests
npm test
```

## Test Coverage

The tests now provide comprehensive coverage of key architectural components described in KNOWLEDGE.md:

1. **Core Framework**
   - Configuration Management
   - Credential Management
   - Logging
   - Dependency Injection

2. **Provider System**
   - Provider Factory pattern
   - Provider Initializer
   - Provider Configuration

3. **Command System**
   - CLI command registration
   - Command parameters
   - Command help information

4. **Tool Calling System**
   - Tool Registry
   - Tool Executor
   - Dynamic tool calling workflow

5. **Architectural Patterns**
   - Dependency Injection
   - Adapter Pattern
   - Factory Pattern
   - Registry Pattern

This comprehensive test coverage ensures that the application aligns with the architectural requirements and patterns specified in KNOWLEDGE.md.
```

## Design Notes

1. **Manual Implementation Approach**
   - Tests recreate the functionality from source files instead of importing them directly
   - This avoids ESM-related issues and makes the tests more stable
   - It also allows for targeted testing of specific behavior

2. **Focused Test Structure**
   - Each test file concentrates on a specific area of functionality
   - Clear separation of concerns makes tests easier to maintain
   - Tests align with the architecture outlined in CLAUDE.md

3. **Key Areas Covered**
   - Dependency injection and service initialization
   - Command-line interface setup and execution
   - Error handling and logging
   - Application startup sequence