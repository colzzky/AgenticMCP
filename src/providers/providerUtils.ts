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
    toolExecutor: ToolExecutor,
    logger: Logger,
    options: RecursiveToolLoopOptions = {}
): Promise<ProviderResponse> {
    // Set default options
    const maxIterations = options.maxIterations || 10;
    const verbose = options.verbose || false;
    const onProgress = options.onProgress || (() => { });

    // Initialize tracking variables
    let currentRequest = { ...request };
    let currentMessages = [...(request.messages || [])] as ChatMessage[];
    let iterations = 0;

    // Main recursive loop
    while (iterations < maxIterations) {
        iterations++;

        if (verbose) {
            logger.debug(`Tool loop iteration ${iterations}/${maxIterations}`);
        }

        // 1. Send request to LLM
        const response = iterations === 1
            ? await provider.chat(currentRequest)
            : await provider.generateTextWithToolResults(currentRequest as ToolResultsRequest);

        // Report progress if callback is provided
        onProgress(iterations, response);

        // 2. Check for tool calls
        if (!response.toolCalls || response.toolCalls.length === 0) {
            // No more tool calls, we have our final response
            if (verbose) {
                logger.debug(`Tool loop completed after ${iterations} iterations`);
            }
            return response;
        }

        if (verbose) {
            logger.debug(`Got ${response.toolCalls.length} tool calls, executing...`);
        }

        // 3. Execute tool calls and collect results
        const toolResults: ToolCallOutput[] = [];
        for (const toolCall of response.toolCalls) {
            try {
                const output = await toolExecutor.executeTool(toolCall.name, JSON.parse(toolCall.arguments));
                toolResults.push({
                    type: 'function_call_output',
                    call_id: toolCall.id,
                    output: typeof output === 'string' ? output : JSON.stringify(output)
                });
            } catch (error) {
                logger.error(`Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`);
                toolResults.push({
                    type: 'function_call_output',
                    call_id: toolCall.id,
                    output: `Error: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }

        // 4. Prepare request for next iteration with tool results
        currentMessages.push({
            role: 'assistant',
            content: response.content || '',
            tool_calls: response.toolCalls
        });

        // 5. Update current request for next iteration
        currentRequest = {
            messages: currentMessages,
            tool_outputs: toolResults,
            model: request.model,
            temperature: request.temperature
        };
    }

    throw new Error(`Reached maximum iterations (${maxIterations}) in tool calling loop`);
}

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