import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  LLMProvider,
  ProviderRequest,
  ProviderResponse,
  ChatMessage,
  ProviderConfig,
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

  public async chat(request: ProviderRequest): Promise<ProviderResponse> {
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

      const completion: OpenAI.Chat.ChatCompletion = await this.client.chat.completions.create(openAIParams);

      const choice = completion.choices[0];
      info(
        `Chat completion successful for instance ${this.providerConfig.instanceName} with model ${openAIParams.model}`
      );
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
