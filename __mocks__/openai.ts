import { jest } from '@jest/globals';

// This is the mock for the openai.chat.completions.create method
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

// Explicitly type the mock to match OpenAI's expected call signature
export const mockCreate: jest.MockedFunction<(...args: any[]) => Promise<any>> = jest.fn((...args: any[]) => {
  console.log('>>>>>>>>>> MANUAL MOCK __mocks__/openai.ts: mockCreate CALLED with:', args);
  // Default behavior: resolve with a generic success. Tests can override this.
  return Promise.resolve({
    id: 'chatcmpl-manual-mock',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-mocked-model',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Manually mocked OpenAI response' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });
});

// This is the mock for the OpenAI constructor
// Explicitly type the mock constructor as a class (typeof OpenAI)
export const mockOpenAIConstructorSpy = jest.fn().mockImplementation(function(this: any, constructorArgs: any) {
  console.log('>>>>>>>>>> MANUAL MOCK __mocks__/openai.ts: mockOpenAIConstructorSpy CALLED with:', constructorArgs);
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
