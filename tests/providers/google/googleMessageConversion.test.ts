/**
 * @file Tests for Google/Gemini Provider message conversion utilities
 */
import { describe, it, expect } from '@jest/globals';
import { convertMessagesToGenAIFormat } from '../../../src/providers/google/googleMessageConversion.js';
import type { ChatMessage, Message } from '../../../src/core/types/provider.types.js';

describe('Google Message Conversion Utilities', () => {
  describe('convertMessagesToGenAIFormat', () => {
    it('should convert standard chat messages to GenAI format', () => {
      // Setup - Create sample messages
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I am doing well, thank you for asking.' },
        { role: 'user', content: 'Tell me about the weather today.' }
      ];

      // Execute
      const converted = convertMessagesToGenAIFormat(messages);

      // Verify
      expect(converted).toHaveLength(3);
      
      // Check user messages
      expect(converted[0].role).toBe('user');
      expect(converted[0].parts[0].text).toBe('Hello, how are you?');
      
      // Check that 'assistant' is converted to 'model'
      expect(converted[1].role).toBe('model');
      expect(converted[1].parts[0].text).toBe('I am doing well, thank you for asking.');
      
      // Check second user message
      expect(converted[2].role).toBe('user');
      expect(converted[2].parts[0].text).toBe('Tell me about the weather today.');
    });

    it('should handle system messages as user messages', () => {
      // Setup - Create messages with system message
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What can you help me with?' }
      ];

      // Execute
      const converted = convertMessagesToGenAIFormat(messages);

      // Verify
      expect(converted).toHaveLength(2);
      
      // System message should be converted to user (Gemini doesn't support system messages)
      expect(converted[0].role).toBe('user');
      expect(converted[0].parts[0].text).toBe('You are a helpful assistant.');
    });

    it('should filter out empty messages', () => {
      // Setup - Create messages with empty content
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' },
        { role: 'user', content: 'Are you there?' },
        { role: 'assistant', content: null as any } // Simulating a null content
      ];

      // Execute
      const converted = convertMessagesToGenAIFormat(messages);

      // Verify - only non-empty messages should be included
      expect(converted).toHaveLength(2);
      expect(converted[0].parts[0].text).toBe('Hello');
      expect(converted[1].parts[0].text).toBe('Are you there?');
    });

    it('should handle empty or undefined input', () => {
      // Test with empty array
      expect(convertMessagesToGenAIFormat([])).toEqual([]);
      
      // Test with undefined (should be handled as empty array)
      expect(convertMessagesToGenAIFormat(undefined as any)).toEqual([]);
    });

    it('should handle message objects with tool calls', () => {
      // Setup - Create messages with tool calls (more complex structure)
      const messages: Message[] = [
        { 
          role: 'user', 
          content: 'What is the weather in Seattle?' 
        },
        {
          role: 'assistant',
          content: 'I need to check the weather for you.',
          tool_calls: [
            {
              id: 'call_123',
              name: 'get_weather',
              arguments: JSON.stringify({
                location: 'Seattle',
                unit: 'celsius'
              })
            }
          ]
        }
      ];

      // Execute
      const converted = convertMessagesToGenAIFormat(messages);

      // Verify - tool calls aren't directly supported in this conversion, but basic content is preserved
      expect(converted).toHaveLength(2);
      expect(converted[0].role).toBe('user');
      expect(converted[1].role).toBe('model');
      expect(converted[1].parts[0].text).toBe('I need to check the weather for you.');
    });

    it('should maintain order of messages', () => {
      // Setup - Create a longer conversation with various roles
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello! How can I help you today?' },
        { role: 'user', content: 'What do you know about Paris?' },
        { role: 'assistant', content: 'Paris is the capital of France...' },
        { role: 'user', content: 'And what about Rome?' }
      ];

      // Execute
      const converted = convertMessagesToGenAIFormat(messages);

      // Verify
      expect(converted).toHaveLength(6);
      
      // Check sequence of user/model messages is maintained
      expect(converted.map(msg => msg.role)).toEqual([
        'user', 'user', 'model', 'user', 'model', 'user'
      ]);
      
      // Check content order is maintained
      expect(converted.map(msg => msg.parts[0].text)).toEqual([
        'You are a helpful assistant.',
        'Hi',
        'Hello! How can I help you today?',
        'What do you know about Paris?',
        'Paris is the capital of France...',
        'And what about Rome?'
      ]);
    });
  });
});