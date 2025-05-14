// Forcing re-evaluation for TS diagnostics
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
import type { ConfigManager } from '../../core/config/configManager';
import type { Logger } from '../../core/types/logger.types';
import type { ProviderSpecificConfig, OpenAIProviderSpecificConfig } from '../../core/types/config.types';
import { mapMessageToOpenAIParam, mapToolsToOpenAIChatTools } from './openaiProviderMappers';

/**
 * OpenAIProvider implements the LLMProvider interface for OpenAI API.
 * Uses dependency injection for better testability.
 */
export class OpenAIProvider implements LLMProvider {
  private client?: OpenAI;
  private providerConfig?: OpenAIProviderSpecificConfig;
  private configManager: ConfigManager;
  private logger: Logger;
  private OpenAIClass: typeof OpenAI;
  private toolRegistry?: object;

  /**
   * Creates a new OpenAIProvider with dependency injection.
   * 
   * @param configManager - Configuration manager for API keys and settings
   * @param logger - Logger implementation
   * @param OpenAIClass - OpenAI class constructor (useful for testing)
   */
  constructor(
    configManager: ConfigManager, 
    logger: Logger,
    OpenAIClass: typeof OpenAI = OpenAI
  ) {
    this.configManager = configManager;
    this.logger = logger;
    this.OpenAIClass = OpenAIClass;
  }

  /**
   * Sets the tool registry for the provider.
   * @param toolRegistry - The tool registry to use.
   */
  public setToolRegistry(toolRegistry: object): void {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Gets the available tools from the registry.
   * @returns The available tools.
   */
  public getAvailableTools(): Tool[] {
    if (!this.toolRegistry || typeof (this.toolRegistry as any).getAllTools !== 'function') {
      return [];
    }

    return (this.toolRegistry as any).getAllTools();
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

    // Check for environment variable first
    let apiKey = process.env.OPENAI_API_KEY;
    
    // Fall back to credential store if environment variable is not set
    if (!apiKey) {
      apiKey = await this.configManager.getResolvedApiKey(this.providerConfig);
    }

    if (!apiKey) {
      throw new Error(
        `OpenAI API key not found for providerType: ${this.providerConfig.providerType}. ` +
        `Ensure it's set in credentials or as OPENAI_API_KEY environment variable.`
      );
    }

    const clientOptions: any = {
      apiKey,
    };

    // Set optional base URL if provided
    if (config.baseURL) {
      clientOptions.baseURL = config.baseURL;
    }

    // Set organization ID if provided
    if (config.organization) {
      clientOptions.organization = config.organization;
    }

    this.client = new this.OpenAIClass(clientOptions);
  }

  /**
   * Implements chat method required by LLMProvider interface.
   */
  public async chat(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      return this._handleProviderError(new Error('OpenAIProvider not configured. Call configure() first.'), 'OpenAIProvider.chat');
    }

    const model = request.model || this.providerConfig.model || 'gpt-3.5-turbo';
    const temperature = request.temperature ?? this.providerConfig.temperature ?? 0.7;

    const messages: ChatCompletionMessageParam[] = request.messages
      ? request.messages.map(msg => mapMessageToOpenAIParam(msg))
      : [];

    try {
      this.logger.debug(`Sending OpenAI chat request with model: ${model}`);

      const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages,
        temperature,
        tool_choice: 'auto', // Set default to 'auto' as per OpenAI docs
      };

      // Add tools support if enabled
      if (request.tools && request.tools.length > 0) {
        this.logger.debug(`Adding ${request.tools.length} tools to request`);
        requestOptions.tools = mapToolsToOpenAIChatTools(request.tools);
      }

      // Add tool_choice if specified
      if (request.tool_choice) {
        if (typeof request.tool_choice === 'string') {
          requestOptions.tool_choice = request.tool_choice as 'none' | 'auto' | 'required';
        } else if (typeof request.tool_choice === 'object') {
          // Ensure request.tool_choice is compatible with ChatCompletionNamedToolChoice
          const toolChoiceObj = request.tool_choice as OpenAI.Chat.Completions.ChatCompletionNamedToolChoice;
          requestOptions.tool_choice = toolChoiceObj.type === 'function' && toolChoiceObj.function?.name ? {
              type: 'function',
              function: { name: toolChoiceObj.function.name }
            } : 'auto';
        } else {
           requestOptions.tool_choice = 'auto'; 
        }
      }
      
      // Add parallel_tool_calls if specified
      if (request.parallelToolCalls !== undefined) {
        requestOptions.parallel_tool_calls = request.parallelToolCalls;
      } else if (request.parallel_tool_calls !== undefined) {
        // Support legacy property name
        requestOptions.parallel_tool_calls = request.parallel_tool_calls;
      }

      // Handle multi-reply
      if (typeof request.n === 'number') {
        requestOptions.n = request.n;
      }

      // Add streaming support if requested
      if (request.stream && typeof request.onStream === 'function') {
        return this._handleStreamingChatRequest(request, requestOptions);
      }

      // Standard non-streaming request
      const completion = await this.client.chat.completions.create(requestOptions);
      return this._buildProviderResponseFromCompletion(completion);
    } catch (error: unknown) {
      return this._handleProviderError(error, 'OpenAIProvider.chat');
    }
  }

  public async generateTextWithToolResults(request: ToolResultsRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      return this._handleProviderError(new Error('OpenAIProvider not configured. Call configure() first.'), 'OpenAIProvider.generateTextWithToolResults');
    }

    if (!request.messages || request.messages.length === 0) {
      return this._handleProviderError(new Error('Request must contain messages for generateTextWithToolResults.'), 'OpenAIProvider.generateTextWithToolResults');
    }

    if (!request.tool_outputs || request.tool_outputs.length === 0) {
      return this._handleProviderError(new Error('Request must contain tool_outputs for generateTextWithToolResults.'), 'OpenAIProvider.generateTextWithToolResults');
    }

    try {
      const assistantIndex = request.messages.findIndex(
        (msg) => msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0
      );

      if (assistantIndex === -1) {
        throw new Error('No assistant message with tool calls found in the conversation history.');
      }

      const messages: ChatCompletionMessageParam[] = request.messages.map(msg => 
        mapMessageToOpenAIParam(msg)
      );

      const toolResultMessages: ChatCompletionMessageParam[] = request.tool_outputs.map((result) => ({
        role: 'tool',
        tool_call_id: result.call_id,
        content: result.output || "No output provided",
      }));

      messages.splice(assistantIndex + 1, 0, ...toolResultMessages);

      const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: request.model || this.providerConfig.model || 'gpt-3.5-turbo',
        messages,
        temperature: request.temperature ?? this.providerConfig.temperature ?? 0.7,
      };

      this.logger.debug('Sending OpenAI chat request with tool results');
      const completion = await this.client.chat.completions.create(requestOptions);

      const responseChoice = completion.choices[0];
      if (!responseChoice) {
        throw new Error('No completion choices returned from OpenAI API');
      }

      const content = responseChoice.message.content || '';

      const responseToolCalls: ToolCall[] = [];
      if (responseChoice.message.tool_calls && responseChoice.message.tool_calls.length > 0) {
        for (const tc of responseChoice.message.tool_calls) {
          if (tc.type === 'function') {
            responseToolCalls.push({
              id: tc.id,
              type: 'function_call',
              name: tc.function.name,
              arguments: tc.function.arguments,
            });
          }
        }
      }

      return {
        success: true,
        content,
        toolCalls: responseToolCalls.length > 0 ? responseToolCalls : undefined,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error: unknown) {
      return this._handleProviderError(error, 'OpenAI generateTextWithToolResults');
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

    // Create a new request with the updated messages and tool outputs
    const toolResultsRequest: ToolResultsRequest = {
      ...initialRequest,
      messages: newMessages,
      tool_outputs: toolResults
    };

    // Use the newer generateTextWithToolResults method
    return this.generateTextWithToolResults(toolResultsRequest);
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

  public async executeToolCall(toolCall: ToolCall, availableTools?: Record<string, Function>): Promise<string> {
    if (!availableTools) {
      throw new Error('No tools provided for execution');
    }

    try {
      const tool = availableTools[toolCall.name];
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      // Parse arguments JSON
      let args: Record<string, any>;
      try {
        args = JSON.parse(toolCall.arguments);
      } catch (error) {
        throw new Error(`Invalid tool arguments: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Execute tool with arguments
      const result = await tool(args);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error: unknown) {
      this.logger.error(`Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`);
      return `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  public async generateText(request: ProviderRequest): Promise<ProviderResponse> {
    return this.chat(request);
  }

  // Private helper methods
  private async _handleStreamingChatRequest(
    request: ProviderRequest,
    requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
  ): Promise<ProviderResponse> {
    if (!this.client || typeof request.onStream !== 'function') {
      throw new Error('Streaming misconfigured or client not available.');
    }

    const streamRequestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      ...requestOptions,
      stream: true,
    };
    const stream = await this.client.chat.completions.create(streamRequestOptions);
    
    let accumulatedContent = '';
    let toolCalls: ToolCall[] = [];
    
    for await (const chunk of stream) {
      const contentChunk = chunk.choices[0]?.delta?.content || '';
      accumulatedContent += contentChunk;
      
      if (chunk.choices[0]?.delta?.tool_calls) {
        this._processStreamToolCallChunk(chunk.choices[0].delta.tool_calls, toolCalls);
      }
      
      request.onStream({
        content: accumulatedContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        isComplete: false,
      });
    }
    
    request.onStream({
      content: accumulatedContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      isComplete: true,
    });
    
    return {
      success: true,
      content: accumulatedContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  private _processStreamToolCallChunk(
    toolCallDeltas: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[],
    existingToolCalls: ToolCall[]
  ): void {
    for (const toolCallDelta of toolCallDeltas) {
      let toolCall = existingToolCalls.find(tc => tc.id === toolCallDelta.id);
      if (!toolCall && toolCallDelta.id) { 
        toolCall = {
          id: toolCallDelta.id,
          type: 'function_call', 
          name: toolCallDelta.function?.name || '',
          arguments: toolCallDelta.function?.arguments || ''
        };
        existingToolCalls.push(toolCall);
      } else if (toolCall) {
        if (toolCallDelta.function?.name) {
          toolCall.name = toolCallDelta.function.name;
        }
        if (toolCallDelta.function?.arguments) {
          toolCall.arguments += toolCallDelta.function.arguments;
        }
      }
      
      // Log for debugging streaming issues
      this.logger.debug(`Processed tool call delta: id=${toolCallDelta.id}, name=${toolCallDelta.function?.name}, args=${toolCallDelta.function?.arguments}`, toolCallDelta);
    }
    
    // Log the full tool calls state for debugging
    if (existingToolCalls.length > 0) {
      this.logger.debug(`Current tool calls state: ${JSON.stringify(existingToolCalls)}`);
    }
  }

  private _handleProviderError(error: unknown, context: string): ProviderResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Error in ${context}: ${errorMessage}`);
    return { success: false, error: { message: errorMessage } };
  }

  private _buildProviderResponseFromCompletion(
    completion: OpenAI.Chat.Completions.ChatCompletion
  ): ProviderResponse {
    this.logger.debug(`Received response from OpenAI API`);

    const responseChoice = completion.choices[0];
    if (!responseChoice) {
      this.logger.error('No completion choices returned from OpenAI API');
      throw new Error('No completion choices returned from OpenAI API');
    }

    const content = responseChoice.message.content || '';

    const responseToolCalls: ToolCall[] = (responseChoice.message.tool_calls || [])
      .filter(tc => tc.type === 'function')
      .map(tc => ({
        id: tc.id,
        type: 'function_call' as const,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

    return {
      success: true,
      content,
      toolCalls: responseToolCalls.length > 0 ? responseToolCalls : undefined,
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      } : undefined,
      id: completion.id,
      model: completion.model,
      finishReason: responseChoice.finish_reason as ProviderResponse['finishReason'], 
    };
  }
}