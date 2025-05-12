/**
 * @file Tests for the ConversationManager class
 */

import { jest } from '@jest/globals';
import { ConversationManager } from '../../src/conversation/conversationManager';
import { ToolExecutor } from '../../src/tools/toolExecutor';
import { ToolResultFormatter } from '../../src/tools/toolResultFormatter';
import {
  Message,
  ToolCall,
  ToolCallOutput,
  ProviderRequest,
  ProviderResponse,
  ToolResultsRequest,
  LLMProvider
} from '../../src/core/types/provider.types';

// Create test directory if it doesn't exist
describe('ConversationManager', () => {
  // Mock dependencies
  const mockToolExecutor = {
    executeToolCalls: jest.fn(),
    executeToolCall: jest.fn(),
    registerToolImplementation: jest.fn(),
    getToolImplementations: jest.fn(),
  } as unknown as ToolExecutor;

  const mockToolResultFormatter = {
    formatResult: jest.fn(),
    formatResults: jest.fn(),
  } as unknown as ToolResultFormatter;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // Mock LLM provider
  const mockProvider = {
    get name() { return 'MockProvider'; },
    configure: jest.fn(),
    generateCompletion: jest.fn(),
    chat: jest.fn(),
    executeToolCall: jest.fn(),
    generateText: jest.fn(),
    generateTextWithToolResults: jest.fn(),
    continueWithToolResults: jest.fn()
  } as jest.Mocked<LLMProvider>;

  let conversationManager: ConversationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    conversationManager = new ConversationManager(
      mockToolExecutor,
      mockToolResultFormatter,
      mockLogger as any,
      {
        maxTurns: 5,
        autoExecuteTools: true,
      }
    );
  });

  describe('startConversation', () => {
    it('should start a new conversation and get a response from the LLM', async () => {
      // Mock LLM response with no tool calls
      mockProvider.generateText.mockResolvedValueOnce({
        content: 'Hello, how can I help you?',
        success: true,
        choices: [{ text: 'Hello, how can I help you?' }],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
      } as ProviderResponse);

      const initialMessages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const result = await conversationManager.startConversation(mockProvider, initialMessages);

      expect(result.response).toBe('Hello, how can I help you?');
      expect(result.shouldContinue).toBe(false);
      expect(mockProvider.generateText).toHaveBeenCalled();
      const callArg = mockProvider.generateText.mock.calls[0][0];
      expect(callArg.messages && callArg.messages[0]).toEqual(initialMessages[0]);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting new conversation');
    });

    it('should handle tool calls in the LLM response', async () => {
      // Mock tool calls in LLM response
      const toolCalls: ToolCall[] = [
        {
          id: 'call-123',
          type: 'function_call',
          name: 'get-weather',
          arguments: JSON.stringify({ location: 'New York' }),
        },
      ];

      mockProvider.generateText.mockResolvedValueOnce({
        content: 'Let me check the weather for you.',
        toolCalls,
        success: true,
        choices: [{ text: 'Let me check the weather for you.' }],
        usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
      } as ProviderResponse);

      // Mock tool execution results
      const toolCallOutputs: ToolCallOutput[] = [
        {
          type: 'function_call_output',
          call_id: 'call-123',
          output: JSON.stringify({
            temperature: 72,
            condition: 'sunny',
            humidity: 45,
          }),
        },
      ];

      (mockToolExecutor.executeToolCalls as any).mockImplementation(async () => toolCallOutputs);

      // Mock LLM response with tool results
      mockProvider.generateTextWithToolResults.mockResolvedValueOnce({
        content: 'The weather in New York is sunny and 72 degrees with 45% humidity.',
        success: true,
        choices: [{ text: 'The weather in New York is sunny and 72 degrees with 45% humidity.' }],
        usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 }
      } as ProviderResponse);

      const initialMessages: Message[] = [
        { role: 'user', content: 'What\'s the weather in New York?' },
      ];

      const result = await conversationManager.startConversation(mockProvider, initialMessages);

      expect(result.response).toBe('The weather in New York is sunny and 72 degrees with 45% humidity.');
      expect(result.shouldContinue).toBe(true);
      expect(result.toolCalls).toEqual(toolCalls);
      expect(result.toolCallOutputs).toEqual(toolCallOutputs);

      expect(mockProvider.generateText).toHaveBeenCalled();
      const callArg = mockProvider.generateText.mock.calls[0][0];
      expect(callArg.messages && callArg.messages[0]).toEqual(initialMessages[0]);

      expect(mockToolExecutor.executeToolCalls).toHaveBeenCalledWith(toolCalls);

      // Check that tool results were passed to the LLM
      expect(mockProvider.generateTextWithToolResults).toHaveBeenCalled();
      const toolResultsCall = mockProvider.generateTextWithToolResults.mock.calls[0][0] as ToolResultsRequest;
      expect(toolResultsCall.toolCalls).toEqual(toolCalls);
      expect(toolResultsCall.toolCallOutputs).toEqual(toolCallOutputs);
    });
  });

  describe('continueConversation', () => {
    it('should continue an existing conversation with new messages', async () => {
      // Set up initial conversation
      mockProvider.generateText.mockResolvedValueOnce({
        content: 'Hello, how can I help you?',
        success: true,
        choices: [{ text: 'Hello, how can I help you?' }],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
      } as ProviderResponse);

      const initialMessages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      await conversationManager.startConversation(mockProvider, initialMessages);

      // Continue the conversation
      mockProvider.generateText.mockResolvedValueOnce({
        content: 'I can help you with that.',
        success: true,
        choices: [{ text: 'I can help you with that.' }],
        usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
      } as ProviderResponse);

      const newMessages: Message[] = [
        { role: 'user', content: 'Can you help me with something?' },
      ];

      const result = await conversationManager.continueConversation(mockProvider, newMessages);

      expect(result.response).toBe('I can help you with that.');
      expect(result.shouldContinue).toBe(false);

      // Check that the conversation history was updated correctly
      const history = conversationManager.getConversationHistory();
      expect(history.length).toBe(4); // Initial user + assistant + new user + new assistant
      expect(history[0].content).toBe('Hello!');
      expect(history[1].content).toBe('Hello, how can I help you?');
      expect(history[2].content).toBe('Can you help me with something?');
      expect(history[3].content).toBe('I can help you with that.');
    });

    it('should respect the maximum number of turns', async () => {
      // Create a conversation manager with a low max turns
      const limitedManager = new ConversationManager(
        mockToolExecutor,
        mockToolResultFormatter,
        mockLogger as any,
        {
          maxTurns: 1,
          autoExecuteTools: true,
        }
      );

      // First turn
      mockProvider.generateText.mockResolvedValueOnce({
        content: 'Hello!',
        success: true,
        choices: [{ text: 'Hello!' }],
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 }
      } as ProviderResponse);

      await limitedManager.startConversation(mockProvider, [
        { role: 'user', content: 'Hi' },
      ]);

      // Second turn (should hit the limit)
      const result = await limitedManager.continueConversation(mockProvider, [
        { role: 'user', content: 'How are you?' },
      ]);

      expect(result.response).toContain('maximum number of conversation turns');
      expect(result.shouldContinue).toBe(false);
      expect(mockProvider.generateText).toHaveBeenCalled();
      const firstCallArg = mockProvider.generateText.mock.calls[0][0];
      expect(firstCallArg.messages && firstCallArg.messages[0]).toEqual({ role: 'user', content: 'Hi' });
      // Should not call generateText for the second turn since maxTurns = 1
      expect(mockProvider.generateText).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors from the LLM', async () => {
      mockProvider.generateText.mockRejectedValueOnce(new Error('LLM API error'));

      const initialMessages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const result = await conversationManager.startConversation(mockProvider, initialMessages);

      expect(result.response).toContain('I encountered an error');
      expect(result.shouldContinue).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error in conversation turn'));
    });

    it('should handle errors from tool execution', async () => {
      // Mock tool calls in LLM response
      const toolCalls: ToolCall[] = [
        {
          id: 'call-123',
          type: 'function_call',
          name: 'get-weather',
          arguments: JSON.stringify({ location: 'New York' }),
        },
      ];

      mockProvider.generateText.mockResolvedValueOnce({
        content: 'Let me check the weather for you.',
        toolCalls,
        success: true,
        choices: [{ text: 'Let me check the weather for you.' }],
        usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
      } as ProviderResponse);

      // Mock tool execution error
      (mockToolExecutor.executeToolCalls as any).mockImplementation(async () => { throw new Error('Tool execution failed'); });

      const initialMessages: Message[] = [
        { role: 'user', content: 'What\'s the weather in New York?' },
      ];

      const result = await conversationManager.startConversation(mockProvider, initialMessages);

      expect(result.response).toContain('I encountered an error');
      expect(result.shouldContinue).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error in conversation turn'));
    });
  });

  describe('resetConversation', () => {
    it('should reset the conversation state', async () => {
      // Set up initial conversation
      mockProvider.generateText.mockResolvedValueOnce({
        content: 'Hello, how can I help you?',
        success: true,
        choices: [{ text: 'Hello, how can I help you?' }],
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
      } as ProviderResponse);

      const initialMessages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      await conversationManager.startConversation(mockProvider, initialMessages);

      // Check that conversation history exists
      expect(conversationManager.getConversationHistory().length).toBeGreaterThan(0);

      // Reset the conversation
      conversationManager.resetConversation();

      // Check that conversation history is empty
      expect(conversationManager.getConversationHistory().length).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Conversation reset');
    });
  });
});
