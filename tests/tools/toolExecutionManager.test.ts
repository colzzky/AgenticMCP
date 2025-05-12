/**
 * @file Tests for the ToolExecutionManager class
 */

import { jest } from '@jest/globals';
import { ToolExecutionManager, ToolExecutionResult } from '../../src/tools/toolExecutionManager';
import { ToolRegistry } from '../../src/tools/toolRegistry';
import { Tool, ToolCall, Message, ProviderResponse } from '../../src/core/types/provider.types';

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock tool implementations
const mockToolImplementations: Record<string, jest.Mock> = {
  'get-weather': jest.fn().mockImplementation(async () => ({
    temperature: 72,
    condition: 'sunny',
    humidity: 45,
  })),
  'search-web': jest.fn().mockImplementation(async () => 'Search results for query'),
  'error-tool': jest.fn().mockImplementation(async () => { throw new Error('Tool execution failed'); }),
};

// Mock tool registry
const mockToolRegistry = {
  getTools: jest.fn().mockReturnValue([
    {
      type: 'function',
      name: 'get-weather',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for',
          },
        },
        required: ['location'],
      },
    },
    {
      type: 'function',
      name: 'search-web',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
    {
      type: 'function',
      name: 'error-tool',
      description: 'A tool that always fails',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  ]),
} as unknown as ToolRegistry;

// Mock LLM provider
const mockProvider = {
  get name() { return 'mock-provider'; },
  chat: jest.fn<(request: any) => Promise<ProviderResponse>>(),
  generateCompletion: jest.fn<(request: any) => Promise<ProviderResponse>>(),
  generateText: jest.fn<(request: any) => Promise<ProviderResponse>>(),
  generateTextWithToolResults: jest.fn<(request: any) => Promise<ProviderResponse>>(),
  configure: jest.fn(),
  executeToolCall: jest.fn(),
  continueWithToolResults: jest.fn(),
};

describe('ToolExecutionManager', () => {
  let toolExecutionManager: ToolExecutionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    toolExecutionManager = new ToolExecutionManager(
      mockToolRegistry,
      mockToolImplementations,
      mockLogger as any
    );
  });

  describe('executeToolCall', () => {
    it('should execute a tool call successfully', async () => {
      const toolCall: ToolCall = {
        id: 'call-123',
        type: 'function_call',
        name: 'get-weather',
        arguments: JSON.stringify({ location: 'New York' }),
      };

      const result = await toolExecutionManager.executeToolCall(toolCall);

      expect(result.success).toBe(true);
      expect(result.output).toBe(JSON.stringify({
        temperature: 72,
        condition: 'sunny',
        humidity: 45,
      }));
      expect(mockToolImplementations['get-weather']).toHaveBeenCalledWith({ location: 'New York' });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Executing tool call: get-weather'));
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('executed successfully'));
    });

    it('should handle tool execution errors', async () => {
      const toolCall: ToolCall = {
        id: 'call-456',
        type: 'function_call',
        name: 'error-tool',
        arguments: JSON.stringify({}),
      };

      const result = await toolExecutionManager.executeToolCall(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Tool execution failed');
      expect(mockToolImplementations['error-tool']).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error executing tool call'));
    });

    it('should handle unknown tools', async () => {
      const toolCall: ToolCall = {
        id: 'call-789',
        type: 'function_call',
        name: 'unknown-tool',
        arguments: JSON.stringify({}),
      };

      const result = await toolExecutionManager.executeToolCall(toolCall);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Tool not found: unknown-tool');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Tool not found'));
    });
  });

  describe('executeToolCalls', () => {
    it('should execute multiple tool calls in parallel', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call-123',
          type: 'function_call',
          name: 'get-weather',
          arguments: JSON.stringify({ location: 'New York' }),
        },
        {
          id: 'call-456',
          type: 'function_call',
          name: 'search-web',
          arguments: JSON.stringify({ query: 'TypeScript' }),
        },
      ];

      const results = await toolExecutionManager.executeToolCalls(toolCalls);

      expect(results.length).toBe(2);
      expect(results[0].call_id).toBe('call-123');
      expect(results[1].call_id).toBe('call-456');
      expect(mockToolImplementations['get-weather']).toHaveBeenCalledWith({ location: 'New York' });
      expect(mockToolImplementations['search-web']).toHaveBeenCalledWith({ query: 'TypeScript' });
    });

    it('should handle empty tool calls array', async () => {
      const results = await toolExecutionManager.executeToolCalls([]);
      expect(results).toEqual([]);
    });

    it('should handle a mix of successful and failed tool calls', async () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'call-123',
          type: 'function_call',
          name: 'get-weather',
          arguments: JSON.stringify({ location: 'New York' }),
        },
        {
          id: 'call-456',
          type: 'function_call',
          name: 'error-tool',
          arguments: JSON.stringify({}),
        },
      ];

      const results = await toolExecutionManager.executeToolCalls(toolCalls);

      expect(results.length).toBe(2);
      expect(results[0].call_id).toBe('call-123');
      expect(results[1].call_id).toBe('call-456');
      expect(results[0].output).not.toContain('error');
      expect(results[1].output).toContain('error');
    });
  });

  describe('processToolCalls', () => {
    it('should process tool calls and get a new response', async () => {
      // Initial messages
      const messages: Message[] = [
        { role: 'user', content: 'What\'s the weather in New York?' },
      ];

      // Initial response with tool calls
      const initialResponse: ProviderResponse = {
        success: true,
        content: 'Let me check the weather for you.',
        toolCalls: [
          {
            id: 'call-123',
            type: 'function_call',
            name: 'get-weather',
            arguments: JSON.stringify({ location: 'New York' }),
          },
        ],
      };

      // Mock the chat method to return a final response
      mockProvider.chat.mockResolvedValueOnce({
        success: true,
        content: 'The weather in New York is sunny and 72 degrees with 45% humidity.',
        choices: [{ text: 'The weather in New York is sunny and 72 degrees with 45% humidity.' }],
        usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 }
      } as ProviderResponse);

      // Process the tool calls
      const finalResponse = await toolExecutionManager.processToolCalls(
        mockProvider as any,
        initialResponse,
        messages
      );

      // Check that the tool was executed
      expect(mockToolImplementations['get-weather']).toHaveBeenCalledWith({ location: 'New York' });

      // Check that the provider was called with the updated messages
      expect(mockProvider.chat).toHaveBeenCalled();
      const chatCall = mockProvider.chat.mock.calls[0][0] as { messages: Message[] };
      expect(chatCall.messages.length).toBe(3); // user + assistant + tool
      expect(chatCall.messages[0].role).toBe('user');
      expect(chatCall.messages[1].role).toBe('assistant');
      expect(chatCall.messages[2].role).toBe('tool');

      // Check the final response
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toBe('The weather in New York is sunny and 72 degrees with 45% humidity.');
    });

    it('should handle recursive tool calls', async () => {
      // Initial messages
      const messages: Message[] = [
        { role: 'user', content: 'What\'s the weather in New York and search for TypeScript?' },
      ];

      // Initial response with first tool call
      const initialResponse: ProviderResponse = {
        success: true,
        content: 'Let me check the weather for you.',
        toolCalls: [
          {
            id: 'call-123',
            type: 'function_call',
            name: 'get-weather',
            arguments: JSON.stringify({ location: 'New York' }),
          },
        ],
      };

      // Second response with another tool call
      const secondResponse: ProviderResponse = {
        success: true,
        content: 'Now let me search for TypeScript.',
        toolCalls: [
          {
            id: 'call-456',
            type: 'function_call',
            name: 'search-web',
            arguments: JSON.stringify({ query: 'TypeScript' }),
          },
        ],
      };

      // Final response with no tool calls
      const finalResponse: ProviderResponse = {
        success: true,
        content: 'The weather in New York is sunny and 72 degrees. TypeScript is a programming language.',
        choices: [{ text: 'The weather in New York is sunny and 72 degrees. TypeScript is a programming language.' }],
        usage: { promptTokens: 25, completionTokens: 35, totalTokens: 60 }
      };

      // Mock the chat method to return the responses in sequence
      mockProvider.chat.mockResolvedValueOnce(secondResponse).mockResolvedValueOnce(finalResponse);

      // Process the tool calls
      const result = await toolExecutionManager.processToolCalls(
        mockProvider as any,
        initialResponse,
        messages
      );

      // Check that both tools were executed
      expect(mockToolImplementations['get-weather']).toHaveBeenCalledWith({ location: 'New York' });
      expect(mockToolImplementations['search-web']).toHaveBeenCalledWith({ query: 'TypeScript' });

      // Check that the provider was called twice
      expect(mockProvider.chat).toHaveBeenCalledTimes(2);

      // Check the final response
      expect(result.success).toBe(true);
      expect(result.content).toBe('The weather in New York is sunny and 72 degrees. TypeScript is a programming language.');
    });

    it('should return the original response if no tool calls', async () => {
      // Initial messages
      const messages: Message[] = [
        { role: 'user', content: 'Hello!' },
      ];

      // Response with no tool calls
      const response: ProviderResponse = {
        success: true,
        content: 'Hello! How can I help you today?',
      };

      // Process the response
      const result = await toolExecutionManager.processToolCalls(
        mockProvider as any,
        response,
        messages
      );

      // Check that the provider was not called
      expect(mockProvider.chat).not.toHaveBeenCalled();

      // Check that the original response was returned
      expect(result).toBe(response);
    });

    it('should handle errors in the provider', async () => {
      // Initial messages
      const messages: Message[] = [
        { role: 'user', content: 'What\'s the weather in New York?' },
      ];

      // Initial response with tool calls
      const initialResponse: ProviderResponse = {
        success: true,
        content: 'Let me check the weather for you.',
        toolCalls: [
          {
            id: 'call-123',
            type: 'function_call',
            name: 'get-weather',
            arguments: JSON.stringify({ location: 'New York' }),
          },
        ],
      };

      // Mock the chat method to throw an error
      mockProvider.chat.mockRejectedValueOnce(new Error('Provider error') as any);

      // Process the tool calls
      const result = await toolExecutionManager.processToolCalls(
        mockProvider as any,
        initialResponse,
        messages
      );

      // Check that the tool was executed
      expect(mockToolImplementations['get-weather']).toHaveBeenCalledWith({ location: 'New York' });

      // Check that the provider was called
      expect(mockProvider.chat).toHaveBeenCalled();

      // Check the error response
      expect(result.success).toBe(false);
      expect(result.content).toContain('Error processing tool results');
      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('Provider error');
    });
  });

  describe('registerToolImplementation', () => {
    it('should register a new tool implementation', () => {
      const newTool = jest.fn();
      const result = toolExecutionManager.registerToolImplementation('new-tool', newTool);
      
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Registered tool implementation: new-tool'));
      
      // Verify the tool was registered by checking the implementations
      const implementations = toolExecutionManager.getToolImplementations();
      expect(implementations['new-tool']).toBe(newTool);
    });

    it('should not register a tool with an existing name', () => {
      const newTool = jest.fn();
      const result = toolExecutionManager.registerToolImplementation('get-weather', newTool);
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });
  });
});
