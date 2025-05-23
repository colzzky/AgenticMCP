/**
 * @file Implementation of the Google/Gemini Provider adapter with dependency injection
 */

import {
  GoogleGenAI,
  GenerateContentConfig,
  Part,
} from '@google/genai';
import type { ProviderRequest, ProviderResponse, ChatMessage, ToolResultsRequest, ToolCallOutput, RecursiveToolLoopOptions } from '../../core/types/provider.types';
import type { GoogleProviderSpecificConfig } from '../../core/types/config.types';
import type { ConfigManager } from '../../core/config/configManager';
import type { Logger } from '../../core/types/logger.types';
import { convertToolsToGoogleFormat, convertToolChoiceToGoogleFormat } from './googleTypes';
import { convertMessagesToGenAIFormat } from './googleMessageConversion';
import { ProviderBase } from '../providerBase';

/**
 * GoogleProvider adapter for the Google Gemini API
 * Supports both the Gemini Developer API and Vertex AI
 * Uses dependency injection for better testability.
 */
export class GoogleProvider extends ProviderBase {
  private providerConfig?: GoogleProviderSpecificConfig;
  private client?: GoogleGenAI;
  private configManager: ConfigManager;
  private logger: Logger;
  private GoogleGenAIClass: typeof GoogleGenAI;

  /**
   * Creates a new GoogleProvider with dependency injection.
   * 
   * @param configManager - Configuration manager for API keys and settings
   * @param logger - Logger implementation
   * @param GoogleGenAIClass - GoogleGenAI class constructor (useful for testing)
   */
  constructor(
    configManager: ConfigManager,
    logger: Logger,
    GoogleGenAIClass: typeof GoogleGenAI = GoogleGenAI
  ) {
    super();
    this.configManager = configManager;
    this.logger = logger;
    this.GoogleGenAIClass = GoogleGenAIClass;
  }

  /**
   * Get the provider name
   */
  get name(): string {
    return 'google';
  }

  get defaultModel(): string {
    return 'grok-3-mini';
  }

  /**
   * Configure the Google/Gemini provider with specific settings
   * @param config Provider-specific configuration
   */
  public async configure(config: GoogleProviderSpecificConfig): Promise<void> {
    this.providerConfig = { ...config }; // Clone to avoid modifying original test config object

    if (!this.providerConfig.providerType) {
      throw new Error('ProviderConfig is missing \'providerType\' for GoogleProvider');
    }

    // Check for environment variable first
    let apiKey = process.env.GEMINI_API_KEY;

    // Fall back to credential store if environment variable is not set
    if (!apiKey) {
      try {
        const storedApiKey = await this.configManager.getResolvedApiKey(config);
        if (storedApiKey) {
          apiKey = storedApiKey;
        }
      } catch (error) {
        this.logger.debug(`Error retrieving API key from credential store: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!apiKey && !config.vertexAI) {
      throw new Error(
        `Google Gemini API key not found for providerType: ${this.providerConfig.providerType}` +
        (this.providerConfig.instanceName ? ` (instance: ${this.providerConfig.instanceName})` : '') +
        `. Ensure it's set in credentials or as GEMINI_API_KEY environment variable.`
      );
    }

    // Ensure providerConfig.apiKey has the final key to be used
    this.providerConfig.apiKey = apiKey;

    // Initialize client differently based on whether we're using Vertex AI or the Gemini API
    const useVertexAI = this.providerConfig.vertexAI;

    // Initialize client based on the configuration
    useVertexAI ? this.initializeVertexAI() : await this.initializeGeminiAPI();
  }

  /**
   * Initialize the client for Vertex AI
   */
  private initializeVertexAI(): void {
    if (!this.providerConfig) return;

    if (!this.providerConfig.vertexProject || !this.providerConfig.vertexLocation) {
      throw new Error('Vertex AI requires vertexProject and vertexLocation to be specified');
    }

    // Initialize for Vertex AI
    this.client = new this.GoogleGenAIClass({
      project: this.providerConfig.vertexProject,
      location: this.providerConfig.vertexLocation,
      vertexai: true
    });

    this.logger.info(`GoogleProvider configured for instance: ${this.providerConfig.instanceName || 'default'} with Vertex AI`);
  }

  /**
   * Initialize the client for the Gemini Developer API
   */
  private async initializeGeminiAPI(): Promise<void> {
    if (!this.providerConfig) {
      throw new Error('GoogleProvider not configured. Call configure() first.');
    }

    const { apiKey, vertexAI, vertexProject, vertexLocation } = this.providerConfig;

    if (vertexAI) {
      if (!vertexProject || !vertexLocation) {
        throw new Error('Vertex AI requires vertexProject and vertexLocation to be specified.');
      }

      this.client = new this.GoogleGenAIClass({
        project: vertexProject,
        location: vertexLocation
      });
    } else if (apiKey) {
      this.client = new this.GoogleGenAIClass({ apiKey });
    } else {
      throw new Error(
        `Google Gemini API key not found for providerType: ${this.providerConfig.providerType}` +
        (this.providerConfig.instanceName ? ` (instance: ${this.providerConfig.instanceName})` : '') +
        `. Please configure it using the CLI.`
      );
    }

    if (!this.client) {
      throw new Error('Failed to initialize Google Gemini API client.');
    }

    this.logger.info(`GoogleProvider configured for instance: ${this.providerConfig.instanceName || 'default'} with Gemini API`);
  }

  /**
   * Generate chat completion using the Google Gemini API
   * @param request Provider request with messages and parameters
   * @returns Provider response with content and metadata
   */
  async chat(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.providerConfig) {
      throw new Error('GoogleProvider not configured. Call configure() first.');
    }
    if (!this.client) {
      // Attempt to initialize if not already
      await this.initializeGeminiAPI();
      if (!this.client) {
        throw new Error('Google API client failed to initialize. Check configuration and API key.');
      }
    }

    let usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }

    // Configure tools if provided
    const config: GenerateContentConfig = {
      tools: [],
      responseMimeType: 'text/plain',
    };

    const toolsLibrary = this.toolExecutor?.getAllTools()
    if (toolsLibrary) {
      // Add tools support if enabled
      this.logger.debug(`Adding ${toolsLibrary.length} tools to request`);
      config.tools = [{ functionDeclarations: convertToolsToGoogleFormat(toolsLibrary) }]
    }

    try {
      const modelName = request.model || this.providerConfig.model || 'gemini-1.5-flash-latest';
      const sdkFormattedMessages = convertMessagesToGenAIFormat(request.messages || []);

      if (sdkFormattedMessages.length === 0) {
        return {
          success: false,
          content: '',
          error: {
            message: 'No messages provided for chat completion',
            code: 'no_messages_provided',
          },
        };
      }

      // Add tool choice configuration if provided
      if (request.toolChoice &&
        (request.toolChoice === 'auto' ||
          request.toolChoice === 'required' ||
          request.toolChoice === 'none' ||
          (typeof request.toolChoice === 'object' &&
            'type' in request.toolChoice &&
            request.toolChoice.type === 'function'))) {
        config.toolConfig = convertToolChoiceToGoogleFormat(request.toolChoice as 'auto' | 'required' | 'none' | { type: 'function'; name: string });
      }

      let finalResponse = "";
      let callIterations = 0;
      const maxIterations = 10;
      while (callIterations < maxIterations) {

        // Use modelInstance.generateContent for chat-like interactions with structured Content[]
        const resultResponse = await this.client.models.generateContent({
          model: modelName,
          contents: sdkFormattedMessages,
          config: config
        });

        usage.promptTokens = usage.promptTokens + (resultResponse.usageMetadata?.promptTokenCount || 0),
        usage.completionTokens = usage.completionTokens + (resultResponse.usageMetadata?.candidatesTokenCount || 0),
        usage.totalTokens = usage.totalTokens + (resultResponse.usageMetadata?.totalTokenCount || 0),

        this.logger.debug(`Google Response: ${JSON.stringify(resultResponse)}`)
        const modelResponse = resultResponse?.candidates?.[0]?.content;
        finalResponse = modelResponse?.parts?.[0]?.text || "";
        const functionCallPart = modelResponse?.parts?.find((part) => part.functionCall) as Part;
        if (functionCallPart) {
          const functionCall = functionCallPart.functionCall;
          const functionName = functionCall?.name;
          const toolCallOutput = await this.executeToolCall({
            id: functionCall?.name!,
            call_id: functionCall?.name!,
            type: 'function_call',
            name: functionCall?.name!,
            arguments: JSON.stringify(functionCall?.args!)
          });
          sdkFormattedMessages.push(
            {
              role: "model",
              parts: [{ functionCall: functionCall }],
            },
            {
              role: "function",
              parts: [
                {
                  functionResponse: {
                    name: functionName,
                    response: {
                      content: toolCallOutput,
                    },
                  },
                },
              ],
            }
          );
          callIterations++;
        } else {
          break;
        }

      }

      return {
        success: true,
        content: finalResponse,
        usage,
      };
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : String(error_);
      this.logger.error(`Error in GoogleProvider.generateText: ${message}`);
      return {
        success: false,
        content: '',
        error: {
          message,
          code: 'google_api_error'
        },
      };
    }
  }

  /**
   * Generates text with optional tools
   * @param request - The request object containing messages and other parameters
   * @returns Promise resolving to the provider's response
   */
  async generateText(request: ProviderRequest): Promise<ProviderResponse> {
    return this.chat(request);
  }

  /**
   * Generate text completion using the Google Gemini API
   * This is an alias for chat() for compatibility with the LLMProvider interface
   */
  async generateCompletion(request: ProviderRequest): Promise<ProviderResponse> {
    return this.chat(request);
  }

  /**
   * Continues a conversation with tool results
   * @param request - The request object containing messages, tool calls, and tool outputs
   * @returns Promise resolving to the provider's response
   */
  async generateTextWithToolResults(request: ToolResultsRequest): Promise<ProviderResponse> {
    // For Google/Gemini, we handle tool results by adding them to the conversation history
    // and then continuing the conversation with a new chat request

    // Extract tool outputs and add them to the messages
    const messages = [...(request.messages || [])] as ChatMessage[];

    // If there are tool outputs, add them to the conversation
    if (request.tool_outputs && request.tool_outputs.length > 0) {
      for (const output of request.tool_outputs) {
        // Add the tool output as a message from the 'tool' role
        messages.push({
          role: 'assistant', // Using 'tool' role as defined in Message type
          content: output.output,
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

  /**
   * Continues a conversation with tool call results
   * @param initialRequest The original request that generated the tool calls
   * @param initialResponse The response containing the tool calls
   * @param toolResults The results of executing the tool calls
   * @returns Promise with the follow-up response from the model
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

    // Create a new messages array with all previous messages
    const newMessages = [...initialRequest.messages];

    // Add the assistant's response with tool calls (as a model message)
    if (initialResponse.toolCalls) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: initialResponse.content || '',
        tool_calls: initialResponse.toolCalls
      };
      newMessages.push(assistantMessage);
    } else {
      newMessages.push({
        role: 'assistant',
        content: initialResponse.content || ''
      });
    }

    // Create a tool results request
    const toolResultsRequest: ToolResultsRequest = {
      ...initialRequest,
      messages: newMessages,
      tool_outputs: toolResults
    };

    // Use the generateTextWithToolResults method
    return this.generateTextWithToolResults(toolResultsRequest);
  }

}