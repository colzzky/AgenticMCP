/**
 * @file Tests for ConfigManager
 */

import { mock } from 'jest-mock-extended';

// Type-safe node:os mock using jest-mock-extended
const createNodeOsMock = () => mock<typeof import('node:os')>();

// Register the mock using a self-contained factory
/*jest.mock('node:os', () => {
  const mock = createNodeOsMock();
  return { ...mock, default: mock };
}, { virtual: true });*/

import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { setupNodeFsMock, setupNodeOsMock, setupLoggerMock } from '../../utils/node-module-mock';

beforeEach(() => {
  jest.resetModules();
  // Re-register node:os mock for each test for isolation
  jest.doMock('node:os', () => createNodeOsMock(), { virtual: true });
});

// Set up mocks using the utilities
const mockFs = setupNodeFsMock();
const mockOs = setupNodeOsMock();
const mockLogger = setupLoggerMock();

// Mock path module
const mockPath = {
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  relative: jest.fn((from: string, to: string) => to.replace(from, '')),
  sep: '/'
};

// Mock process module
const mockProcess = {
  platform: 'darwin',
  env: {}
};

// Mock CredentialManager methods
const mockCredentialManager = {
  getSecret: jest.fn().mockResolvedValue('test-api-key'),
  setSecret: jest.fn(),
  deleteSecret: jest.fn(),
  findCredentialsByProvider: jest.fn()
};

// Register mocks for node modules
jest.mock('node:fs/promises', () => mockFs, { virtual: true });
jest.mock('node:path', () => mockPath, { virtual: true });
jest.mock('node:os', () => mockOs, { virtual: true });
jest.mock('node:process', () => mockProcess, { virtual: true });

// Mock env-paths module
jest.mock('env-paths', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      config: '/app/config/agenticmcp'
    }))
  };
}, { virtual: true });

// Mock application modules
jest.mock('../../../src/core/utils/logger', () => mockLogger, { virtual: true });
jest.mock('../../../src/core/credentials/credentialManager', () => ({
  CredentialManager: mockCredentialManager
}), { virtual: true });

// Now import modules after mocking
import { ConfigManager } from '../../../src/core/config/configManager';
import type { AppConfig, McpServerConfig } from '../../../src/core/types/config.types';
import type { ProviderSpecificConfig } from '../../../src/core/types/config.types';

describe('ConfigManager', () => {
  // Test config object
  const testConfig: AppConfig = {
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

  const configPath = '/app/config/agenticmcp/config.json';
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Make path.join return the expected config path
    mockPath.join.mockImplementation(() => configPath);
    
    // Set up ensureConfigDirectory mock on the prototype
    const originalMethod = ConfigManager.prototype['ensureConfigDirectory'];
    ConfigManager.prototype['ensureConfigDirectory'] = jest.fn().mockResolvedValue(undefined);
    
    // Setup mockFs.readFile to return test config
    mockFs.readFile.mockImplementation(async (path: string, options?: any) => {
      if (path === configPath) {
        return JSON.stringify(testConfig);
      }
      throw { code: 'ENOENT' } as any;
    });
  });

  afterEach(() => {
    // Restore original methods if needed
  });

  describe('loadConfig', () => {
    it('should load configuration from file', async () => {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      expect(config).toEqual(testConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
    });

    it('should initialize with defaults if file not found', async () => {
      // Mock fs.readFile to throw ENOENT
      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);

      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      expect(config).toEqual(configManager.getDefaults());
      expect(mockFs.readFile).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
      // Should try to save defaults
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle generic read errors', async () => {
      // Mock fs.readFile to throw generic error
      mockFs.readFile.mockRejectedValueOnce(new Error('Generic error') as any);

      const configManager = new ConfigManager();
      const config = await configManager.loadConfig();

      expect(config).toEqual(configManager.getDefaults());
      expect(mockFs.readFile).toHaveBeenCalledWith(configPath, 'utf-8');
      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
      // Should not try to save defaults
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should use cached config if already loaded', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      const config = await configManager.loadConfig();

      expect(config).toEqual(testConfig);
      expect(mockFs.readFile).not.toHaveBeenCalled();
      expect(configManager['ensureConfigDirectory']).not.toHaveBeenCalled();
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file', async () => {
      const configManager = new ConfigManager();
      configManager['config'] = { ...testConfig };

      await configManager.saveConfig();

      expect(configManager['ensureConfigDirectory']).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
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
      expect(mockFs.writeFile).toHaveBeenCalledWith(
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
      expect(mockFs.writeFile).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
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

      // We need to properly mock the behavior of loadConfig
      const loadConfigSpy = jest.spyOn(configManager, 'loadConfig');

      // This fully replaces the function implementation
      loadConfigSpy.mockImplementation(async () => {
        configManager['config'] = { ...testConfig }; // Actually set the config internally
        return { ...testConfig };
      });

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
      } as McpServerConfig;

      getDefaultMcpConfigSpy.mockReturnValueOnce(defaultMcpConfig);

      const mcpConfig = configManager.getMcpConfig();
      expect(mcpConfig).toEqual(defaultMcpConfig);
      expect(getDefaultMcpConfigSpy).toHaveBeenCalled();

      getDefaultMcpConfigSpy.mockRestore();
    });
  });

  describe('getResolvedApiKey', () => {
    it('should return API key from credential manager', async () => {
      const configManager = new ConfigManager();

      const providerConfig: ProviderSpecificConfig = {
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

      const providerConfig: ProviderSpecificConfig = {
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

      const apiKey = await configManager.getResolvedApiKey(undefined as unknown as ProviderSpecificConfig);

      expect(apiKey).toBeUndefined();
      expect(mockCredentialManager.getSecret).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getConfigFilePath', () => {
    it('should return config file path', () => {
      const configManager = new ConfigManager();
      
      // Set configPath directly for the test
      configManager['configPath'] = configPath;

      const filePath = configManager.getConfigFilePath();

      expect(filePath).toEqual(configPath);
    });
  });
});