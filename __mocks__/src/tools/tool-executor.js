// __mocks__/src/tools/tool-executor.js
import { jest } from '@jest/globals';
export class ToolExecutor {
  constructor(logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }) {
    this._toolMap = {};
    this.logger = logger;
  }
  executeToolCalls = jest.fn((toolCalls) => {
    if (!Array.isArray(toolCalls)) return undefined;
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
  executeToolCall = jest.fn((toolCall) => {
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
  registerToolImplementation = jest.fn((name, fn) => {
    if (this._toolMap[name]) {
      this.logger.warn && this.logger.warn(`Tool implementation already exists: ${name}`);
      return false;
    }
    this._toolMap[name] = fn;
    this.logger.debug && this.logger.debug(`Registered tool implementation: ${name}`);
    return true;
  });
  executeTool = jest.fn();
  getToolImplementations = jest.fn(() => this._toolMap);
}
const toolExecutor = {
  _toolMap: {},
  executeToolCalls: jest.fn((toolCalls) => {
    if (!Array.isArray(toolCalls)) return undefined;
    return toolCalls.map((call) => ({ call_id: call.call_id }));
  }),
  executeToolCall: jest.fn((toolCall) => ({ success: false, error: { message: 'Tool not found: unknown-tool' } })),
  registerToolImplementation: jest.fn((name, fn) => {
    if (!toolExecutor._toolMap) toolExecutor._toolMap = {};
    if (toolExecutor._toolMap[name]) {
      toolExecutor.logger && toolExecutor.logger.warn && toolExecutor.logger.warn(`Tool implementation already exists: ${name}`);
      return false;
    }
    toolExecutor._toolMap[name] = fn;
    toolExecutor.logger && toolExecutor.logger.debug && toolExecutor.logger.debug(`Registered tool implementation: ${name}`);
    return true;
  }),
  executeTool: jest.fn(),
  getToolImplementations: jest.fn(() => toolExecutor._toolMap),
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
};
export default toolExecutor;
