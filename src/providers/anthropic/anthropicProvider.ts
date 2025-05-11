import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, ProviderConfig, ProviderRequest, ProviderResponse, ChatMessage } from '@/core/types/provider.types';
import type { AnthropicProviderSpecificConfig } from '@/core/types/config.types';
import { info, error as logError } from '@/core/utils/logger';

export class AnthropicProvider implements LLMProvider {
  private providerConfig?: AnthropicProviderSpecificConfig;
  private apiKey?: string;
  private client?: Anthropic;

  constructor() {}

  get name(): string {
    return 'anthropic';
  }

  async configure(config: AnthropicProviderSpecificConfig): Promise<void> {
    this.providerConfig = config;
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required.');
    }
    this.client = new Anthropic({ apiKey: this.apiKey });
    info(`AnthropicProvider configured for instance ${config.instanceName || 'default'}`);
  }

  async chat(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.client || !this.providerConfig) {
      throw new Error('AnthropicProvider not configured. Call configure() first.');
    }
    try {
      const model = request.model || this.providerConfig.model || 'claude-3-5-sonnet-latest';
      const max_tokens = request.maxTokens || this.providerConfig.maxTokens || 1024;
      // Only include 'user' and 'assistant' roles for Anthropic
      const messages = (request.messages || []).filter(
        (msg) => msg.role === 'user' || msg.role === 'assistant'
      );
      const params = {
        model,
        max_tokens,
        messages,
        temperature: request.temperature || this.providerConfig.temperature,
        // Add any other supported params here
      };
      const completion = await this.client.messages.create(params);
      info(`Anthropic chat completion successful for instance ${this.providerConfig.instanceName || 'default'} with model ${model}`);
      // Extract all text blocks from the content array
      const textBlocks = Array.isArray(completion.content)
        ? completion.content.filter((block: any) => block.type === 'text').map((block: any) => block.text)
        : [];
      const content = textBlocks.join(' ');
      return {
        success: true,
        content,
        choices: textBlocks.map((text: string) => ({ text })),
        usage: completion.usage ? {
          promptTokens: completion.usage.input_tokens,
          completionTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
        } : undefined,
        rawResponse: completion,
      };
    } catch (err: any) {
      logError(`AnthropicProvider chat error: ${err.message}`);
      return {
        success: false,
        error: { message: err.message, details: err },
        rawResponse: err,
      };
    }
  }

  async generateCompletion(request: ProviderRequest): Promise<ProviderResponse> {
    // For Claude, completion is similar to chat with a single user prompt
    if (!request.messages && request.prompt) {
      request.messages = [{ role: 'user', content: request.prompt }];
    }
    return this.chat(request);
  }
}
