/**
 * @file Dependency injection tokens
 * These tokens identify dependencies in the DI container
 */

export const DI_TOKENS = {
  // Core services
  FILE_SYSTEM: 'core:fileSystem',
  LOGGER: 'core:logger',
  CONFIG_MANAGER: 'core:configManager',
  
  // File processing
  FILE_PATH_PROCESSOR: 'context:filePathProcessor',

  // Providers
  PROVIDER_FACTORY: 'providers:factory',
  OPENAI_PROVIDER: 'providers:openai',
  ANTHROPIC_PROVIDER: 'providers:anthropic',

  // Tools
  TOOL_REGISTRY: 'tools:registry',
  LOCAL_CLI_TOOL: 'tools:localCliTool',
  TOOL_EXECUTOR: 'tools:executor',
};
