/**
 * Unit tests for ConfigManager
 * Tests the application configuration management functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AppConfig, McpServerConfig } from '../../../src/core/types/config.types';
import type { PathDI, FileSystemDI } from '../../../src/types/global.types';

// Mock dependencies before imports
jest.mock('env-paths', () => {
  return jest.fn(() => ({
    config: '/mock/config/path',
  }));
});

// Import the ConfigManager class to test
import { ConfigManager } from '../../../src/core/config/configManager';

describe('ConfigManager', () => {
  // Create mock implementations
  const mockPathDI: PathDI = {
    join: (jest.fn() as any).mockImplementation((path1, path2) => `${path1}/${path2}`),
    dirname: (jest.fn() as any).mockImplementation((path) => path.slice(0, Math.max(0, path.lastIndexOf('/')))),
  } as unknown as PathDI;

  const mockFileSystemDI: FileSystemDI = {
    mkdir: (jest.fn() as any).mockResolvedValue(undefined),
    readFile: jest.fn(),
    writeFile: (jest.fn() as any).mockResolvedValue(undefined),
  } as unknown as FileSystemDI;

  // Mock logger
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };

  // Mock credential manager
  const mockCredentialManager = {
    getSecret: jest.fn(),
    setSecret: jest.fn(),
    deleteSecret: jest.fn()
  };

  let configManager: ConfigManager;
  const mockedConfigPath = '/mock/config/path/config.json';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new ConfigManager instance for each test
    configManager = new ConfigManager(
      'test-app', 
      mockPathDI, 
      mockFileSystemDI, 
      mockCredentialManager as any, 
      mockLogger as any
    );
    (configManager as any).configPath = mockedConfigPath;
  });

  describe('ensureConfigDirectory', () => {
    it('should create the config directory if it does not exist', async () => {
      await (configManager as any).ensureConfigDirectory();
      
      expect(mockPathDI.dirname).toHaveBeenCalledWith(mockedConfigPath);
      expect(mockFileSystemDI.mkdir).toHaveBeenCalledWith('/mock/config/path', { recursive: true });
    });

    it('should ignore EEXIST errors when creating the directory', async () => {
      const eexistError = { code: 'EEXIST' };
      (mockFileSystemDI.mkdir as jest.Mock).mockRejectedValueOnce(eexistError);
      
      await expect((configManager as any).ensureConfigDirectory()).resolves.not.toThrow();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw other errors when creating the directory', async () => {
      const otherError = { code: 'OTHER_ERROR', message: 'Unknown error' };
      (mockFileSystemDI.mkdir as jest.Mock).mockRejectedValueOnce(otherError);
      
      await expect((configManager as any).ensureConfigDirectory()).rejects.toEqual(otherError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('loadConfig', () => {
    it('should return cached config if available', async () => {
      const mockConfig: AppConfig = { defaultProvider: 'test-provider' };
      (configManager as any).config = mockConfig;
      
      const result = await configManager.loadConfig();
      
      expect(result).toBe(mockConfig);
      expect(mockFileSystemDI.readFile).not.toHaveBeenCalled();
    });

    it('should load config from file if not cached', async () => {
      const fileContent = JSON.stringify({ defaultProvider: 'test-provider' });
      (mockFileSystemDI.readFile as jest.Mock).mockResolvedValueOnce(fileContent);
      
      const result = await configManager.loadConfig();
      
      expect(mockFileSystemDI.readFile).toHaveBeenCalledWith(mockedConfigPath, 'utf-8');
      expect(result).toEqual({ defaultProvider: 'test-provider' });
    });

    it('should initialize with defaults if file not found', async () => {
      const fileNotFoundError = { code: 'ENOENT' };
      (mockFileSystemDI.readFile as jest.Mock).mockRejectedValueOnce(fileNotFoundError);
      const saveConfigSpy = jest.spyOn(configManager, 'saveConfig').mockResolvedValueOnce();
      const getDefaultsSpy = jest.spyOn(configManager, 'getDefaults').mockReturnValueOnce({ 
        defaultProvider: 'default-provider',
        providers: {},
        mcp: { enabled: false }
      });
      
      const result = await configManager.loadConfig();
      
      expect(getDefaultsSpy).toHaveBeenCalled();
      expect(saveConfigSpy).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Config file not found'));
      expect(result).toEqual({
        defaultProvider: 'default-provider',
        providers: {},
        mcp: { enabled: false }
      });
    });

    it('should handle other file reading errors', async () => {
      const otherError = { code: 'OTHER_ERROR' };
      (mockFileSystemDI.readFile as jest.Mock).mockRejectedValueOnce(otherError);
      const getDefaultsSpy = jest.spyOn(configManager, 'getDefaults').mockReturnValueOnce({ 
        defaultProvider: 'default-provider',
        providers: {},
        mcp: { enabled: false }
      });
      
      const result = await configManager.loadConfig();
      
      expect(getDefaultsSpy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error reading config file'), 
        expect.objectContaining(otherError)
      );
      expect(result).toEqual({
        defaultProvider: 'default-provider',
        providers: {},
        mcp: { enabled: false }
      });
    });
  });

  describe('saveConfig', () => {
    it('should save the current config to file', async () => {
      const mockConfig: AppConfig = { defaultProvider: 'test-provider' };
      (configManager as any).config = mockConfig;
      
      await configManager.saveConfig();
      
      expect(mockFileSystemDI.writeFile).toHaveBeenCalledWith(
        mockedConfigPath,
        JSON.stringify(mockConfig, undefined, 2),
        'utf-8'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Configuration saved'));
    });

    it('should merge and save new config with existing config', async () => {
      const existingConfig: AppConfig = { 
        defaultProvider: 'existing-provider',
        providers: { 'provider1': { providerType: 'type1' } }
      };
      const newConfig: Partial<AppConfig> = { 
        defaultProvider: 'new-provider'
      };
      (configManager as any).config = existingConfig;
      
      await configManager.saveConfig(newConfig as AppConfig);
      
      expect(mockFileSystemDI.writeFile).toHaveBeenCalledWith(
        mockedConfigPath,
        JSON.stringify({
          defaultProvider: 'new-provider',
          providers: { 'provider1': { providerType: 'type1' } }
        }, undefined, 2),
        'utf-8'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Configuration saved'));
    });

    it('should not save if config is not initialized', async () => {
      (configManager as any).config = undefined;
      
      await configManager.saveConfig();
      
      expect(mockFileSystemDI.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No configuration to save'));
    });

    it('should propagate errors when saving fails', async () => {
      (configManager as any).config = { defaultProvider: 'test-provider' };
      const saveError = new Error('Failed to save');
      (mockFileSystemDI.writeFile as jest.Mock).mockRejectedValueOnce(saveError);
      
      await expect(configManager.saveConfig()).rejects.toThrow(saveError);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error saving config file'), saveError);
    });
  });

  describe('get', () => {
    it('should load config if not already loaded', async () => {
      (configManager as any).config = undefined;
      const mockConfig: AppConfig = { defaultProvider: 'test-provider' };
      jest.spyOn(configManager, 'loadConfig').mockImplementation(async () => {
        (configManager as any).config = mockConfig;
        return mockConfig;
      });
      
      const result = await configManager.get('defaultProvider');
      
      expect(configManager.loadConfig).toHaveBeenCalled();
      expect(result).toBe('test-provider');
    });

    it('should return specified config value if config is loaded', async () => {
      (configManager as any).config = { 
        defaultProvider: 'test-provider',
        providers: { 'test': { providerType: 'openai' } }
      };
      
      const result = await configManager.get('providers');
      
      expect(result).toEqual({ 'test': { providerType: 'openai' } });
    });

    it('should return undefined for non-existent keys', async () => {
      (configManager as any).config = { defaultProvider: 'test-provider' };
      
      const result = await configManager.get('nonExistentKey' as any);
      
      expect(result).toBeUndefined();
    });
  });

  describe('getConfig', () => {
    it('should return current config without loading if available', () => {
      const mockConfig: AppConfig = { defaultProvider: 'test-provider' };
      (configManager as any).config = mockConfig;
      
      const result = configManager.getConfig();
      
      expect(result).toBe(mockConfig);
    });

    it('should return defaults if config is not loaded', () => {
      (configManager as any).config = undefined;
      const defaultConfig: AppConfig = { 
        defaultProvider: undefined,
        providers: {},
        mcp: { enabled: false }
      };
      const getDefaultsSpy = jest.spyOn(configManager, 'getDefaults').mockReturnValueOnce(defaultConfig);
      
      const result = configManager.getConfig();
      
      expect(getDefaultsSpy).toHaveBeenCalled();
      expect(result).toEqual(defaultConfig);
    });
  });

  describe('getMcpConfig', () => {
    it('should return MCP config if available', () => {
      const mcpConfig: McpServerConfig = { 
        enabled: true,
        name: 'test-mcp',
        version: '1.0.0'
      };
      (configManager as any).config = { mcp: mcpConfig };
      
      const result = configManager.getMcpConfig();
      
      expect(result).toEqual(mcpConfig);
    });

    it('should return default MCP config if not available', () => {
      (configManager as any).config = { defaultProvider: 'test-provider' };
      const defaultMcpConfig: McpServerConfig = { 
        enabled: false,
        name: 'AgenticMCP-MCP',
        version: '1.0.0',
        description: 'AgenticMCP MCP Server - Providing filesystem operations for LLMs',
        tools: { namePrefix: '' }
      };
      const getDefaultMcpConfigSpy = jest.spyOn(configManager, 'getDefaultMcpConfig').mockReturnValueOnce(defaultMcpConfig);
      
      const result = configManager.getMcpConfig();
      
      expect(getDefaultMcpConfigSpy).toHaveBeenCalled();
      expect(result).toEqual(defaultMcpConfig);
    });
  });

  describe('set', () => {
    it('should set config value and save it', async () => {
      (configManager as any).config = { defaultProvider: 'old-provider' };
      const saveConfigSpy = jest.spyOn(configManager, 'saveConfig').mockResolvedValueOnce();
      
      await configManager.set('defaultProvider', 'new-provider');
      
      expect((configManager as any).config.defaultProvider).toBe('new-provider');
      expect(saveConfigSpy).toHaveBeenCalled();
    });

    it('should load config first if not already loaded', async () => {
      (configManager as any).config = undefined;
      const mockConfig = { defaultProvider: 'old-provider' };
      jest.spyOn(configManager, 'loadConfig').mockImplementation(async () => {
        (configManager as any).config = mockConfig;
        return mockConfig;
      });
      const saveConfigSpy = jest.spyOn(configManager, 'saveConfig').mockResolvedValueOnce();
      
      await configManager.set('defaultProvider', 'new-provider');
      
      expect(configManager.loadConfig).toHaveBeenCalled();
      expect((configManager as any).config.defaultProvider).toBe('new-provider');
      expect(saveConfigSpy).toHaveBeenCalled();
    });

    it('should handle case when config cannot be loaded', async () => {
      (configManager as any).config = undefined;
      jest.spyOn(configManager, 'loadConfig').mockResolvedValueOnce(undefined);
      
      await configManager.set('defaultProvider', 'new-provider');
      
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Configuration could not be loaded'));
    });
  });

  describe('getProviderConfigByAlias', () => {
    it('should return provider config for valid alias', async () => {
      const providerConfig = { providerType: 'openai', model: 'gpt-4' };
      (configManager as any).config = { 
        providers: { 'test-alias': providerConfig }
      };
      
      const result = await configManager.getProviderConfigByAlias('test-alias');
      
      expect(result).toEqual(providerConfig);
    });

    it('should return undefined for non-existent alias', async () => {
      (configManager as any).config = { 
        providers: { 'test-alias': { providerType: 'openai' } }
      };
      
      const result = await configManager.getProviderConfigByAlias('non-existent');
      
      expect(result).toBeUndefined();
    });

    it('should load config if not already loaded', async () => {
      (configManager as any).config = undefined;
      const mockConfig = { 
        providers: { 'test-alias': { providerType: 'openai' } }
      };
      jest.spyOn(configManager, 'loadConfig').mockImplementation(async () => {
        (configManager as any).config = mockConfig;
        return mockConfig;
      });
      
      const result = await configManager.getProviderConfigByAlias('test-alias');
      
      expect(configManager.loadConfig).toHaveBeenCalled();
      expect(result).toEqual({ providerType: 'openai' });
    });
  });

  describe('getDefaults and getDefaultMcpConfig', () => {
    it('should return default configuration structure', () => {
      const result = configManager.getDefaults();
      
      expect(result).toEqual({
        defaultProvider: undefined,
        providers: {},
        mcp: expect.any(Object)
      });
    });

    it('should return default MCP configuration', () => {
      const result = configManager.getDefaultMcpConfig();
      
      expect(result).toEqual({
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
    it('should return the configuration file path', () => {
      const result = configManager.getConfigFilePath();
      
      expect(result).toBe(mockedConfigPath);
    });
  });
});