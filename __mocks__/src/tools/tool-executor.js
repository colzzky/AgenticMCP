// __mocks__/src/tools/tool-executor.js
import { jest } from '@jest/globals';

const createLogger = () => ({ debug: jest.function_(), warn: jest.function_(), error: jest.function_() });

export class ToolExecutor {
  constructor(logger = createLogger()) {
    this._toolMap = {};
    this.logger = logger;
  }

  executeToolCalls = jest.function_((toolCalls) => {
    if (!Array.isArray(toolCalls)) return;
    return toolCalls.map((call) => {
      const toolName = call.tool_name || call.toolName;
      if (toolName === 'error-tool') {
        this.logger.error && this.logger.error('Error executing tool call');
        return { call_id: call.call_id, success: false, error: { message: 'Tool execution failed' } };
      }
      if (!this._toolMap[toolName]) {
        this.logger.error && this.logger.error('Tool not found');
        return { call_id: call.call_id, success: false, error: { message: 'Tool not found: unknown-tool' } };
      }
      const output = this._toolMap[toolName](call.args || call);
      return { call_id: call.call_id, output, success: true };
    });
  });
  executeToolCall = jest.function_((toolCall) => {
    const toolName = toolCall.tool_name || toolCall.toolName;
    if (toolName === 'error-tool') {
      this.logger.error && this.logger.error('Error executing tool call');
      return { success: false, error: { message: 'Tool execution failed' } };
    }
    if (!this._toolMap[toolName]) {
      this.logger.error && this.logger.error('Tool not found');
      return { success: false, error: { message: 'Tool not found: unknown-tool' } };
    }
    const output = this._toolMap[toolName](toolCall.args || toolCall);
    return { success: true, output };
  });
  registerToolImplementation = jest.function_((name, function_) => {
    if (this._toolMap[name]) {
      this.logger.warn && this.logger.warn(`Tool implementation already exists: ${name}`);
      return false;
    }
    this._toolMap[name] = function_;
    this.logger.debug && this.logger.debug(`Registered tool implementation: ${name}`);
    return true;
  });
  executeTool = jest.function_();
  getToolImplementations = jest.function_(() => this._toolMap);
}
const toolExecutor = {
  _toolMap: {},
  executeToolCalls: jest.function_((toolCalls) => {
    if (!Array.isArray(toolCalls)) return ;
    return toolCalls.map((call) => ({ call_id: call.call_id }));
  }),
  executeToolCall: jest.function_((toolCall) => ({ success: false, error: { message: 'Tool not found: unknown-tool' } })),
  registerToolImplementation: jest.function_((name, function_) => {
    if (!toolExecutor._toolMap) toolExecutor._toolMap = {};
    if (toolExecutor._toolMap[name]) {
      toolExecutor.logger && toolExecutor.logger.warn && toolExecutor.logger.warn(`Tool implementation already exists: ${name}`);
      return false;
    }
    toolExecutor._toolMap[name] = function_;
    toolExecutor.logger && toolExecutor.logger.debug && toolExecutor.logger.debug(`Registered tool implementation: ${name}`);
    return true;
  }),
  executeTool: jest.function_(),
  getToolImplementations: jest.function_(() => toolExecutor._toolMap),
  logger: { debug: jest.function_(), warn: jest.function_(), error: jest.function_() },
};
export default toolExecutor;
