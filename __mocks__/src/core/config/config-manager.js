// __mocks__/src/core/config/config-manager.js
import { jest } from '@jest/globals';
class ConfigManager {
  constructor() {
    this.getResolvedApiKey = jest.fn(() => 'mock-api-key');
    this.get = jest.fn();
  }
}
export { ConfigManager };
export default ConfigManager;
