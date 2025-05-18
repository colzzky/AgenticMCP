/**
 * @file Tool extraction utilities for Google/Gemini Provider
 */

import { ToolCall } from '../../core/types/provider.types';
import { type GenerateContentResponse } from '@google/genai';

/**
 * Extracts tool/function calls from the Google Gemini response
 */
export function extractToolCallsFromGenAIResponse(response: GenerateContentResponse): ToolCall[] | undefined {
  if (!response?.candidates?.[0]?.content?.parts) return undefined;

  const toolCalls: ToolCall[] = [];
  const parts = response.candidates[0].content.parts;

  // Process function call parts
  for (const part of parts) {
    if (part.functionCall) {
      const uniqueId = `${part.functionCall.name}_${Date.now()}`;
      toolCalls.push({
        id: uniqueId,
        call_id: uniqueId,
        type: 'function_call',
        name: part.functionCall.name!,
        arguments: JSON.stringify(part.functionCall.args)
      });
    }
  }

  // Check for functionCalls property in some response formats
  if (response.functionCalls && response.functionCalls.length > 0) {
    for (const call of response.functionCalls) {
      const uniqueId = `${call.name}_${Date.now()}`;
      toolCalls.push({
        id: uniqueId,
        call_id: uniqueId,
        type: 'function_call',
        name: call.name!,
        arguments: JSON.stringify(call.args)
      });
    }
  }

  return toolCalls.length > 0 ? toolCalls : undefined;
}