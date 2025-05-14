// src/providers/openai/openaiProviderMappers.ts
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { Message, Tool } from '../../core/types';

/**
 * Maps a single internal Message object to an OpenAI ChatCompletionMessageParam object.
 */
export function mapMessageToOpenAIParam(message: Message): ChatCompletionMessageParam {
  let mapped: ChatCompletionMessageParam;

  switch (message.role) {
    case 'system': {
      mapped = { role: 'system', content: message.content };
      break;
    }
    case 'user': {
      mapped = { role: 'user', content: message.content };
      if (message.name) {
        (mapped as OpenAI.Chat.ChatCompletionUserMessageParam).name = message.name;
      }
      break;
    }
    case 'assistant': {
      mapped = { role: 'assistant', content: message.content || '' }; // Assistant content can be null if tool_calls are present
      if (message.tool_calls && message.tool_calls.length > 0) {
        (mapped as OpenAI.Chat.ChatCompletionAssistantMessageParam).tool_calls = message.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        }));
      } else {
        // Ensure content is not empty if no tool_calls, as per OpenAI spec for some cases
        if (mapped.content === null) mapped.content = ""; 
      }
      if (message.name) {
        (mapped as OpenAI.Chat.ChatCompletionAssistantMessageParam).name = message.name;
      }
      break;
    }
    case 'tool': {
      if (!message.tool_call_id) {
        throw new Error('Tool message must have a tool_call_id.');
      }
      mapped = {
        role: 'tool',
        tool_call_id: message.tool_call_id,
        content: message.content,
      };
      break;
    }
    default: {
      // Should not happen if Message type is enforced
      throw new Error(`Unsupported message role: ${(message as any).role}`);
    }
  }
  return mapped;
}

/**
 * Maps an array of internal Tool objects to an array of OpenAI ChatCompletionTool objects.
 */
export function mapToolsToOpenAIChatTools(tools: Tool[]): ChatCompletionTool[] {
  return tools.map((tool) => {
    const chatTool: ChatCompletionTool = {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as OpenAI.FunctionParameters
      }
    };
    
    // Add strict mode if specified
    if (tool.strict !== undefined) {
      chatTool.function.strict = tool.strict;
    }
    
    return chatTool;
  });
}
