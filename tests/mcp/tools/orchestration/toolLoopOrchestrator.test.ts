/**
 * @file Tests for ToolLoopOrchestrator
 */
import { ToolLoopOrchestrator } from '@/mcp/tools/orchestration/toolLoopOrchestrator';
import { LLMProvider, ProviderResponse, ToolCall } from '@/core/types/provider.types';
import { ToolExecutor } from '@/tools/toolExecutor';
import { Logger } from '@/core/types/logger.types';
import { jest } from '@jest/globals';

describe('ToolLoopOrchestrator', () => {
  // Mock dependencies
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as unknown as Logger;

  const mockToolExecutor = {
    executeTool: jest.fn()
  } as unknown as ToolExecutor;

  // Create test subject
  let orchestrator: ToolLoopOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new ToolLoopOrchestrator(mockLogger, mockToolExecutor);
  });

  describe('orchestrate', () => {
    it('should use provider-specific implementation when available', async () => {
      // Setup
      const mockProviderResponse: ProviderResponse = {
        content: 'Final response',
        model: 'test-model'
      };

      const mockProvider = {
        orchestrateToolLoop: jest.fn().mockResolvedValue(mockProviderResponse),
        chat: jest.fn(),
        generateTextWithToolResults: jest.fn()
      } as unknown as LLMProvider;

      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test-model'
      };

      // Execute
      const result = await orchestrator.orchestrate(mockProvider, request);

      // Assert
      expect(mockProvider.orchestrateToolLoop).toHaveBeenCalledWith(
        request,
        mockToolExecutor,
        expect.any(Object)
      );
      expect(result).toBe(mockProviderResponse);
      expect(mockLogger.debug).toHaveBeenCalledWith('Using provider-specific tool loop orchestration');
    });

    it('should handle a sequence of tool calls and return final response', async () => {
      // Setup - Mock LLM provider without orchestrateToolLoop method
      const toolCall1: ToolCall = {
        id: 'tool-call-1',
        name: 'calculator',
        arguments: JSON.stringify({ operation: 'add', a: 5, b: 7 })
      };

      const toolCall2: ToolCall = {
        id: 'tool-call-2',
        name: 'weather',
        arguments: JSON.stringify({ location: 'San Francisco' })
      };

      // First response contains tool calls
      const firstResponse: ProviderResponse = {
        content: 'I need to calculate something',
        model: 'test-model',
        toolCalls: [toolCall1]
      };

      // Second response also contains tool calls
      const secondResponse: ProviderResponse = {
        content: 'Now I need to check the weather',
        model: 'test-model',
        toolCalls: [toolCall2]
      };

      // Final response has no tool calls
      const finalResponse: ProviderResponse = {
        content: 'The result is 12 and the weather is sunny',
        model: 'test-model'
      };

      const mockProvider = {
        chat: jest.fn().mockResolvedValue(firstResponse),
        generateTextWithToolResults: jest.fn()
          .mockResolvedValueOnce(secondResponse)
          .mockResolvedValueOnce(finalResponse)
      } as unknown as LLMProvider;

      // Mock tool results
      mockToolExecutor.executeTool
        .mockResolvedValueOnce(12) // First tool call result
        .mockResolvedValueOnce({ temperature: 72, condition: 'Sunny' }); // Second tool call result

      const request = {
        messages: [{ role: 'user', content: 'Calculate 5+7 and tell me the weather in SF' }],
        model: 'test-model'
      };

      // Execute
      const result = await orchestrator.orchestrate(mockProvider, request);

      // Assert
      expect(mockProvider.chat).toHaveBeenCalledWith(request);
      expect(mockProvider.generateTextWithToolResults).toHaveBeenCalledTimes(2);
      
      // Verify tool execution
      expect(mockToolExecutor.executeTool).toHaveBeenCalledTimes(2);
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith('calculator', { operation: 'add', a: 5, b: 7 });
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith('weather', { location: 'San Francisco' });
      
      // Verify final result
      expect(result).toBe(finalResponse);
      expect(result.content).toBe('The result is 12 and the weather is sunny');
    });

    it('should throw an error when maximum iterations are reached', async () => {
      // Setup - Mock provider that always returns tool calls
      const toolCall: ToolCall = {
        id: 'repeat-tool-call',
        name: 'calculator',
        arguments: JSON.stringify({ operation: 'add', a: 5, b: 7 })
      };

      const responseWithToolCall: ProviderResponse = {
        content: 'I need to calculate something',
        model: 'test-model',
        toolCalls: [toolCall]
      };

      const mockProvider = {
        chat: jest.fn().mockResolvedValue(responseWithToolCall),
        generateTextWithToolResults: jest.fn().mockResolvedValue(responseWithToolCall)
      } as unknown as LLMProvider;

      // Mock tool executor to always return a value
      mockToolExecutor.executeTool.mockResolvedValue(12);

      const request = {
        messages: [{ role: 'user', content: 'Calculate endlessly' }],
        model: 'test-model'
      };

      // Set a very low max iterations to speed up the test
      const options = { maxIterations: 3 };

      // Execute and assert
      await expect(orchestrator.orchestrate(mockProvider, request, options))
        .rejects.toThrow(`Reached maximum iterations (${options.maxIterations}) in tool calling loop`);

      // Verify the number of iterations
      expect(mockProvider.chat).toHaveBeenCalledTimes(1);
      expect(mockProvider.generateTextWithToolResults).toHaveBeenCalledTimes(options.maxIterations - 1);
    });

    it('should handle tool execution errors gracefully', async () => {
      // Setup
      const toolCall: ToolCall = {
        id: 'error-tool-call',
        name: 'failingTool',
        arguments: JSON.stringify({ shouldFail: true })
      };

      const responseWithToolCall: ProviderResponse = {
        content: 'I will call a tool that will fail',
        model: 'test-model',
        toolCalls: [toolCall]
      };

      const finalResponse: ProviderResponse = {
        content: 'I got an error but handled it',
        model: 'test-model'
      };

      const mockProvider = {
        chat: jest.fn().mockResolvedValue(responseWithToolCall),
        generateTextWithToolResults: jest.fn().mockResolvedValue(finalResponse)
      } as unknown as LLMProvider;

      // Mock tool executor to throw an error
      const expectedError = new Error('Tool execution failed');
      mockToolExecutor.executeTool.mockRejectedValue(expectedError);

      const request = {
        messages: [{ role: 'user', content: 'Call a failing tool' }],
        model: 'test-model'
      };

      // Execute
      const result = await orchestrator.orchestrate(mockProvider, request);

      // Assert
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith('failingTool', { shouldFail: true });
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error executing tool'));
      
      // Verify that the error was properly passed to the LLM in the tool output
      expect(mockProvider.generateTextWithToolResults).toHaveBeenCalledWith(
        expect.objectContaining({
          tool_outputs: expect.arrayContaining([
            expect.objectContaining({
              call_id: 'error-tool-call',
              output: expect.stringContaining('Error: Tool execution failed')
            })
          ])
        })
      );
      
      expect(result).toBe(finalResponse);
    });

    it('should call onProgress callback for each iteration', async () => {
      // Setup
      const toolCall: ToolCall = {
        id: 'tool-call-1',
        name: 'calculator',
        arguments: JSON.stringify({ operation: 'add', a: 5, b: 7 })
      };

      const firstResponse: ProviderResponse = {
        content: 'I need to calculate something',
        model: 'test-model',
        toolCalls: [toolCall]
      };

      const finalResponse: ProviderResponse = {
        content: 'The result is 12',
        model: 'test-model'
      };

      const mockProvider = {
        chat: jest.fn().mockResolvedValue(firstResponse),
        generateTextWithToolResults: jest.fn().mockResolvedValue(finalResponse)
      } as unknown as LLMProvider;

      mockToolExecutor.executeTool.mockResolvedValue(12);

      const request = {
        messages: [{ role: 'user', content: 'Calculate 5+7' }],
        model: 'test-model'
      };

      // Mock progress callback
      const onProgress = jest.fn();

      // Execute
      await orchestrator.orchestrate(mockProvider, request, { onProgress });

      // Assert
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(1, firstResponse);
      expect(onProgress).toHaveBeenCalledWith(2, finalResponse);
    });
  });
});