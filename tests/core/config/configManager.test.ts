/**
 * @file Tests for ConfigManager
 */

import { jest } from '@jest/globals';
import { mockConsole } from '../../utils/test-setup';
import { setupNodeFsMock, setupLoggerMock } from '../../utils/node-module-mock';

// Declare dynamically imported modules and mocks
let ConfigManager: typeof import('../../../src/core/config/configManager').ConfigManager;
let ConfigTypes: typeof import('../../../src/core/types/config.types');
let mockFs: ReturnType<typeof setupNodeFsMock>;
let mockLogger: ReturnType<typeof setupLoggerMock>;

// Mock CredentialManager methods
const mockCredentialManager = {
  getSecret: jest.fn(),
  setSecret: jest.fn(),
  deleteSecret: jest.fn(),
  findCredentialsByProvider: jest.fn()
};

// Setup module imports and mocks before test execution
beforeAll(async () => {
  // Setup mocks
  mockFs = setupNodeFsMock();
  mockLogger = setupLoggerMock();

  // Register mocks with Jest
  jest.unstable_mockModule('node:fs/promises', () => mockFs);
  jest.unstable_mockModule('../../../src/core/utils/logger', () => mockLogger);
  jest.unstable_mockModule('keytar', () => ({
    getPassword: mockCredentialManager.getSecret,
    setPassword: mockCredentialManager.setSecret,
    deletePassword: mockCredentialManager.deleteSecret,
    findCredentials: mockCredentialManager.findCredentialsByProvider
  }));
  jest.unstable_mockModule('../../../src/core/credentials/credentialManager', () => ({
    CredentialManager: mockCredentialManager
  }));

  // Import modules after mocking
  const configManagerModule = await import('../../../src/core/config/configManager');
  ConfigManager = configManagerModule.ConfigManager;

  ConfigTypes = await import('../../../src/core/types/config.types');
});

// Import other modules that are not mocked
import { InMemoryFileSystem } from '../../utils/in-memory-filesystem';

describe('ConfigManager', () => {
  // Original methods we're going to mock
  let originalConfigPath: string;
  let originalEnsureConfigDirectory: Function;
  // Use our mocked fs instance
  const originalReadFile = mockFs.readFile;
  const originalWriteFile = mockFs.writeFile;
  const originalMkdir = mockFs.mkdir;

  // Mock FS and path
  let inMemoryFs: InMemoryFileSystem;
  let configPath: string;

  // Test config object
  const testConfig: ConfigTypes.AppConfig = {
    defaultProvider: 'openaiTest',
    providers: {
      'openaiTest': {
        providerType: 'openai',
        model: 'gpt-4-turbo'
      },
      'anthropicTest': {
        providerType: 'anthropic',
        model: 'claude-3-opus'
      }
    },
    mcp: {
      enabled: true,
      name: 'TestMCP',
      version: '1.0.0',
      description: 'Test MCP Server',
      tools: {
        namePrefix: 'test_'
      }
    }
  };

  beforeAll(() => {
    // Store original prototype methods
    originalConfigPath = ConfigManager.prototype['configPath'];
    originalEnsureConfigDirectory = ConfigManager.prototype['ensureConfigDirectory'];
  });

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();

    // Setup in-memory filesystem
    inMemoryFs = new InMemoryFileSystem();
    configPath = '/app/config/agenticmcp/config.json';

    // Mock ConfigManager private properties and methods
    ConfigManager.prototype['configPath'] = configPath;

    // Type-safe mock implementation
    ConfigManager.prototype['ensureConfigDirectory'] = jest.fn() as jest.MockedFunction<() => Promise<void>>;

    // Mock fs methods
    (originalReadFile as any).mockImplementation(async (path, options) => {
      if (path === configPath) {
        return Buffer.from(JSON.stringify(testConfig));
      }
      throw new Error(`File not found: ${path}`);
    });

    originalWriteFile.mockImplementation(async (path, data) => {
      return undefined;
    });

    originalMkdir.mockImplementation(async (path, options) => {
      return undefined;
    });

    // Mock CredentialManager.getSecret
    ((mockCredentialManager.getSecret as unknown) as jest.Mock<any>).mockResolvedValue('test-api-key');
  });

  afterEach(() => {
    // Restore original methods
    ConfigManager.prototype['configPath'] = originalConfigPath;
    ConfigManager.prototype['ensureConfigDirectory'] = originalEnsureConfigDirectory;
  });

  describe('loadConfig', () => {
    it('should load configuration from file', async () => {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      expect(config).toEqual(testConfig);
      expect(originalReadFile).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
    });

    it('should initialize with defaults if file not found', async () => {
      // Mock fs.readFile to throw ENOENT
      originalReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);

      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      expect(config).toEqual(configManager.getDefaults());
      expect(originalReadFile).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
      // Should try to save defaults
      expect(originalWriteFile).toHaveBeenCalled();
    });

    it('should handle generic read errors', async () => {
      // Mock fs.readFile to throw generic error
      originalReadFile.mockRejectedValueOnce(new Error('Generic error'));

      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      expect(config).toEqual(configManager.getDefaults());
      expect(originalReadFile).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
      // Should not try to save defaults
      expect(originalWriteFile).not.toHaveBeenCalled();
    });

    it('should use cached config if already loaded', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const config = await configManager.loadConfig();

      expect(config).toEqual(testConfig);
      expect(originalReadFile).not.toHaveBeenCalled();
      expect(configManager['ensureConfigDirectory']).not.toHaveBeenCalled();
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      await configManager.saveConfig();

      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
      expect(originalWriteFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(testConfig, undefined, 2),
        'utf-8'
      );
    });

    it('should merge new config with existing config', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const newConfig: Partial<AppConfig> = {
        defaultProvider: 'anthropicTest'
      };

      await configManager.saveConfig(newConfig as AppConfig);

      const expectedConfig = {
        ...testConfig,
        defaultProvider: 'anthropicTest'
      };

      expect(configManager['config']).toEqual(expectedConfig);
      expect(originalWriteFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(expectedConfig, undefined, 2),
        'utf-8'
      );
    });

    it('should warn and not save if no config is loaded', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      const configManager = new ConfigManager();
      configManager['config'] = undefined;

      await configManager.saveConfig();

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(originalWriteFile).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle fs errors when saving', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const error = new Error('Write error');
      originalWriteFile.mockRejectedValueOnce(error);

      await expect(configManager.saveConfig()).rejects.toThrow('Write error');
      expect(originalWriteFile).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should retrieve specific config values', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const defaultProvider = await configManager.get('defaultProvider');
      expect(defaultProvider).toEqual('openaiTest');

      const providers = await configManager.get('providers');
      expect(providers).toEqual(testConfig.providers);
    });

    it('should load config if not already loaded', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = undefined;

      const loadConfigSpy = jest.spyOn(configManager, 'loadConfig');
      loadConfigSpy.mockResolvedValueOnce({ ...testConfig });

      const defaultProvider = await configManager.get('defaultProvider');
      expect(defaultProvider).toEqual('openaiTest');
      expect(loadConfigSpy).toHaveBeenCalled();

      loadConfigSpy.mockRestore();
    });
  });

  describe('getConfig', () => {
    it('should return current config without async loading', () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const config = configManager.getConfig();
      expect(config).toEqual(testConfig);
    });

    it('should return defaults if no config is loaded', () => {
      const configManager = new ConfigManager();
      configManager['config'] = undefined;

      const getDefaultsSpy = jest.spyOn(configManager, 'getDefaults');
      getDefaultsSpy.mockReturnValueOnce({ ...testConfig });

      const config = configManager.getConfig();
      expect(config).toEqual(testConfig);
      expect(getDefaultsSpy).toHaveBeenCalled();

      getDefaultsSpy.mockRestore();
    });
  });

  describe('getMcpConfig', () => {
    it('should return MCP config', () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const mcpConfig = configManager.getMcpConfig();
      expect(mcpConfig).toEqual(testConfig.mcp);
    });

    it('should return default MCP config if not set', () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig, mcp: undefined };

      const getDefaultMcpConfigSpy = jest.spyOn(configManager, 'getDefaultMcpConfig');
      const defaultMcpConfig = {
        enabled: false,
        name: 'Default'
      } as ConfigTypes.McpServerConfig;

      getDefaultMcpConfigSpy.mockReturnValueOnce(defaultMcpConfig);

      const mcpConfig = configManager.getMcpConfig();
      expect(mcpConfig).toEqual(defaultMcpConfig);
      expect(getDefaultMcpConfigSpy).toHaveBeenCalled();

      getDefaultMcpConfigSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should set specific config values and save config', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const saveConfigSpy = jest.spyOn(configManager, 'saveConfig');
      saveConfigSpy.mockResolvedValueOnce();

      await configManager.set('defaultProvider', 'anthropicTest');

      expect(configManager['config']?.defaultProvider).toEqual('anthropicTest');
      expect(saveConfigSpy).toHaveBeenCalled();

      saveConfigSpy.mockRestore();
    });

    it('should load config if not already loaded', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = undefined;

      const loadConfigSpy = jest.spyOn(configManager, 'loadConfig');
      loadConfigSpy.mockResolvedValueOnce({ ...testConfig });

      const saveConfigSpy = jest.spyOn(configManager, 'saveConfig');
      saveConfigSpy.mockResolvedValueOnce();

      await configManager.set('defaultProvider', 'anthropicTest');

      expect(loadConfigSpy).toHaveBeenCalled();
      expect(saveConfigSpy).toHaveBeenCalled();

      loadConfigSpy.mockRestore();
      saveConfigSpy.mockRestore();
    });

    it('should not update if config cannot be loaded', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      const configManager = new ConfigManager();
      configManager['config'] = undefined;

      const loadConfigSpy = jest.spyOn(configManager, 'loadConfig');
      loadConfigSpy.mockResolvedValueOnce(undefined as unknown as ConfigTypes.AppConfig);

      await configManager.set('defaultProvider', 'anthropicTest');

      expect(loadConfigSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      loadConfigSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getProviderConfigByAlias', () => {
    it('should return provider config by alias', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const providerConfig = await configManager.getProviderConfigByAlias('openaiTest');
      expect(providerConfig).toEqual(testConfig.providers?.['openaiTest']);
    });

    it('should return undefined for unknown alias', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const providerConfig = await configManager.getProviderConfigByAlias('unknownProvider');
      expect(providerConfig).toBeUndefined();
    });

    it('should load config if not already loaded', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = undefined;

      const loadConfigSpy = jest.spyOn(configManager, 'loadConfig');
      loadConfigSpy.mockResolvedValueOnce({ ...testConfig });

      const providerConfig = await configManager.getProviderConfigByAlias('openaiTest');
      expect(providerConfig).toEqual(testConfig.providers?.['openaiTest']);
      expect(loadConfigSpy).toHaveBeenCalled();

      loadConfigSpy.mockRestore();
    });
  });

  describe('getResolvedApiKey', () => {
    it('should return API key from credential manager', async () => {
      const configManager = new ConfigManager();

      const providerConfig: ConfigTypes.ProviderSpecificConfig = {
        providerType: 'openai',
        instanceName: 'test-instance'
      };

      const apiKey = await configManager.getResolvedApiKey(providerConfig);

      expect(apiKey).toEqual('test-api-key');
      expect(mockCredentialManager.getSecret).toHaveBeenCalledWith({
        providerType: 'openai',
        accountName: 'test-instance'
      });
    });

    it('should use default accountName if instanceName not provided', async () => {
      const configManager = new ConfigManager();

      const providerConfig: ConfigTypes.ProviderSpecificConfig = {
        providerType: 'openai'
      };

      const apiKey = await configManager.getResolvedApiKey(providerConfig);

      expect(apiKey).toEqual('test-api-key');
      expect(mockCredentialManager.getSecret).toHaveBeenCalledWith({
        providerType: 'openai',
        accountName: 'apiKey'
      });
    });

    it('should return undefined for invalid provider config', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      const configManager = new ConfigManager();

      const apiKey = await configManager.getResolvedApiKey(undefined as unknown as ConfigTypes.ProviderSpecificConfig);

      expect(apiKey).toBeUndefined();
      expect(mockCredentialManager.getSecret).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors from credential manager', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      const configManager = new ConfigManager();

      const providerConfig: ConfigTypes.ProviderSpecificConfig = {
        providerType: 'openai',
        instanceName: 'test-instance'
      };

      ((mockCredentialManager.getSecret as unknown) as jest.Mock<any>).mockRejectedValueOnce(new Error('Credential error'));

      const apiKey = await configManager.getResolvedApiKey(providerConfig);

      expect(apiKey).toBeUndefined();
      expect(mockCredentialManager.getSecret).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getDefaults', () => {
    it('should return default configuration', () => {
      const configManager = new ConfigManager();

      const getDefaultMcpConfigSpy = jest.spyOn(configManager, 'getDefaultMcpConfig');
      const defaultMcpConfig = { enabled: false, name: 'Default' } as McpServerConfig;
      getDefaultMcpConfigSpy.mockReturnValueOnce(defaultMcpConfig);

      const defaults = configManager.getDefaults();

      expect(defaults).toEqual({
        defaultProvider: undefined,
        providers: {},
        mcp: defaultMcpConfig
      });
      expect(getDefaultMcpConfigSpy).toHaveBeenCalled();

      getDefaultMcpConfigSpy.mockRestore();
    });
  });

  describe('getDefaultMcpConfig', () => {
    it('should return default MCP configuration', () => {
      const configManager = new ConfigManager();

      const defaultMcpConfig = configManager.getDefaultMcpConfig();

      expect(defaultMcpConfig).toEqual({
        enabled: false,
        name: 'AgenticMCP-MCP',
        version: '1.0.0',
        description: 'AgenticMCP MCP Server - Providing filesystem operations for LLMs',
        tools: {
          namePrefix: ''
        }
      });
    });
  });

  describe('getConfigFilePath', () => {
    it('should return config file path', () => {
      const configManager = new ConfigManager();

      const filePath = configManager.getConfigFilePath();

      expect(filePath).toEqual(configPath);
    });
  })
});
