import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  LLMProvider,
  ProviderRequest,
  ProviderResponse,
} from '../../core/types/provider.types';
import { ConfigManager } from '../../core/config/configManager';
import { ProviderSpecificConfig, OpenAIProviderSpecificConfig } from '../../core/types/config.types';

export class OpenAIProvider implements LLMProvider {
  private client?: OpenAI;
  private providerConfig?: OpenAIProviderSpecificConfig;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
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

    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: this.providerConfig.baseURL,
      timeout: this.providerConfig.timeout,
      maxRetries: this.providerConfig.maxRetries ?? 2,
    });
    console.log(
      `OpenAIProvider configured for instance: ${this.providerConfig.instanceName || this.providerConfig.providerType}`
    );
  }

  public async chat(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      throw new Error('OpenAIProvider not configured. Call configure() first.');
    }

    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request messages cannot be empty.');
    }

    try {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: request.model || this.providerConfig.model || 'gpt-3.5-turbo',
        messages: request.messages as ChatCompletionMessageParam[],
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      };

      const completion: OpenAI.Chat.ChatCompletion = await this.client.chat.completions.create(params);

      const choice = completion.choices[0];
      return {
        success: true,
        content: choice.message?.content || "",
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
        rawResponse: completion,
      };
    } catch (error: unknown) {
      console.error('Error during OpenAI chat completion:', error);
      let errorMessage = 'Failed to get chat completion from OpenAI.';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message || errorMessage;
      }
      return {
        success: false,
        error: { message: errorMessage },
        rawResponse: error,
      };
    }
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
