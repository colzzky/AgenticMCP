import { jest } from '@jest/globals';
export class AnthropicProvider {
  setToolRegistry = jest.fn();
  getAvailableTools = jest.fn();
  configure = jest.fn();
}
const anthropicProvider = {
  setToolRegistry: jest.fn(),
  getAvailableTools: jest.fn(),
  configure: jest.fn(),
};
export default anthropicProvider;
