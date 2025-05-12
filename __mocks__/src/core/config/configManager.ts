// __mocks__/src/core/config/configManager.ts
async function getConfig() {
  // ...
}

export { getConfig };

export class ConfigManager {
  getResolvedApiKey() { return 'mock-api-key'; }
  get: jest.Mock;
  constructor() {
    this.get = jest.fn();
  }
}

export default ConfigManager;
