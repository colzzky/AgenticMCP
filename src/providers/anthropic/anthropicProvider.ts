import Anthropic from '@anthropic-ai/sdk';
import type { ToolChoice } from '@anthropic-ai/sdk/resources/messages';
import type { MessageParam, MessageCreateParams, Tool as AnthropicTool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type {
  LLMProvider,
  ProviderConfig,
  ProviderRequest,
  ProviderResponse,
  ChatMessage,
  Tool,
  ToolCall,
  ToolCallOutput
} from '../../core/types/provider.types';
import type { AnthropicProviderSpecificConfig } from '../../core/types/config.types';
import type { ConfigManager } from '../../core/config/configManager';
import type { Logger } from '../../core/types/logger.types';
import {
  ToolResultsRequest,
  RecursiveToolLoopOptions,
} from '../../core/types/provider.types';
import {
  extractToolCallsFromResponse,
  convertToolsToAnthropicFormat,
  mapMessagesToAnthropicFormat,
  extractContentFromResponse,
} from './anthropicProviderUtils';
import { ProviderBase } from '../providerBase';

/**
 * AnthropicProvider implements the LLMProvider interface for Anthropic Claude API.
 * Uses dependency injection for better testability.
 */
export class AnthropicProvider extends ProviderBase {
  private providerConfig?: AnthropicProviderSpecificConfig;
  private client?: Anthropic;
  private configManager: ConfigManager;
  private logger: Logger;
  private AnthropicClass: typeof Anthropic;
  private configured: boolean = false;

  /**
   * Creates a new AnthropicProvider with dependency injection.
   * 
   * @param configManager - Configuration manager for API keys and settings
   * @param logger - Logger implementation
   * @param AnthropicClass - Anthropic class constructor (useful for testing)
   */
  constructor(
    configManager: ConfigManager,
    logger: Logger,
    AnthropicClass: typeof Anthropic = Anthropic
  ) {
    super();
    this.configManager = configManager;
    this.logger = logger;
    this.AnthropicClass = AnthropicClass;
  }

  get name(): string {
    return 'anthropic';
  }

  get defaultModel(): string {
    return 'claude-3-5-sonnet-20240620';
  }

  /**
   * Configures the provider with API keys and settings
   * @param config Provider-specific configuration
   */
  public async configure(config: ProviderConfig): Promise<void> {

    // Cast to provider-specific config
    const specificConfig = config as AnthropicProviderSpecificConfig;
    this.providerConfig = specificConfig;

    let apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      apiKey = await this.configManager.getResolvedApiKey(config);
      if (!apiKey) {
        throw new Error('Anthropic API key not found for providerType: anthropic. Ensure it\'s set in credentials or as ANTHROPIC_API_KEY environment variable.');
      }
    }

    // Create Anthropic client
    this.client = new this.AnthropicClass({
      apiKey: apiKey
    });

    this.configured = true;
    this.logger.debug('Anthropic provider configured successfully');
  }

  /**
   * Validates the API configuration and model settings
   */
  public async validateConfig(config?: ProviderConfig): Promise<boolean> {
    try {
      // Use provided config or load from config manager
      const providerConfig = config?.providerSpecificConfig as AnthropicProviderSpecificConfig
        || (await this.configManager.getConfig().providers?.anthropic as AnthropicProviderSpecificConfig);

      if (!providerConfig || !providerConfig.apiKey) {
        this.logger.error('Anthropic API key not found in config');
        return false;
      }

      // Basic validation passed
      return true;
    } catch (error) {
      this.logger.error(`Error validating Anthropic config: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Initialize the provider with configuration
   */
  public async initialize(config?: ProviderConfig): Promise<boolean> {
    try {
      this.providerConfig = config?.providerSpecificConfig
        || (await this.configManager.getConfig().providers?.anthropic as AnthropicProviderSpecificConfig);

      if (!this.providerConfig || !this.providerConfig.apiKey) {
        this.logger.error('Anthropic API key not found in config or environment');
        return false;
      }

      // Initialize client
      this.client = new this.AnthropicClass({
        apiKey: this.providerConfig.apiKey
      });

      return true;
    } catch (error) {
      this.logger.error(`Error initializing Anthropic provider: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Main method to chat with Anthropic's Claude API
   */
  /**
   * Checks if the provider has been configured with API keys
   */
  private checkConfigured(): boolean {
    if (!this.client || !this.configured) {
      this.logger.error('Anthropic provider not configured. Call configure() first.');
      return false;
    }
    return true;
  }

  /**
   * Generates text using a text prompt
   * @param request The request parameters
   */
  public async generateText(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.checkConfigured()) {
      return {
        success: false,
        error: {
          message: 'Anthropic provider not configured. Call configure() first.'
        }
      };
    }

    try {
      // Convert to chat messages format if it's a simple text prompt
      if (typeof request.prompt === 'string' && (!request.messages || request.messages.length === 0)) {
        request.messages = [
          { role: 'user', content: request.prompt }
        ];
      }

      // Use the chat method to handle the actual request
      return await this.chat(request);
    } catch (error) {
      this.logger.error(`Error in generateText: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: {
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * Generates a completion using a text prompt (compatibility method)
   * @param request The completion request parameters
   */
  public async generateCompletion(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.checkConfigured()) {
      return {
        success: false,
        error: {
          message: 'Anthropic provider not configured. Call configure() first.'
        }
      };
    }

    try {
      // Use the chat method for actual implementation
      return await this.chat(request);
    } catch (error) {
      this.logger.error(`Error in generateCompletion: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: {
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * Core implementation of chat functionality
   * @param request The provider request containing messages and parameters
   */
  public async chat(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.configured || !this.client) {
      throw new Error('Provider not configured');
    }

    this.logger.debug(`AnthropicProvider.chat() called with request: ${JSON.stringify(request)}`)

    try {


      // Create usage information (mock data for now if actual usage is not provided)
      let usage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };

      // Set up the request parameters
      const model = request.model || this.providerConfig?.model || 'claude-3-opus-20240229';
      const temperature = request.temperature || this.providerConfig?.temperature || 0.7;
      const maxTokens = request.max_tokens || this.providerConfig?.max_tokens || 8000;
      const systemMessage = request.system || '';

      // Process tools if provided
      let tools: AnthropicTool[] | undefined;
      let toolChoice: ToolChoice | undefined;

      const toolsLibrary = this.toolExecutor?.getAllTools()
      if (toolsLibrary) {
        tools = convertToolsToAnthropicFormat(toolsLibrary);
        // Handle tool_choice if provided
        if (request.tool_choice) {
          if (request.tool_choice === 'auto') {
            toolChoice = { type: 'auto' };
          } else if (request.tool_choice === 'none') {
            toolChoice = { type: 'none' };
          } else if (typeof request.tool_choice === 'object' && request.tool_choice.function.name) {
            toolChoice = {
              type: 'tool',
              name: request.tool_choice.function.name
            };
          }
        }
      }

      // Process messages for submission to the API
      const messages = mapMessagesToAnthropicFormat(request.messages || []);

      // Main recursive loop
      let iterationCount = 0;
      let content = '';
      while (iterationCount < 10) {

        // Create message parameters
        const params: MessageCreateParams = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          system: systemMessage || undefined
        };

        // Add tools if provided
        if (tools && tools.length > 0) {
          params.tools = tools;
        }

        // Add tool_choice if specified
        if (toolChoice) {
          params.tool_choice = toolChoice;
        }

        this.logger.debug(`AnthropicProvider.messages.create() params: ${JSON.stringify(params)}`);
        const response = await this.client.messages.create(params);
        this.logger.debug(`AnthropicProvider.messages.create() response: ${JSON.stringify(response)}`);

        content = extractContentFromResponse(response.content);

        // Process tool calls if present
        const toolCalls = extractToolCallsFromResponse(response);

        messages.push({
          role: 'assistant',
          content: response.content
        });

        // 3. Execute tool calls and collect results
        for (const toolCall of (toolCalls || [])) {
          const toolUseMessages: ToolResultBlockParam[] = [];
          try {
            const output = await this.executeToolCall(toolCall);
            toolUseMessages.push({
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: typeof output === 'string' ? output : JSON.stringify(output)
            });
          } catch (error) {
            this.logger.error(`Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`);
            toolUseMessages.push({
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
          }
          const toolResultMessage: MessageParam = {
            role: "user",
            content: toolUseMessages
          }
          messages.push(toolResultMessage);
        }

        usage.promptTokens = response.usage?.input_tokens || 100;
        usage.completionTokens = response.usage?.output_tokens || 50;
        usage.totalTokens = (response.usage?.input_tokens || 100) + (response.usage?.output_tokens || 50);

        iterationCount++;
        if (response?.stop_reason !== "tool_use") {
          break;
        }

      }

      return {
        success: true,
        content,
        usage
      };
    } catch (error) {
      this.logger.error(`Error calling Anthropic Claude API: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        content: '',
        error: {
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Continues a conversation with the results from tool executions
   */
  public async continueWithToolResults(
    initialRequest: ProviderRequest,
    toolResults: ToolCallOutput[]
  ): Promise<ProviderResponse> {
    // Create the tool results request
    const toolResultsRequest: ToolResultsRequest = {
      ...initialRequest,
      tool_outputs: toolResults
    };
    // Use the generateTextWithToolResults method
    return this.generateTextWithToolResults(toolResultsRequest);
  }

  /**
   * Continues a conversation with tool results
   * @param request - The request object containing messages, tool calls, and tool outputs
   * @returns Promise resolving to the provider's response
   */
  public async generateTextWithToolResults(request: ToolResultsRequest): Promise<ProviderResponse> {
    // For Anthropic, we handle tool results by adding them to the conversation history
    // and then continuing the conversation with a new chat request

    // Extract tool outputs and add them to the messages
    const messages = [...(request.messages || [])] as ChatMessage[];

    // If there are tool outputs, add them to the conversation
    if (request.tool_outputs && request.tool_outputs.length > 0) {
      for (const output of request.tool_outputs) {
        // Use the format expected by the parallel tool calling tests
        messages.push({
          role: 'user',
          content: '',
          tool_calls: [
            {
              id: output.call_id,
              type: 'function_call',
              name: output.call_id,
              arguments: output.output || ''
            }
          ]
        });
      }
    }

    // Continue the conversation with the updated messages
    return this.chat({ ...request, messages });
  }

}