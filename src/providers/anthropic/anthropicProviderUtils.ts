import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool as AnthropicTool } from '@anthropic-ai/sdk/resources/messages';
import type {
    ChatMessage,
    Tool,
    ToolCall,
} from '../../core/types/provider.types';

export function extractToolCallsFromResponse(response: Anthropic.Messages.Message): ToolCall[] | undefined {
    if (!response.content || !Array.isArray(response.content)) {
        return undefined;
    }

    // Look for tool calls in the response
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
        if (block.type === 'tool_use') {
            toolCalls.push({
                type: 'function_call',
                id: block.id || `tool-call-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                name: block.name,
                arguments: JSON.stringify(block.input)
            });
        }
    }

    return toolCalls.length > 0 ? toolCalls : undefined;
}

/**
 * Converts our generic Tool interface to Anthropic's tool format
 */
export function convertToolsToAnthropicFormat(tools?: Tool[]): AnthropicTool[] | undefined {
    if (!tools || tools.length === 0) {
        return undefined;
    }

    return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
            type: 'object',
            properties: tool.parameters.properties,
            required: tool.parameters.required || []
        },
        cache_control: {
            type: 'ephemeral'
        }
    }));
}

/**
 * Maps our internal message format to Anthropic's format
 */
export function mapMessagesToAnthropicFormat(messages: ChatMessage[]): MessageParam[] {
    // Filter out system messages for the test expecting exact message count
    const filteredMessages = messages.filter(msg => msg.role !== 'system');

    return filteredMessages.map(message => {
        // Convert our message role to Anthropic's role format
        const role = message.role === 'assistant' ? 'assistant' : 'user';

        // Basic content mapping
        let content = '';
        if (typeof message.content === 'string') {
            content = message.content;
        } else if (Array.isArray(message.content)) {
            // Handle complex content with media
            const textParts: string[] = [];
            const contentArray = message.content as Array<any>;

            // Use a type-safe approach with contentArray
            contentArray.forEach(part => {
                if (typeof part === 'object' && part !== null && 'text' in part) {
                    const textPart = part as { text: string };
                    textParts.push(textPart.text);
                }
            });

            content = textParts.join('\n');
        }

        return { role, content };

    });
}