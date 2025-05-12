/**
 * @file Message conversion utilities for Google/Gemini Provider
 */

import { Content } from '@google/genai';
import { ChatMessage, Message } from '../../core/types/provider.types';

/**
 * Convert messages from the common format to Google GenAI specific format
 */
export function convertMessagesToGenAIFormat(messages: ChatMessage[] | Message[]): Content[] {
  if (!messages || messages.length === 0) return [];
  
  return messages.map((msg) => ({
    // Gemini only supports 'user' and 'model' roles
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content || "" }]
  }))
  // Filter out empty messages
  .filter(content => content.parts.every(part => typeof part.text === 'string' && part.text.length > 0));
}