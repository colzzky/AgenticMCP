import { jest } from '@jest/globals';
// Import the actual mock functions from the __mocks__ directory
// Adjust the path based on the location of jest.setup.ts relative to __mocks__
import { mockOpenAIConstructorSpy, mockCreate } from '../__mocks__/openai.js';
import { mockAnthropicConstructorSpy, mockMessagesCreate } from '../__mocks__/@anthropic-ai/sdk.js';

console.log('>>>>>>>>>> GLOBAL JEST.SETUP.TS EXECUTED');

// Mock OpenAI
jest.doMock('openai', () => {
  console.log('>>>>>>>>>> jest.doMock FACTORY EXECUTED FOR OPENAI IN JEST.SETUP.TS');
  // This factory should return the structure of the 'openai' module,
  // pointing to our imported spies.
  return {
    __esModule: true, // Indicate ESM module
    default: mockOpenAIConstructorSpy, // For `import OpenAI from 'openai'`
    OpenAI: mockOpenAIConstructorSpy,  // For `import { OpenAI } from 'openai'`
    // Note: mockCreate is part of the instance created by mockOpenAIConstructorSpy,
    // so it doesn't need to be returned at this top level of the module mock.
  };
});

// Mock Anthropic SDK
jest.doMock('@anthropic-ai/sdk', () => {
  console.log('>>>>>>>>>> jest.doMock FACTORY EXECUTED FOR ANTHROPIC IN JEST.SETUP.TS');
  return {
    __esModule: true,
    default: mockAnthropicConstructorSpy,
    mockMessagesCreate  // Export this for test assertions
  };
});
