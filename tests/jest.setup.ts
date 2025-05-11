import { jest } from '@jest/globals';
// Import the actual mock functions from the __mocks__ directory
// Adjust the path based on the location of jest.setup.ts relative to __mocks__
import { mockOpenAIConstructorSpy, mockCreate } from '../__mocks__/openai.js';

console.log('>>>>>>>>>> GLOBAL JEST.SETUP.TS EXECUTED');

jest.doMock('openai', () => {
  console.log('>>>>>>>>>> jest.doMock FACTORY EXECUTED IN JEST.SETUP.TS');
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
