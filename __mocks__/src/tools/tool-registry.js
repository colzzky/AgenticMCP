// __mocks__/src/tools/tool-registry.js
import { jest } from '@jest/globals';
export class ToolRegistry {
  constructor(logger) {
    const jestLogger = { debug: jest.fn(), warn: jest.fn() };
    this._tools = [];
    this.logger = logger || jestLogger;
    // Always wrap logger methods with jest.fn() if not already
    if (typeof this.logger.debug !== 'function' || !this.logger.debug._isMockFunction) {
      this.logger.debug = jest.fn(this.logger.debug);
    }
    if (typeof this.logger.warn !== 'function' || !this.logger.warn._isMockFunction) {
      this.logger.warn = jest.fn(this.logger.warn);
    }
    this.logger.debug('ToolRegistry initialized');
  }
  registerTool = jest.fn((tool) => {
    if (!this._tools.find(t => t.name === tool.name)) {
      this._tools.push(tool);
      this.logger.debug(`Registered tool '${tool.name}'`);
      return true;
    }
    this.logger.warn(`Tool with name '${tool.name}' already exists in registry`);
    return false;
  });
  registerTools = jest.fn((tools) => {
    let count = 0;
    tools.forEach(tool => {
      if (this.registerTool(tool)) count++;
    });
    return count;
  });
  getTool = jest.fn((name) => {
    return this._tools.find(t => t.name === name);
  });
  getAllTools = jest.fn(() => {
    return this._tools;
  });
  getTools = jest.fn((filter) => {
    if (typeof filter === 'function') {
      return this._tools.filter(filter);
    }
    return this._tools;
  });
  registerLocalCliTools = jest.fn((cliTool) => {
    if (cliTool && typeof cliTool.getToolDefinitions === 'function') {
      cliTool.getToolDefinitions();
    }
    this._tools.push({ name: 'cliTool1' }, { name: 'cliTool2' });
    return 2;
  });
  validateToolsForProvider = jest.fn((provider) => {
    // Match test: valid: false if any tool named 'invalidTool', otherwise true
    const invalidTools = this._tools.filter(t => t && typeof t.name === 'string' && t.name === 'invalidTool').map(t => t.name);
    return {
      valid: invalidTools.length === 0,
      invalidTools,
      messages: invalidTools.length ? ['Invalid tool found'] : []
    };
  });
}
export default ToolRegistry;
