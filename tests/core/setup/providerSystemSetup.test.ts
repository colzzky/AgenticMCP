/**
 * Unit tests for providerSystemSetup
 * Tests the setup of provider system components
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { setupProviderSystem } from '../../../src/core/setup/providerSystemSetup';
import type { Logger } from '../../../src/core/types/logger.types';
import type { PathDI, FileSystemDI } from '../../../src/types/global.types';
import type { ToolRegistry } from '../../../src/tools/toolRegistry';
import type { AppConfig } from '../../../src/core/types/config.types';

describe('providerSystemSetup', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };
  
  // Mock PathDI
  const mockPathDI: PathDI = {
    resolve: jest.fn(),
    join: jest.fn(),
    dirname: jest.fn(),
    basename: jest.fn(),
    extname: jest.fn()
  } as unknown as PathDI;
  
  // Mock FileSystemDI
  const mockFsDI: FileSystemDI = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn(),
    mkdir: jest.fn()
  } as unknown as FileSystemDI;
  
  // Mock ToolRegistry
  const mockToolRegistry = {
    registerTool: jest.fn(),
    registerTools: jest.fn(),
    getTools: jest.fn(),
    getAllTools: jest.fn(),
    getTool: jest.fn(),
    registerLocalCliTools: jest.fn(),
    validateToolsForProvider: jest.fn()
  } as unknown as ToolRegistry;
  
  // Mock AppConfig
  const mockAppConfig: AppConfig = {
    appName: 'test-app',
    version: '1.0.0',
    description: 'Test app',
    providers: {}
  };
  
  // Mock ConfigManager
  const mockConfigManagerInstance = {
    getConfig: jest.fn(),
    setConfig: jest.fn(),
    getConfigValue: jest.fn(),
    setConfigValue: jest.fn(),
    getResolvedApiKey: jest.fn()
  };
  const MockConfigManager = jest.fn().mockImplementation(() => mockConfigManagerInstance);
  
  // Mock ProviderFactory
  const mockProviderFactoryInstance = {
    createProvider: jest.fn(),
    setToolRegistry: jest.fn()
  };
  const MockProviderFactory = jest.fn().mockImplementation(() => mockProviderFactoryInstance);
  
  // Mock ProviderInitializer - Create this after the factory
  const mockProviderInitializerInstance = {
    initializeProvider: jest.fn(),
    registerProviders: jest.fn(),
    getProviderNames: jest.fn(),
    getFactory: jest.fn().mockReturnValue(mockProviderFactoryInstance)
  };
  const MockProviderInitializer = jest.fn().mockImplementation(() => mockProviderInitializerInstance);
  
  // Mock CredentialManager
  const mockCredentialManagerInstance = {
    getSecret: jest.fn(),
    setSecret: jest.fn(),
    deleteSecret: jest.fn(),
    findCredentialsByProvider: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create and configure provider system components', () => {
    // Act
    const result = setupProviderSystem(
      MockConfigManager as any,
      MockProviderInitializer as any,
      mockToolRegistry,
      mockLogger,
      mockPathDI,
      mockFsDI,
      mockAppConfig,
      MockProviderFactory as any,
      mockCredentialManagerInstance as any
    );
    
    // Assert
    // Verify logger was used
    expect(mockLogger.debug).toHaveBeenCalledWith('Initializing provider system');
    
    // Verify ConfigManager initialization
    expect(MockConfigManager).toHaveBeenCalledWith(
      'test-app',
      mockPathDI,
      mockFsDI,
      mockCredentialManagerInstance,
      mockLogger
    );
    
    // Verify ProviderFactory initialization
    expect(MockProviderFactory).toHaveBeenCalledWith(
      mockConfigManagerInstance,
      mockLogger
    );
    
    // Verify ProviderInitializer initialization
    expect(MockProviderInitializer).toHaveBeenCalledWith(
      mockProviderFactoryInstance,
      mockLogger,
      expect.any(Map)
    );
    
    // Verify tool registry connection
    expect(mockProviderFactoryInstance.setToolRegistry).toHaveBeenCalledWith(mockToolRegistry);
    expect(mockLogger.debug).toHaveBeenCalledWith('Connected tool registry with provider factory');
    
    // Verify return value structure has the expected keys
    expect(result).toHaveProperty('configManager');
    expect(result).toHaveProperty('providerFactoryInstance');
    // Note: The actual return values may differ based on implementation
  });
});