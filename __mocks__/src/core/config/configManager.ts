// __mocks__/src/core/config/configManager.ts
export class ConfigManager {
  getResolvedApiKey = jest.fn(() => 'mock-api-key');
  get = jest.fn();
}

export default ConfigManager;
