/**
 * @file Tool Registry for managing LLM tool definitions
 * Provides a centralized registry for tool definitions that can be used by LLM providers
 */

import type { Tool } from '../core/types/provider.types';
import { LocalCliTool } from './localCliTool';
import type { Logger } from '../core/types/logger.types';
import { ToolDefinition } from './localCliTool';

/**
 * Registry for managing tool definitions that can be used by LLM providers
 */
export class ToolRegistry {
  private tools: Map<string, Tool>;
  private logger: Logger;

  /**
   * Creates a new ToolRegistry instance
   * @param logger - Logger instance for logging
   */
  constructor(logger: Logger) {
    this.tools = new Map<string, Tool>();
    this.logger = logger;
    this.logger.debug('ToolRegistry initialized');
  }

  /**
   * Registers a tool definition
   * @param tool - The tool definition to register
   * @returns True if the tool was registered successfully, false if a tool with the same name already exists
   * 
   * @example
   * ```typescript
   * const registry = new ToolRegistry(logger);
   * const tool = {
   *   type: 'function',
   *   name: 'get_weather',
   *   description: 'Gets the current weather for a location',
   *   parameters: {
   *     type: 'object',
   *     properties: {
   *       location: { type: 'string', description: 'The location to get weather for' }
   *     },
   *     required: ['location']
   *   }
   * };
   * registry.registerTool(tool);
   * ```
   */
  public registerTool(tool: Tool): boolean {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool with name '${tool.name}' already exists in registry`);
      return false;
    }

    this.tools.set(tool.name, tool);
    this.logger.debug(`Registered tool '${tool.name}'`);
    return true;
  }

  /**
   * Registers multiple tool definitions
   * @param tools - The tool definitions to register
   * @returns The number of tools successfully registered
   */
  public registerTools(tools: Tool[]): number {
    let successCount = 0;
    
    for (const tool of tools) {
      if (this.registerTool(tool)) {
        successCount++;
      }
    }
    
    this.logger.debug(`Registered ${successCount}/${tools.length} tools`);
    return successCount;
  }

  /**
   * Gets a tool definition by name
   * @param name - The name of the tool to get
   * @returns The tool definition, or undefined if not found
   */
  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Gets all registered tool definitions
   * @returns Array of all registered tool definitions
   */
  public getAllTools(): Tool[] {
    return [...this.tools.values()];
  }

  /**
   * Gets all registered tool definitions that match the specified filter
   * @param filter - Optional filter function to apply to tool definitions
   * @returns Array of matching tool definitions
   */
  public getTools(filter?: (tool: Tool) => boolean): Tool[] {
    const allTools = this.getAllTools();
    if (!filter) {
      return allTools;
    }
    return allTools.filter((tool) => filter(tool));
  }

  /**
   * Registers all tool definitions from a LocalCliTool instance
   * @param cliTool - The LocalCliTool instance to register tools from
   * @returns The number of tools successfully registered
   */
  public registerLocalCliTools(cliTool: LocalCliTool): number {
    const toolDefinitions = cliTool.getToolDefinitions();
    // Convert ToolDefinition[] to Tool[] format
    const tools: Tool[] = toolDefinitions.map(def => ({
      type: 'function',
      name: def.function.name,
      description: def.function.description,
      parameters: def.function.parameters as any
    }));
    return this.registerTools(tools);
  }

  /**
   * Validates that all registered tool definitions are compatible with the specified LLM provider
   * @param provider - The name of the LLM provider to validate against ('openai', 'anthropic', 'google')
   * @returns Object containing validation results
   */
  public validateToolsForProvider(provider: 'openai' | 'anthropic' | 'google'): { 
    valid: boolean; 
    invalidTools: string[];
    messages: string[];
  } {
    const invalidTools: string[] = [];
    const messages: string[] = [];
    
    // Provider-specific validation rules
    const validateForProvider = (tool: Tool): boolean => {
      let isValid = true;
      
      // Common validation for all providers
      if (!tool.name || !tool.type || !tool.parameters) {
        messages.push(`Tool '${tool.name || 'unnamed'}' is missing required fields`);
        isValid = false;
      }
      
      // Provider-specific validation
      switch (provider) {
        case 'openai': {
          // OpenAI requires 'function' type and parameters.type to be 'object'
          if (tool.type !== 'function') {
            messages.push(`Tool '${tool.name || 'unnamed'}' has invalid type for OpenAI: ${tool.type}`);
            isValid = false;
          }
          if (tool.parameters.type !== 'object') {
            messages.push(`Tool '${tool.name}' parameters must have type 'object' for OpenAI`);
            isValid = false;
          }
          break;
        }
        
        case 'anthropic': {
          // Anthropic has similar requirements to OpenAI
          if (tool.type !== 'function') {
            messages.push(`Tool '${tool.name}' has invalid type for Anthropic: ${tool.type}`);
            isValid = false;
          }
          if (tool.parameters.type !== 'object') {
            messages.push(`Tool '${tool.name}' parameters must have type 'object' for Anthropic`);
            isValid = false;
          }
          break;
        }
        
        case 'google': {
          // Google/Gemini has similar requirements but might have different constraints
          if (tool.type !== 'function') {
            messages.push(`Tool '${tool.name}' has invalid type for Google: ${tool.type}`);
            isValid = false;
          }
          if (tool.parameters.type !== 'object') {
            messages.push(`Tool '${tool.name}' parameters must have type 'object' for Google`);
            isValid = false;
          }
          break;
        }
      }
      
      return isValid;
    };
    
    // Validate all tools
    for (const tool of this.getAllTools()) {
      if (!validateForProvider(tool)) {
        invalidTools.push(tool.name);
      }
    }
    
    return {
      valid: invalidTools.length === 0,
      invalidTools,
      messages
    };
  }
}
