import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool as AnthropicTool } from '@anthropic-ai/sdk/resources/messages';
import type {
    LLMProvider,
    ProviderRequest,
    ProviderResponse,
    ChatMessage,
    Tool,
    ToolCall,
    ToolCallOutput
} from '../core/types/provider.types';
import type { Logger } from '../core/types/logger.types';
import {
    ToolResultsRequest,
    RecursiveToolLoopOptions,
} from '../core/types/provider.types';
import { ToolExecutor } from '@/tools/toolExecutor';


/**
 * Executes a tool call and returns the result
 * @param toolCall The tool call object from the model
 * @param availableTools Map of tool functions that can be called
 * @returns Promise with the tool call result as a string
 */
export async function executeToolCall(toolCall: ToolCall, availableTools?: Record<string, Function>): Promise<string> {
    if (!availableTools) {
        throw new Error('No tools available to execute');
    }

    if (!availableTools[toolCall.name]) {
        throw new Error(`Tool ${toolCall.name} not found`);
    }

    try {
        const args = JSON.parse(toolCall.arguments);
        const result = await availableTools[toolCall.name](args);
        return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error_: unknown) {
        const errorMessage = error_ instanceof Error ? error_.message : String(error_);
        console.error(`Error executing tool call ${toolCall.name}: ${errorMessage}`);
        return JSON.stringify({ error: errorMessage });
    }
}

/**
* Recursively handles tool calls until a final response with no tools is generated
* 
* @param request - The initial request object containing messages and other parameters
* @param toolExecutor - Tool executor to execute tool calls
* @param options - Additional options for the recursive execution
* @returns A promise that resolves to the provider's final response with no more tool calls
*/
export async function orchestrateToolLoop(
    provider: LLMProvider,
    request: ProviderRequest,
    logger: Logger,
    options: RecursiveToolLoopOptions = {}
): Promise<ProviderResponse> {

    // Initialize tracking variables
    let currentRequest = { ...request };
    return await provider.chat(currentRequest);
}