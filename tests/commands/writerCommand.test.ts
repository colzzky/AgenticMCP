// Writer command test for AgenticMCP
import { describe, it, expect, jest } from '@jest/globals';
import { WriterCommand } from '../../src/commands/writerCommand';
import type { CommandContext } from '../../src/core/types/command.types';

describe('WriterCommand', () => {
  let writer: WriterCommand;
  let mockProvider: any;
  let mockContext: CommandContext;

  beforeEach(() => {
    writer = new WriterCommand();
    mockProvider = {
      generateText: jest.fn<(options: { prompt: string }) => Promise<{ content: string }>>().mockResolvedValue({ content: 'Test output' }),
    };
    mockContext = {
      provider: mockProvider,
    } as any;
  });

  it('should generate XML-formatted prompt and call provider', async () => {
    const result = await writer.execute(
      mockContext,
      'Write a summary.',
      'Background info',
      'paragraphs',
      'Conversational',
      'Must include 3 points'
    );
    expect(mockProvider.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('<task>Write a summary.</task>') })
    );
    expect(result.message).toBe('Test output');
    expect(result.success).toBe(true);
  });
});
