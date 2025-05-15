import type OpenAI from 'openai';
import type { ProviderResponse, ToolCall } from '../../core/types/provider.types';

/**
 * Handles provider errors and returns a standardized ProviderResponse.
 */
export function handleProviderError(logger: { error: (msg: string) => void }, error: unknown, context: string): ProviderResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Error in ${context}: ${errorMessage}`);
  return { success: false, error: { message: errorMessage } };
}

/**
 * Builds a ProviderResponse from an OpenAI ChatCompletion response.
 */
export function buildProviderResponseFromCompletion(
  logger: { debug: (msg: string) => void; error: (msg: string) => void },
  completion: OpenAI.Chat.Completions.ChatCompletion
): ProviderResponse {
  logger.debug(`Received response from OpenAI API`);

  const responseChoice = completion.choices[0];
  if (!responseChoice) {
    logger.error('No completion choices returned from OpenAI API');
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
