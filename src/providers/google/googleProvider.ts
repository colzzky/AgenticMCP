/**
 * @file Implementation of the Google/Gemini Provider adapter
 */

import { GoogleGenAI, Content, GenerateContentResponse, Part } from '@google/genai';
import type { 
  LLMProvider, 
  ProviderRequest, 
  ProviderResponse,
  ChatMessage
} from '@/core/types/provider.types';
import type { GoogleProviderSpecificConfig } from '@/core/types/config.types';
import { ConfigManager } from '@/core/config/configManager';
import { info, error as logError, debug } from '@/core/utils/logger';

/**
 * GoogleProvider adapter for the Google Gemini API
 * Supports both the Gemini Developer API and Vertex AI
 */
export class GoogleProvider implements LLMProvider {
  private providerConfig?: GoogleProviderSpecificConfig;
  private client?: GoogleGenAI;
  private GoogleGenAIClass: typeof GoogleGenAI;
  private configManager?: ConfigManager;

  /**
   * Constructor for GoogleProvider
   * @param configManager Optional ConfigManager for secure credential storage
   * @param GoogleGenAIClass For dependency injection and testing
   */
  constructor(configManager?: ConfigManager, GoogleGenAIClass: typeof GoogleGenAI = GoogleGenAI) {
    this.configManager = configManager;
    this.GoogleGenAIClass = GoogleGenAIClass;
  }

  /**
   * Get the provider name
   */
  get name(): string {
    return 'google';
  }

  /**
   * Configure the Google/Gemini provider with specific settings
   * @param config Provider-specific configuration
   */
  public async configure(config: GoogleProviderSpecificConfig): Promise<void> {
    this.providerConfig = { ...config }; // Clone to avoid modifying original test config object

    let keyToUse = config.apiKey; // Start with the provided key

    console.log('[GoogleProvider.configure] Initial keyToUse:', keyToUse);
    console.log('[GoogleProvider.configure] this.configManager exists:', !!this.configManager);
    if (this.configManager) {
      console.log('[GoogleProvider.configure] this.configManager.getResolvedApiKey type:', typeof this.configManager.getResolvedApiKey);
    }

    const resolvedKey = this.configManager && typeof this.configManager.getResolvedApiKey === 'function' 
      ? await this.configManager.getResolvedApiKey(config) 
      : undefined;
    console.log('[GoogleProvider.configure] resolvedKey from ConfigManager:', resolvedKey);
    keyToUse = resolvedKey || keyToUse;
    console.log('[GoogleProvider.configure] keyToUse updated by ConfigManager:', keyToUse);

    // Ensure providerConfig.apiKey has the final key to be used
    this.providerConfig.apiKey = keyToUse;

    if (!this.providerConfig.providerType) {
      throw new Error('ProviderConfig is missing \'providerType\' for GoogleProvider');
    }

    // Initialize client differently based on whether we're using Vertex AI or the Gemini API
    // Check if using Vertex AI or the Gemini Developer API
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
    
    info(`GoogleProvider configured for instance: ${this.providerConfig.instanceName || 'default'} with Vertex AI`);
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
      // For Vertex AI, the GoogleGenAI constructor might be called differently (e.g., without arguments
      // relying on Application Default Credentials, or with specific auth clients).
      // Our mock is set up to receive an object that can contain project/location.
      this.client = new this.GoogleGenAIClass({ 
        project: vertexProject, 
        location: vertexLocation 
        // We might add a flag like isVertex: true if the mock needs to differentiate more clearly
      });
    } else if (apiKey) {
      // Assuming the SDK constructor can take an options object like { apiKey: string }
      // This matches the previous live code structure for API key usage.
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
      // Attempt to initialize if not already (e.g. configure was called but client init failed silently or was deferred)
      // This path might indicate a flaw in initial setup logic if hit often.
      await this.initializeGeminiAPI(); // Assuming this sets this.client or throws
      if (!this.client) {
        throw new Error('Google API client failed to initialize. Check configuration and API key.');
      }
    }

    try {
      const modelName = request.model || this.providerConfig.model || 'gemini-1.5-flash-latest';
      const sdkFormattedMessages = this.convertMessagesToGenAIFormat(request.messages || []);

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

      const generationConfig: any = {
        maxOutputTokens: request.maxTokens || this.providerConfig.maxTokens,
        temperature: request.temperature || this.providerConfig.temperature,
        topK: this.providerConfig.topK,
        topP: this.providerConfig.topP,
        // candidateCount: this.providerConfig.candidateCount, // Example if you add this to config
      };
      // Remove undefined values from generationConfig
      for (const key of Object.keys(generationConfig)) {
        if (generationConfig[key] === undefined) {
          delete generationConfig[key];
        }
      }

      // Get the model instance using the pattern that aligns with current mocks
      const modelInstance = (this.client as any).models.get(modelName);
      if (!modelInstance) {
          throw new Error(`Failed to get model instance for ${modelName}. Ensure client.models.get is correctly mocked or implemented.`);
      }
      
      // Use modelInstance.generateContent for chat-like interactions with structured Content[]
      const resultPromise = modelInstance.generateContent({
        contents: sdkFormattedMessages,
        generationConfig,
        // safetySettings: this.providerConfig.safetySettings, // Pass if configured
        // tools: this.providerConfig.tools, // Pass if tool calling is configured
      });

      const resultResponse = await resultPromise.response;

      const content = resultResponse.text; // Access as a property, not a method

      if (!content && resultResponse.promptFeedback?.blockReason) {
        const blockMessage = `Content generation blocked. Reason: ${resultResponse.promptFeedback.blockReason}. ${resultResponse.promptFeedback.blockReasonMessage || ''}`;
        logError(blockMessage);
        return {
            success: false,
            content: '',
            error: { message: blockMessage, code: 'content_blocked' }
        };
      }
      
      info(`Google Gemini chat completion successful for instance ${this.providerConfig.instanceName || 'default'} with model ${modelName}`);
      
      return {
        success: true,
        content,
        choices: resultResponse.candidates?.map((candidate: any) => ({
          text: candidate.content?.parts?.map((part: Part) => part.text).join('') || '', // Ensure content and parts exist
          // finishReason: candidate.finishReason, // Example: include if needed
          // safetyRatings: candidate.safetyRatings, // Example: include if needed
        })) || [{ text: content }],
        usage: { 
          promptTokens: resultResponse.usageMetadata?.promptTokenCount || 0,
          completionTokens: resultResponse.usageMetadata?.candidatesTokenCount || 0, 
          totalTokens: resultResponse.usageMetadata?.totalTokenCount || 0,
        }
      };
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : String(error_);
      logError(`Error in GoogleProvider.chat: ${message}`);
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
   * Generate text completion using the Google Gemini API
   * This is an alias for chat() for compatibility with the LLMProvider interface
   */
  async generateCompletion(request: ProviderRequest): Promise<ProviderResponse> {
    return this.chat(request);
  }

  /**
   * Convert messages from the common format to Google GenAI specific format
   */
  private convertMessagesToGenAIFormat(messages: ChatMessage[]): Content[] {
    if (!messages || messages.length === 0) {
      return [];
    }
    return messages.map((msg) => {
      let role: 'user' | 'model';
      // Gemini only supports 'user' and 'model' roles.
      // 'system' messages need to be handled carefully.
      // For 'generateContent', system messages are often converted to a 'user' message
      // or handled via `systemInstruction` in `getGenerativeModel`.
      role = msg.role === 'assistant' ? 'model' : 'user'; // If it was a system message, its content is now part of a user message.
      return {
        role,
        parts: [{ text: msg.content || "" }], // Ensure text is always a string
      };
    // Filter out any messages that might have become empty or invalid after transformation
    }).filter(content => content.parts.every(part => typeof part.text === 'string' && part.text.length > 0));
  }
}

export default GoogleProvider;
