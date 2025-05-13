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
    this.logger.info(`Tool registry set for OpenAI provider`);
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

    const apiKey = await this.configManager.getResolvedApiKey(this.providerConfig);

    if (!apiKey) {
      throw new Error(
        `OpenAI API key not found for providerType: ${this.providerConfig.providerType}`
      );
    }

    const clientOptions: any = {
      apiKey,
    };

    // Set optional base URL if provided
    if (config.baseURL) {
      clientOptions.baseURL = config.baseURL;
      this.logger.info(`Using custom base URL for OpenAI provider: ${config.baseURL}`);
    }

    // Set organization ID if provided
    if (config.organization) {
      clientOptions.organization = config.organization;
      this.logger.info(`Using organization ID for OpenAI provider: ${config.organization}`);
    }

    this.client = new this.OpenAIClass(clientOptions);
    this.logger.info(`OpenAI provider configured successfully`);
  }

  /**
   * Implements chat method required by LLMProvider interface.
   */
  public async chat(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      throw new Error('OpenAIProvider not configured. Call configure() first.');
    }

    const model = request.model || this.providerConfig.model || 'gpt-3.5-turbo';
    const temperature = request.temperature ?? this.providerConfig.temperature ?? 0.7;

    let messages: ChatCompletionMessageParam[] = [];

    if (request.messages) {
      messages = request.messages.map((msg) => {
        const mapped: ChatCompletionMessageParam = {
          role: msg.role,
          content: msg.content || '',
        };

        if (msg.name) {
          mapped.name = msg.name;
        }

        // Handle tool calls if present
        if (msg.tool_calls) {
          // TypeScript fix: Use type assertion for mapped
          const assistantMsg = mapped as any;
          assistantMsg.tool_calls = msg.tool_calls.map((tc) => ({
            id: tc.id || `tc_${Math.random().toString(36).substring(2, 10)}`,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          }));
        }

        return mapped;
      });
    }

    try {
      this.logger.debug(`Sending OpenAI chat request with model: ${model}`);

      const requestOptions: any = {
        model,
        messages,
        temperature,
      };

      // Add tools support if enabled
      if (request.tools && request.tools.length > 0) {
        this.logger.debug(`Adding ${request.tools.length} tools to request`);
        const chatTools: ChatCompletionTool[] = request.tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }));
        requestOptions.tools = chatTools;
      }

      // Add tool_choice if specified
      if (request.tool_choice) {
        requestOptions.tool_choice = request.tool_choice;
      }

      // Handle multi-reply
      if (typeof request.n === 'number') {
        requestOptions.n = request.n;
      }

      // Add streaming support if requested
      if (request.stream && typeof request.onStream === 'function') {
        requestOptions.stream = true;
        const stream = await this.client.chat.completions.create(requestOptions);
        
        let accumulatedContent = '';
        let toolCalls: ToolCall[] = [];
        
        // TypeScript fix: Use any for stream to avoid Symbol.asyncIterator error
        for await (const chunk of stream as any) {
          const content = chunk.choices[0]?.delta?.content || '';
          accumulatedContent += content;
          
          // Handle tool calls
          if (chunk.choices[0]?.delta?.tool_calls) {
            for (const toolCallDelta of chunk.choices[0].delta.tool_calls) {
              // Find or create the tool call
              let toolCall = toolCalls.find(tc => tc.id === toolCallDelta.id);
              if (!toolCall) {
                toolCall = {
                  id: toolCallDelta.id || '',
                  type: 'function_call',
                  name: '',
                  arguments: ''
                };
                toolCalls.push(toolCall);
              }
              
              // Update the tool call with new info
              if (toolCallDelta.function?.name) {
                toolCall.name = toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                toolCall.arguments += toolCallDelta.function.arguments;
              }
            }
          }
          
          // Call the stream handler
          request.onStream({
            content: accumulatedContent,
            toolCalls,
            isComplete: false
          });
        }
        
        // Final update with complete flag
        request.onStream({
          content: accumulatedContent,
          toolCalls,
          isComplete: true
        });
        
        return {
          success: true,
          content: accumulatedContent,
          toolCalls
        };
      }

      // Standard non-streaming request
      const completion = await this.client.chat.completions.create(requestOptions);
      
      this.logger.debug(`Received response from OpenAI API`);
      
      const responseChoice = completion.choices[0];
      if (!responseChoice) {
        throw new Error('No completion choices returned from OpenAI API');
      }
      
      const content = responseChoice.message.content || '';
      
      // Handle tool calls if present
      const toolCalls: ToolCall[] = [];
      if (responseChoice.message.tool_calls && responseChoice.message.tool_calls.length > 0) {
        for (const toolCall of responseChoice.message.tool_calls) {
          if (toolCall.type === 'function') {
            toolCalls.push({
              id: toolCall.id,
              type: 'function_call',
              name: toolCall.function.name,
              arguments: toolCall.function.arguments
            });
          }
        }
      }
      
      // TypeScript fix: Only include supported fields in the response
      return {
        success: true,
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined,
        error: undefined
      };
    } catch (error_) {
      this.logger.error(`Error in OpenAI chat request: ${error_ instanceof Error ? error_.message : String(error_)}`);
      return {
        success: false,
        content: `Error: ${error_ instanceof Error ? error_.message : String(error_)}`,
        error: {
          message: error_ instanceof Error ? error_.message : String(error_),
          code: error_ instanceof Error && 'code' in error_ ? (error_ as any).code : undefined
        }
      };
    }
  }

  /**
   * Implement executeToolCall method required by LLMProvider interface.
   */
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
    } catch (error) {
      this.logger.error(`Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`);
      return `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Implement generateText method required by LLMProvider interface.
   */
  public async generateText(request: ProviderRequest): Promise<ProviderResponse> {
    return this.chat(request);
  }

  /**
   * Generates text completion from OpenAI with tool results.
   */
  public async generateTextWithToolResults(request: ToolResultsRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      throw new Error('OpenAIProvider not configured. Call configure() first.');
    }

    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request must contain messages for generateTextWithToolResults.');
    }

    if (!request.tool_outputs || request.tool_outputs.length === 0) {
      throw new Error('Request must contain tool_outputs for generateTextWithToolResults.');
    }

    try {
      // Find the assistant's message with tool calls
      const assistantIndex = request.messages.findIndex(
        (msg) => msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0
      );

      if (assistantIndex === -1) {
        throw new Error('No assistant message with tool calls found in the conversation history.');
      }

      // Create OpenAI compatible messages
      const messages = request.messages.map((msg) => {
        const mapped: ChatCompletionMessageParam = {
          role: msg.role,
          content: msg.content || '',
        };

        if (msg.name) {
          mapped.name = msg.name;
        }

        // Handle tool calls if present
        if (msg.tool_calls) {
          // TypeScript fix: Use type assertion
          const assistantMsg = mapped as any;
          assistantMsg.tool_calls = msg.tool_calls.map((tc) => ({
            id: tc.id || `tc_${Math.random().toString(36).substring(2, 10)}`,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          }));
        }

        return mapped;
      });

      // Create the tool result messages
      // TypeScript fix: tool_outputs should have correct structure
      const toolResultMessages: any[] = request.tool_outputs.map((result) => ({
        role: 'tool',
        tool_call_id: result.call_id,
        content: result.output || "No output provided",
      }));

      // Insert tool results after the assistant message
      // TypeScript fix: Type cast to avoid type error
      messages.splice(assistantIndex + 1, 0, ...(toolResultMessages as any[]));

      // Send the request to continue the conversation
      const requestOptions = {
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

      // Handle tool calls if present in the response
      const toolCalls: ToolCall[] = [];
      if (responseChoice.message.tool_calls && responseChoice.message.tool_calls.length > 0) {
        for (const toolCall of responseChoice.message.tool_calls) {
          if (toolCall.type === 'function') {
            toolCalls.push({
              id: toolCall.id,
              type: 'function_call',
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
            });
          }
        }
      }

      // Return response with type fixes
      return {
        success: true,
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error_) {
      this.logger.error(
        `Error in OpenAI generateTextWithToolResults: ${
          error_ instanceof Error ? error_.message : String(error_)
        }`
      );
      return {
        success: false,
        content: `Error: ${error_ instanceof Error ? error_.message : String(error_)}`,
        error: {
          message: error_ instanceof Error ? error_.message : String(error_),
          code: error_ instanceof Error && 'code' in error_ ? (error_ as any).code : undefined
        }
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
}