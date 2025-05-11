import { jest } from '@jest/globals';

// Create a mock for the messages.create method
export const mockMessagesCreate = jest.fn().mockImplementation((params: any) => {
  return Promise.resolve({
    id: 'msg_mock',
    type: 'message',
    role: 'assistant',
    content: [
      { type: 'text', text: 'Hello! How can I help you today?' }
    ],
    model: params?.model || 'claude-3-5-sonnet-latest',
    usage: {
      input_tokens: 10,
      output_tokens: 15,
    }
  });
});

// Create a MockMessages class
class MockMessages {
  create = mockMessagesCreate;
}

// Create the Anthropic constructor spy
export const mockAnthropicConstructorSpy = jest.fn().mockImplementation(function(constructorArgs: any) {
  return {
    apiKey: constructorArgs?.apiKey,
    messages: new MockMessages(),
  };
});

// Mock the default export (which is the Anthropic class)
const Anthropic = mockAnthropicConstructorSpy;
export default Anthropic;