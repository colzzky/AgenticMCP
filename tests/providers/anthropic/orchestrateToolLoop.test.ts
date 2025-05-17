import { mock, MockProxy } from 'jest-mock-extended';
import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { orchestrateToolLoop } from '../../../src/providers/providerUtils';
import type {
  LLMProvider,
  ProviderRequest,
  ProviderResponse,
  ToolCall,
  ToolCallOutput,
  RecursiveToolLoopOptions,
} from '../../../src/core/types/provider.types';
import type { Logger } from '../../../src/core/types/logger.types';
import { ToolExecutor } from '../../../src/tools/toolExecutor';

// Helper to create a mock ToolCall
function makeToolCall(id: string, name: string, args: object): ToolCall {
  return {
    id,
    name,
    arguments: JSON.stringify(args),
  };
}

describe('orchestrateToolLoop', () => {
  let mockProvider: MockProxy<LLMProvider>;
  let mockToolExecutor: MockProxy<ToolExecutor>;
  let mockLogger: MockProxy<Logger>;
  let request: ProviderRequest;

  beforeEach(() => {
    mockProvider = mock<LLMProvider>();
    mockToolExecutor = mock<ToolExecutor>();
    mockLogger = mock<Logger>();
    request = {
      messages: [
        { role: 'user', content: 'What is the weather in Paris?' },
      ],
      model: 'test-model',
      temperature: 0.2,
    };
    jest.resetAllMocks();
  });

  it('should loop LLM -> Tool -> LLM and return final response', async () => {
    // Step 1: LLM returns a tool call
    const toolCall = makeToolCall('tool-1', 'getWeather', { location: 'Paris' });
    const firstResponse: ProviderResponse = {
      content: 'Let me check the weather.',
      toolCalls: [toolCall],
    };
    // Step 2: ToolExecutor returns a result, LLM returns final answer
    const toolResult: ToolCallOutput = {
      type: 'function_call_output',
      call_id: 'tool-1',
      output: 'It is 18°C and sunny.',
    };
    const finalResponse: ProviderResponse = {
      content: 'The weather in Paris is 18°C and sunny.',
      toolCalls: [],
    };
    // Mock provider.chat and provider.generateTextWithToolResults
    mockProvider.chat.mockResolvedValueOnce(firstResponse);
    mockProvider.generateTextWithToolResults.mockResolvedValueOnce(finalResponse);
    // Mock toolExecutor.executeTool
    mockToolExecutor.executeTool.mockResolvedValueOnce(toolResult.output);

    const response = await orchestrateToolLoop(
      mockProvider,
      request,
      mockToolExecutor,
      mockLogger,
      { verbose: true }
    );
    expect(response.content).toBe('The weather in Paris is 18°C and sunny.');
    expect(mockProvider.chat).toHaveBeenCalledTimes(1);
    expect(mockProvider.generateTextWithToolResults).toHaveBeenCalledTimes(1);
    expect(mockToolExecutor.executeTool).toHaveBeenCalledWith('getWeather', { location: 'Paris' });
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle tool execution error gracefully', async () => {
    const toolCall = makeToolCall('tool-err', 'failTool', { foo: 'bar' });
    const firstResponse: ProviderResponse = {
      content: 'Let me try.',
      toolCalls: [toolCall],
    };
    mockProvider.chat.mockResolvedValueOnce(firstResponse);
    // ToolExecutor throws
    mockToolExecutor.executeTool.mockRejectedValueOnce(new Error('Tool failed'));
    const finalResponse: ProviderResponse = {
      content: 'Sorry, there was an error.',
      toolCalls: [],
    };
    mockProvider.generateTextWithToolResults.mockResolvedValueOnce(finalResponse);
    const response = await orchestrateToolLoop(
      mockProvider,
      request,
      mockToolExecutor,
      mockLogger,
      { verbose: false }
    );
    expect(response.content).toBe('Sorry, there was an error.');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error executing tool failTool'),
    );
  });

  it('should throw if maxIterations is exceeded', async () => {
    const toolCall = makeToolCall('tool-loop', 'loopTool', {});
    const response: ProviderResponse = {
      content: 'Looping...',
      toolCalls: [toolCall],
    };
    mockProvider.chat.mockResolvedValue(response);
    mockProvider.generateTextWithToolResults.mockResolvedValue(response);
    mockToolExecutor.executeTool.mockResolvedValue('ok');
    await expect(
      orchestrateToolLoop(
        mockProvider,
        request,
        mockToolExecutor,
        mockLogger,
        { maxIterations: 2 }
      )
    ).rejects.toThrow(/maximum iterations/);
  });

  it('should return immediately if no tool calls', async () => {
    const response: ProviderResponse = {
      content: 'No tools needed.',
      toolCalls: [],
    };
    mockProvider.chat.mockResolvedValueOnce(response);
    const result = await orchestrateToolLoop(
      mockProvider,
      request,
      mockToolExecutor,
      mockLogger
    );
    expect(result.content).toBe('No tools needed.');
    expect(mockProvider.chat).toHaveBeenCalledTimes(1);
    expect(mockProvider.generateTextWithToolResults).not.toHaveBeenCalled();
  });
});
