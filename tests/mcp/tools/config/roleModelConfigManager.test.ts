/**
 * Unit tests for roleModelConfigManager module
 * Tests the role-to-model configuration manager functionality
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RoleModelConfigManager } from '../../../../src/mcp/tools/config/roleModelConfigManager.js';
import { defaultRoleModelConfig } from '../../../../src/mcp/tools/config/roleModelConfig.js';
import path from 'path';
import { roleEnums } from '../../../../src/mcp/tools/roleSchemas.js';

// Mock dependencies
const mockFileSystem = {
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn()
};

const mockPath = {
  join: jest.fn((...args) => args.join('/')),
  isAbsolute: jest.fn((p) => p.startsWith('/'))
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('RoleModelConfigManager', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default mock implementations
    mockFileSystem.existsSync.mockReturnValue(true);
    mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(defaultRoleModelConfig));
  });

  it('should initialize with default configuration when no config path is provided', () => {
    const manager = new RoleModelConfigManager({
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    expect(manager.getConfig()).toEqual(defaultRoleModelConfig);
    expect(manager.getConfigPath()).toBeUndefined();
  });

  it('should load configuration from a file when config path is provided', () => {
    const configPath = '/test/config.json';
    const testConfig = {
      default: {
        provider: 'test-provider',
        model: 'test-model'
      },
      roleMap: {
        [roleEnums.CODER]: {
          provider: 'test-provider',
          model: 'test-coder-model'
        }
      }
    };
    mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(testConfig));

    const manager = new RoleModelConfigManager({
      configPath,
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    expect(mockFileSystem.existsSync).toHaveBeenCalledWith(configPath);
    expect(mockFileSystem.readFileSync).toHaveBeenCalledWith(configPath, 'utf-8');
    expect(manager.getConfig()).toEqual(testConfig);
    expect(manager.getConfigPath()).toEqual(configPath);
  });

  it('should handle file not found error when loading configuration', () => {
    const configPath = '/test/not-found.json';
    mockFileSystem.existsSync.mockReturnValue(false);

    const manager = new RoleModelConfigManager({
      configPath,
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(manager.getConfig()).toEqual(defaultRoleModelConfig);
  });

  it('should handle invalid JSON when loading configuration', () => {
    const configPath = '/test/invalid.json';
    mockFileSystem.readFileSync.mockReturnValue('invalid json');

    const manager = new RoleModelConfigManager({
      configPath,
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    expect(mockLogger.error).toHaveBeenCalled();
    expect(manager.getConfig()).toEqual(defaultRoleModelConfig);
  });

  it('should handle invalid configuration format when loading configuration', () => {
    const configPath = '/test/invalid-format.json';
    mockFileSystem.readFileSync.mockReturnValue(JSON.stringify({ invalid: 'format' }));

    const manager = new RoleModelConfigManager({
      configPath,
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid role model configuration'));
    expect(manager.getConfig()).toEqual(defaultRoleModelConfig);
  });

  it('should get the correct model configuration for a known role', () => {
    const manager = new RoleModelConfigManager({
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    const modelConfig = manager.getModelConfigForRole(roleEnums.CODER);

    expect(modelConfig).toEqual(defaultRoleModelConfig.roleMap[roleEnums.CODER]);
  });

  it('should return the default model configuration for an unknown role', () => {
    const manager = new RoleModelConfigManager({
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    const modelConfig = manager.getModelConfigForRole('unknown_role');

    expect(modelConfig).toEqual(defaultRoleModelConfig.default);
  });

  it('should successfully reload configuration', () => {
    const configPath = '/test/config.json';
    const manager = new RoleModelConfigManager({
      configPath,
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    // Change the mock to return a different config
    const updatedConfig = {
      default: {
        provider: 'updated-provider',
        model: 'updated-model'
      },
      roleMap: {}
    };
    mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(updatedConfig));

    // Reload the configuration
    const result = manager.reloadConfig();

    expect(result).toBe(true);
    expect(manager.getConfig()).toEqual(updatedConfig);
  });

  it('should handle relative paths correctly', () => {
    const relativePath = 'test/config.json';
    mockPath.isAbsolute.mockReturnValue(false);
    
    const manager = new RoleModelConfigManager({
      configPath: relativePath,
      fileSystemDI: mockFileSystem,
      pathDI: mockPath,
      logger: mockLogger
    });

    // First call should be to check if path is absolute
    expect(mockPath.isAbsolute).toHaveBeenCalledWith(relativePath);
    
    // Second call should be to join with cwd
    expect(mockPath.join).toHaveBeenCalledWith(expect.anything(), relativePath);
  });
});