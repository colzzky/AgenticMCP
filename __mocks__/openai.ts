import { jest } from '@jest/globals';

// This is the mock for the openai.chat.completions.create method
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions.js';

// Explicitly type the mock to match OpenAI's expected call signature
export const mockCreate: jest.MockedFunction<(...args: any[]) => Promise<any>> = jest.fn((...args: any[]) => {
  // Default behavior: resolve with a generic success. Tests can override this.
  const params = args[0] || {};

  // Default response without tool calls
  const response = {
    id: 'chatcmpl-manual-mock',
    object: 'chat.completion',
    created: Date.now(),
    model: params.model || 'gpt-mocked-model',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Manually mocked OpenAI response',
        },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };

  // Always ensure success
  response.choices[0].message = response.choices[0].message || {};

  // Check if tools are provided in the request and modify the response accordingly
  if (params.tools && params.tools.length > 0) {
    // For testing, we'll simulate a tool call response when tools are present
    response.choices[0].message.content = ''; // Set empty string instead of null for TypeScript
    // Add tool_calls to message
    (response.choices[0].message as any).tool_calls = [
      {
        id: 'call_mock12345',
        type: 'function',
        function: {
          name: params.tools[0].function.name,
          arguments: JSON.stringify({
            parameter1: 'value1',
            parameter2: 'value2'
          })
        }
      }
    ];
    response.choices[0].finish_reason = 'tool_calls';
  }

  return Promise.resolve(response);
});

// This is the mock for the OpenAI constructor
// Explicitly type the mock constructor as a class (typeof OpenAI)
export const mockOpenAIConstructorSpy = jest.fn().mockImplementation(function(this: any, constructorArgs: any) {
  return {
    chat: {
      completions: {
        create: mockCreate, // Ensure the instance uses our exported mockCreate
      },
    },
    // Add any other methods or properties of the OpenAI client instance that are used
  };
}) as unknown as typeof import('openai').default;

// Mock the default export (which is the OpenAI class)
const OpenAI = mockOpenAIConstructorSpy;
export default OpenAI;

// If there are other named exports from 'openai' that your code uses, mock them here too.
// For example, if you were using `import { APIError } from 'openai';` somewhere:
// export class APIError extends Error { constructor(message: string) { super(message); } }
