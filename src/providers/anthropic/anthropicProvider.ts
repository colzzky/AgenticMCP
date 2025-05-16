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
import { ToolResultsRequest, RecursiveToolLoopOptions } from '../../core/types/provider.types';

/**
 * AnthropicProvider implements the LLMProvider interface for Anthropic Claude API.
 * Uses dependency injection for better testability.
 */
export class AnthropicProvider implements Partial<LLMProvider> {
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
   * Gets or initializes the Anthropic client
   */
  private async getClient(): Promise<Anthropic> {
    if (this.client) {
      return this.client;
    }

    // Load provider config
    this.providerConfig = await this.configManager.getConfig().providers?.anthropic as AnthropicProviderSpecificConfig;
    
    if (!this.providerConfig || !this.providerConfig.apiKey) {
      throw new Error('Anthropic API key not found in config or environment');
    }

    // Create and store client
    this.client = new this.AnthropicClass({
      apiKey: this.providerConfig.apiKey
    });

    return this.client;
  }

  /**
   * Maps our internal message format to Anthropic's format
   */
  private mapMessagesToAnthropicFormat(messages: ChatMessage[]): MessageParam[] {
    return messages.map(message => {
      // Convert our message role to Anthropic's role format
      const role = message.role === 'assistant' ? 'assistant' : 'user';
      
      // Basic content mapping
      let content = '';
      if (typeof message.content === 'string') {
        content = message.content;
      } else if (Array.isArray(message.content)) {
        // Handle complex content with media
        const textParts: string[] = [];
        const contentArray = message.content as Array<any>;
        
        // Use a type-safe approach with contentArray
        contentArray.forEach(part => {
          if (typeof part === 'object' && part !== null && 'text' in part) {
            const textPart = part as { text: string };
            textParts.push(textPart.text);
          }
        });
        
        content = textParts.join('\n');
      }
      
      return { role, content };

    });
  }

  /**
   * Processes and formats tool calls from Anthropic's response
   */
  private extractToolCallsFromResponse(response: any): ToolCall[] | undefined {
    if (!response.content || !Array.isArray(response.content)) {
      return undefined;
    }
    
    // Look for tool calls in the response
    const toolCalls: ToolCall[] = [];
    
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolCalls.push({
          type: 'function_call',
          id: block.id || `tool-call-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: block.name,
          arguments: JSON.stringify(block.input) 
        });
      }
    }
    
    return toolCalls.length > 0 ? toolCalls : undefined;
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
      // If config is provided, use it to initialize
      if (config?.providerSpecificConfig) {
        this.providerConfig = config.providerSpecificConfig as AnthropicProviderSpecificConfig;
      } else {
        // Otherwise load from config manager
        this.providerConfig = await this.configManager.getConfig().providers?.anthropic as AnthropicProviderSpecificConfig;
      }
      
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
  public async chat(request: ProviderRequest): Promise<ProviderResponse> {
    try {
      const client = await this.getClient();
      
      // Extract request parameters
      const { messages, model, temperature, max_tokens, tools, tool_choice } = request;
      
      if (!messages || messages.length === 0) {
        throw new Error('No messages provided for chat request');
      }
      
      // Configure the request parameters
      const params: MessageCreateParams = {
        model: model || this.providerConfig?.defaultModel || 'claude-3-opus-20240229',
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1024,
        temperature: temperature ?? 0.7,
        // Use as any to bypass strict type checking between our system's ChatMessage and Anthropic's Message format
      // A proper adapter pattern would be better in a real implementation
      messages: this.mapMessagesToAnthropicFormat(messages as any)
      };
      
      // Add tools if specified
      if (tools && tools.length > 0) {
        params.tools = this.convertToolsToAnthropicFormat(tools);
      }
      
      // Add tool_choice if specified
      if (tool_choice) {
        params.tool_choice = tool_choice as any;
      }
      
      // Send the request to Anthropic
      const response = await client.messages.create(params);
      
      // Extract content from the response
      let content = '';
      const responseContent = (response as any).content;
      
      if (responseContent && Array.isArray(responseContent)) {
        // Extract text blocks from the response
        const textBlocks: string[] = [];
        
        // Use forEach with type safety
        responseContent.forEach((block: any) => {
          if (block && block.type === 'text' && typeof block.text === 'string') {
            textBlocks.push(block.text);
          }
        });
        
        content = textBlocks.join('\n');
      }
      
      // Extract tool calls if any
      const toolCalls = this.extractToolCallsFromResponse(response as any);
      
      // Return formatted response
      return {
        success: true,
        content,
        model: (response as any).model,
        toolCalls,
        rawResponse: response
      };
    } catch (error) {
      this.logger.error(`Error in Anthropic chat: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Continues a conversation with the results from tool executions
   */
  public async continueWithToolResults(
    initialRequest: ProviderRequest, 
    toolResults: ToolCallOutput[]
  ): Promise<ProviderResponse> {
    const lastMessage = initialRequest.messages?.[initialRequest.messages.length - 1];
    
    // Create new messages array with the tool results appended
    const newMessages = [...(initialRequest.messages || [])];
    
    // If there are tool results, add them to the conversation
    if (toolResults && toolResults.length > 0) {
      for (const result of toolResults) {
        // Add the tool result as a message with tool_call_id
        newMessages.push({
          role: 'user',
          content: result.output,
          tool_call_id: result.call_id
        });
      }
    }
    
    // Create the tool results request
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
    return this.chat({ ...request, messages });
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

  /**
   * Recursively handles tool calls until a final response with no tools is generated
   * 
   * @param request - The initial request object containing messages and other parameters
   * @param toolExecutor - Tool executor to execute tool calls
   * @param options - Additional options for the recursive execution
   * @returns A promise that resolves to the provider's final response with no more tool calls
   */
  public async orchestrateToolLoop(
    request: ProviderRequest,
    toolExecutor: any,
    options: RecursiveToolLoopOptions = {}
  ): Promise<ProviderResponse> {
    // Set default options
    const maxIterations = options.maxIterations || 10;
    const verbose = options.verbose || false;
    const onProgress = options.onProgress || (() => {});
    
    // Initialize tracking variables
    let currentRequest = { ...request };
    let currentMessages = [...(request.messages || [])];
    let iterations = 0;
    
    // Main recursive loop
    while (iterations < maxIterations) {
      iterations++;
      
      if (verbose) {
        this.logger.debug(`Tool loop iteration ${iterations}/${maxIterations}`);
      }
      
      // 1. Send request to LLM
      const response = iterations === 1 
        ? await this.chat(currentRequest) 
        : await this.generateTextWithToolResults(currentRequest as ToolResultsRequest);
      
      // Report progress if callback is provided
      onProgress(iterations, response);
      
      // 2. Check for tool calls
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // No more tool calls, we have our final response
        if (verbose) {
          this.logger.debug(`Tool loop completed after ${iterations} iterations`);
        }
        return response;
      }
      
      if (verbose) {
        this.logger.debug(`Got ${response.toolCalls.length} tool calls, executing...`);
      }
      
      // 3. Execute tool calls and collect results
      const toolResults: ToolCallOutput[] = [];
      for (const toolCall of response.toolCalls) {
        try {
          const output = await toolExecutor.executeTool(toolCall.name, JSON.parse(toolCall.arguments));
          toolResults.push({
            type: 'function_call_output',
            call_id: toolCall.id,
            output: typeof output === 'string' ? output : JSON.stringify(output)
          });
        } catch (error) {
          this.logger.error(`Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`);
          toolResults.push({
            type: 'function_call_output',
            call_id: toolCall.id,
            output: `Error: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
      
      // 4. Prepare request for next iteration with tool results
      currentMessages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.toolCalls
      });
      
      // 5. Update current request for next iteration
      currentRequest = {
        messages: currentMessages,
        tool_outputs: toolResults,
        model: request.model,
        temperature: request.temperature
      };
    }
    
    throw new Error(`Reached maximum iterations (${maxIterations}) in tool calling loop`);
  }
}