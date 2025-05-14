import Anthropic from '@anthropic-ai/sdk';
import type { ToolChoice } from '@anthropic-ai/sdk/resources/messages';
import type { MessageParam, MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';
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
import { ToolResultsRequest } from '../../core/types/provider.types';

/**
 * AnthropicProvider implements the LLMProvider interface for Anthropic Claude API.
 * Uses dependency injection for better testability.
 */
export class AnthropicProvider implements LLMProvider {
  private providerConfig?: AnthropicProviderSpecificConfig;
  private client?: Anthropic;
  private configManager: ConfigManager;
  private logger: Logger;
  private AnthropicClass: typeof Anthropic;

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
    this.configManager = configManager;
    this.logger = logger;
    this.AnthropicClass = AnthropicClass;
  }

  /**
   * Converts our generic Tool interface to Anthropic's tool format
   */
  private convertToolsToAnthropicFormat(tools?: Tool[]): any[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required || []
      }
    }));
  }

  /**
   * Extracts tool calls from Anthropic response content blocks
   */
  private extractToolCallsFromResponse(content: any[]): ToolCall[] | undefined {
    if (!content || content.length === 0) {
      return undefined;
    }

    const toolCalls: ToolCall[] = [];

    for (const block of content) {
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          call_id: block.id,
          type: 'function_call',
          name: block.name,
          arguments: JSON.stringify(block.input)
        });
      }
    }

    return toolCalls.length > 0 ? toolCalls : undefined;
  }

  /**
   * Extracts text content from Anthropic response content blocks
   */
  private extractTextFromContentBlocks(content: any[]): string {
    if (!content || content.length === 0) {
      return '';
    }

    const textBlocks = content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''));

    return textBlocks.join(' ');
  }

  get name(): string {
    return 'anthropic';
  }

  /**
   * Executes a tool call and returns the result
   */
  public async executeToolCall(toolCall: ToolCall, availableTools?: Record<string, Function>): Promise<string> {
    if (!availableTools) {
      throw new Error('No tools available to execute');
    }

    const { name, arguments: argsStr } = toolCall;
    const toolFunction = availableTools[name];

    if (!toolFunction) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      // Parse the arguments string to an object
      const args = JSON.parse(argsStr);

      // Execute the function with the parsed arguments
      const result = await toolFunction(args);

      // Convert the result to a string if it's not already
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error_: unknown) {
      const errorMessage = error_ instanceof Error ? error_.message : String(error_);
      this.logger.error(`Error executing tool call ${name}: ${errorMessage}`);
      return JSON.stringify({ error: errorMessage });
    }
  }

  /**
   * Configures the AnthropicProvider with API keys and settings.
   * Uses ConfigManager to resolve API key.
   */
  async configure(config: AnthropicProviderSpecificConfig): Promise<void> {
    this.providerConfig = config;
    
    // Get API key from ConfigManager instead of direct environment access
    const apiKey = await this.configManager.getResolvedApiKey(config);
    
    if (!apiKey) {
      throw new Error(`Anthropic API key not found for providerType: ${config.providerType}`);
    }
    
    this.client = new this.AnthropicClass({ apiKey });
    this.logger.info(`AnthropicProvider configured for instance ${config.instanceName || 'default'}`);
  }

  /**
   * Handles chat requests with Anthropic API.
   */
  async chat(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      throw new Error('AnthropicProvider not configured. Call configure() first.');
    }
    
    try {
      const model = request.model || this.providerConfig.model || 'claude-3-5-sonnet-latest';
      const max_tokens = request.maxTokens || this.providerConfig.maxTokens || 1024;

      // Process complex messages with tool calls
      const processedMessages: any[] = [];

      if (request.messages) {
        for (const msg of request.messages) {
          if (msg.role !== 'user' && msg.role !== 'assistant') {
            continue; // Skip system roles for now (could be handled in a system parameter)
          }

          // Handle simple text messages
          if (!('tool_calls' in msg) && !('tool_call_id' in msg)) {
            processedMessages.push({
              role: msg.role,
              content: msg.content
            });
            continue;
          }

          // Handle assistant messages with tool calls
          if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
            const contentBlocks: any[] = [];

            // Add any text content
            if (msg.content) {
              contentBlocks.push({
                type: 'text',
                text: msg.content
              });
            }

            // Add tool use blocks for each tool call
            const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
            for (const toolCall of toolCalls) {
              contentBlocks.push({
                type: 'tool_use',
                id: toolCall.id,
                name: toolCall.name,
                input: JSON.parse(toolCall.arguments)
              });
            }

            processedMessages.push({
              role: 'assistant',
              content: contentBlocks
            });
            continue;
          }

          // Handle tool results from the user
          if (msg.role === 'user' && 'tool_call_id' in msg && msg.tool_call_id) {
            processedMessages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: msg.tool_call_id,
                  content: msg.content
                }
              ]
            });
            continue;
          }

          // Default case - just add the message as is
          processedMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // Build the params for the Anthropic API
      const params: Anthropic.Messages.MessageCreateParams = {
        model,
        max_tokens,
        messages: processedMessages,
        temperature: request.temperature || this.providerConfig.temperature,
      };

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        params.tools = this.convertToolsToAnthropicFormat(request.tools);
      }

      // Handle tool choice parameter
      if (request.toolChoice) {
        if (typeof request.toolChoice === 'string') {
          // For 'auto', we don't need to set anything as it's the default
          // For 'none', we set tool_choice to 'none'
          if (request.toolChoice === 'none') {
            params.tool_choice = 'none' as any;
          }
          // For 'required', set to 'required'
          else if (request.toolChoice === 'required') {
            params.tool_choice = 'required' as any;
          }
        }
        // For specific tool choice
        else if (request.toolChoice && typeof request.toolChoice === 'object' && 
                 'type' in request.toolChoice && request.toolChoice.type === 'function' && 
                 'function' in request.toolChoice && 
                 request.toolChoice.function && typeof request.toolChoice.function === 'object' &&
                 'name' in request.toolChoice.function) {
          params.tool_choice = { name: request.toolChoice.function.name } as any;
        }
      }

      const completion = await this.client.messages.create(params);
      this.logger.info(`Anthropic chat completion successful for instance ${this.providerConfig.instanceName || 'default'} with model ${model}`);

      // Extract text content from the response
      const content = this.extractTextFromContentBlocks(completion.content);

      // Extract tool calls if any
      const toolCalls = this.extractToolCallsFromResponse(completion.content);

      return {
        success: true,
        content,
        toolCalls,
        choices: Array.isArray(completion.content)
          ? completion.content
              .filter((block: any) => block.type === 'text')
              .map((block: any) => ({ text: block.text }))
          : [],
        usage: completion.usage ? {
          promptTokens: completion.usage.input_tokens,
          completionTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
        } : undefined
      };
    } catch (error: any) {
      this.logger.error(`AnthropicProvider chat error: ${error.message}`);
      return {
        success: false,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          message: error.message,
          code: error.code,
          details: error
        }
      };
    }
  }

  /**
   * Continues a conversation with tool call results
   * @deprecated Use generateTextWithToolResults instead
   */
  public async continueWithToolResults(
    initialRequest: ProviderRequest,
    initialResponse: ProviderResponse,
    toolResults: ToolCallOutput[]
  ): Promise<ProviderResponse> {
    if (!initialRequest.messages) {
      throw new Error('Initial request must contain messages');
    }

    if (!initialResponse.toolCalls || initialResponse.toolCalls.length === 0) {
      throw new Error('Initial response does not contain any tool calls');
    }

    // Create a new messages array with all previous messages plus tool calls and results
    const newMessages = [...initialRequest.messages];

    // Add the assistant's response with tool calls
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: initialResponse.content || '',
      tool_calls: initialResponse.toolCalls
    };
    newMessages.push(assistantMessage);

    // Create a tool results request
    const toolResultsRequest: ToolResultsRequest = {
      ...initialRequest,
      messages: newMessages,
      tool_outputs: toolResults
    };

    // Use the generateTextWithToolResults method
    return this.generateTextWithToolResults(toolResultsRequest);
  }

  /**
   * Generates text with optional tools
   * @param request - The request object containing messages and other parameters
   * @returns Promise resolving to the provider's response
   */
  public async generateText(request: ProviderRequest): Promise<ProviderResponse> {
    return this.chat(request);
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
    const messages = [...(request.messages || [])];
    
    // If there are tool outputs, add them to the conversation
    if (request.tool_outputs && request.tool_outputs.length > 0) {
      for (const output of request.tool_outputs) {
        // Add the tool output as a message with tool_call_id
        messages.push({
          role: 'user',
          content: output.output,
          tool_call_id: output.call_id
        });
      }
    }
    
    // Continue the conversation with the updated messages
    return this.generateText({ ...request, messages });
  }

  /**
   * Handles basic text completion for Anthropic
   */
  async generateCompletion(request: ProviderRequest): Promise<ProviderResponse> {
    // For Claude, completion is similar to chat with a single user prompt
    if (!request.messages && request.prompt) {
      request.messages = [{ role: 'user', content: request.prompt }];
    }
    return this.chat(request);
  }
}