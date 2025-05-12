import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import {
  LLMProvider,
  ProviderRequest,
  ProviderResponse,
  ChatMessage,
  ProviderConfig,
  Tool,
  ToolCall,
  ToolCallOutput,
  ToolResultsRequest,
} from '../../core/types/provider.types';
import { ConfigManager } from '../../core/config/configManager';
import { ProviderSpecificConfig, OpenAIProviderSpecificConfig } from '../../core/types/config.types';
import { info, error, warn, debug } from '@/core/utils';

export class OpenAIProvider implements LLMProvider {
  private client?: OpenAI;
  private providerConfig?: OpenAIProviderSpecificConfig;
  private configManager: ConfigManager;
  private OpenAIClass: typeof OpenAI;

  constructor(configManager: ConfigManager, OpenAIClass: typeof OpenAI = OpenAI) {
    this.configManager = configManager;
    this.OpenAIClass = OpenAIClass;
  }

  get name(): string {
    return 'openai';
  }

  public async configure(config: OpenAIProviderSpecificConfig): Promise<void> {
    this.providerConfig = config;

    if (!this.providerConfig.providerType) {
      throw new Error(
        `ProviderConfig is missing 'providerType' for OpenAIProvider.`
      );
    }

    const apiKey = await this.configManager.getResolvedApiKey(this.providerConfig);

    if (!apiKey) {
      throw new Error(
        `OpenAI API key not found for providerType: ${this.providerConfig.providerType}` +
        (this.providerConfig.instanceName ? ` (instance: ${this.providerConfig.instanceName})` : '') +
        `. Please configure it using the CLI.`
      );
    }

    this.client = new this.OpenAIClass({
      apiKey: apiKey,
      baseURL: this.providerConfig.baseURL,
      timeout: this.providerConfig.timeout,
      maxRetries: this.providerConfig.maxRetries ?? 2,
    });
    info(
      `OpenAIProvider configured for instance: ${this.providerConfig.instanceName || this.providerConfig.providerType}`
    );
  }

  /**
   * Convert our generic Tool interface to OpenAI's ChatCompletionTool format
   */
  private convertToolsToOpenAIFormat(tools?: Tool[]): ChatCompletionTool[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }
    }));
  }

  /**
   * Convert OpenAI's tool_calls to our ToolCall format
   */
  private convertOpenAIToolCallsToGeneric(toolCalls?: OpenAI.Chat.ChatCompletionMessageToolCall[]): ToolCall[] | undefined {
    if (!toolCalls || toolCalls.length === 0) {
      return undefined;
    }

    return toolCalls.map(toolCall => ({
      id: toolCall.id,
      call_id: toolCall.id, // Use the same ID for both id and call_id for OpenAI
      type: 'function_call',
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    }));
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

    try {
      const result = toolFunction ? await toolFunction(JSON.parse(argsStr)) : JSON.stringify({ error: `Tool not found: ${name}` });
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error_: unknown) {
      const errorMessage = error_ instanceof Error ? error_.message : String(error_);
      error(`Error executing tool call ${name}: ${errorMessage}`);
      return JSON.stringify({ error: errorMessage });
    }
  }

  /**
   * Continues a conversation with tool results
   * @param request - The request object containing messages, tool calls, and tool outputs
   * @returns Promise resolving to the provider's response
   */
  async generateTextWithToolResults(request: ToolResultsRequest): Promise<ProviderResponse> {
    // For OpenAI, we use the tool_outputs parameter in the API request
    
    // Extract messages and tool outputs
    const messages = [...(request.messages || [])];
    const toolOutputs = request.tool_outputs || [];
    
    // Create a new request with the tool outputs
    const newRequest: ProviderRequest = {
      ...request,
      messages,
      tool_outputs: toolOutputs,
    };
    
    // Continue the conversation with the updated request
    return this.generateText(newRequest);
  }

  /**
   * Generates text with optional tools
   * @param request - The request object containing messages and other parameters
   * @returns Promise resolving to the provider's response
   */
  public async chat(request: ProviderRequest): Promise<ProviderResponse> {
    return this.generateText(request);
  }

  public async generateText(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      throw new Error('OpenAIProvider not configured. Call configure() first.');
    }

    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request messages cannot be empty.');
    }

    try {
      const messages = request.messages as ChatMessage[];
      const openAIParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: request.model || this.providerConfig.model || 'gpt-3.5-turbo',
        messages: messages as ChatCompletionMessageParam[],
        temperature: request.temperature ?? this.providerConfig.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.providerConfig.maxTokens ?? 150,
      };

      // Add tool-related parameters if tools are provided
      if (request.tools && request.tools.length > 0) {
        openAIParams.tools = this.convertToolsToOpenAIFormat(request.tools);

        // Add tool_choice if specified
        if (request.toolChoice) {
          openAIParams.tool_choice = typeof request.toolChoice === 'string'
            ? request.toolChoice
            : { type: 'function', function: { name: request.toolChoice.name } };
        }
      }

      const completion: OpenAI.Chat.ChatCompletion = await this.client.chat.completions.create(openAIParams);

      const choice = completion.choices[0];
      info(
        `Chat completion successful for instance ${this.providerConfig.instanceName} with model ${openAIParams.model}`
      );

      // Extract tool calls if present
      const toolCalls = choice.message?.tool_calls
        ? this.convertOpenAIToolCallsToGeneric(choice.message.tool_calls)
        : undefined;

      return {
        success: true,
        content: choice.message?.content || "",
        toolCalls,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
        rawResponse: completion,
      };
    } catch (error_: unknown) {
      const errorMessage = error_ instanceof Error ? error_.message : String(error_);
      error(`Error during OpenAI chat completion: ${errorMessage}`);
      let apiErrorMessage = 'Failed to get chat completion from OpenAI.';
      if (error_ && typeof error_ === 'object' && 'message' in error_) {
        apiErrorMessage = (error_ as { message: string }).message || apiErrorMessage;
      }
      return {
        success: false,
        error: { message: apiErrorMessage },
        rawResponse: error_,
      };
    }
  }

  /**
   * Legacy method for continuing with tool results
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

    // Add tool results as messages
    for (const toolResult of toolResults) {
      const toolResultMessage: ChatMessage = {
        role: 'user',
        content: toolResult.output,
        tool_call_id: toolResult.call_id,
      };
      newMessages.push(toolResultMessage);
    }

    // Create a new request with the updated messages and the same tools
    const newRequest: ProviderRequest = {
      ...initialRequest,
      messages: newMessages,
    };

    // Call the chat method with the new request
    return this.chat(newRequest);
  }

  public async generateCompletion(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      throw new Error('OpenAIProvider not configured. Call configure() first.');
    }

    if (!request.messages || request.messages.length === 0 || !request.messages[0].content) {
      throw new Error('Request must contain a non-empty prompt message for generateCompletion.');
    }

    const chatRequest: ProviderRequest = {
      ...request,
      messages: [
        { role: 'user', content: request.messages[0].content }
      ],
      model: request.model || this.providerConfig.model || 'gpt-3.5-turbo',
    };

    return this.chat(chatRequest);
  }
}
