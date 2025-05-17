import {
    LLMProvider,
    ProviderRequest,
    ProviderResponse,
    ProviderConfig,
    Tool,
    ToolCall,
    ToolResultsRequest
} from '@/core/types/provider.types';
import { ToolExecutor } from '@/tools/toolExecutor';

/**
 * ProviderBase implements the LLMProvider interface for OpenAI API.
 * Uses dependency injection for better testability.
 */
export class ProviderBase implements LLMProvider {


    public toolExecutor?: InstanceType<typeof ToolExecutor>

    // Getter for the provider's name
    get name(): string {
        return 'base';
    }

    get defaultModel(): string {
        return 'base';
    }

    /**
     * Configures the provider with the given settings.
     * @param config - The configuration object for the provider.
     */
    public configure(config: ProviderConfig) {}

    /**
     * Gets the available tools from the registry.
     * @returns The available tools.
     */
    public getAvailableTools?(): Tool[] { return [] }

    /**
     * Generates a text completion based on a prompt.
     * @param request - The request object containing the prompt and other parameters.
     * @returns A promise that resolves to the provider's response.
     */
    public async generateCompletion(request: ProviderRequest): Promise<ProviderResponse> {
        return {} as ProviderResponse
    }

    /**
     * Engages in a chat conversation.
     * @param request - The request object containing the chat messages and other parameters.
     * @returns A promise that resolves to the provider's response.
     */
    public async chat(request: ProviderRequest): Promise<ProviderResponse> {
        return {} as ProviderResponse
    }

    /**
     * Generates text with optional tools.
     * @param request - The request object containing messages and other parameters.
     * @returns A promise that resolves to the provider's response.
     */
    public async generateText(request: ProviderRequest): Promise<ProviderResponse> {
        return {} as ProviderResponse
    }

    /**
     * Continues a conversation with tool results.
     * @param request - The request object containing messages, tool calls, and tool outputs.
     * @returns A promise that resolves to the provider's response.
     */
    public async generateTextWithToolResults(request: ToolResultsRequest): Promise<ProviderResponse> {
        return {} as ProviderResponse
    }

    /**
     * Sets the tool executor to be used by providers.
     * @param toolExecutor - The tool executor to use
     */
    public setTools(toolExecutor: ToolExecutor): void {
        this.toolExecutor = toolExecutor
    }

    /**
     * Executes a tool call.
     * @param toolCall - The tool call to execute
     * @returns A promise that resolves to the provider's response
     */
    public async executeToolCall(toolCall: ToolCall): Promise<ProviderResponse> {
        if (!this.toolExecutor) {
            throw new Error('Tool executor not set')
        }
        return await this.toolExecutor.executeToolCall(toolCall)
    }

}