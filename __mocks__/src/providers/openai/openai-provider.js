import { jest } from '@jest/globals';
export class OpenAIProvider {
  setToolRegistry = jest.fn();
  getAvailableTools = jest.fn();
  configure = jest.fn();
}
const openaiProvider = {
  setToolRegistry: jest.fn(),
  getAvailableTools: jest.fn(),
  configure: jest.fn(),
};
export default openaiProvider;
