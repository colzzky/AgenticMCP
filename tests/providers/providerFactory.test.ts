/**
 * Unit tests for ProviderFactory
 * Tests the provider factory functionality for creating and managing LLM providers
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProviderFactory } from '../../src/providers/providerFactory.js';
import type { LLMProvider, ProviderType } from '../../src/core/types/provider.types.js';
import type { Logger } from '../../src/core/types/logger.types.js';
import type { ConfigManager } from '../../src/core/config/configManager.js';
import type { ToolRegistry } from '../../src/tools/toolRegistry.js';
import { mock, MockProxy } from 'jest-mock-extended';
import { OpenAIProvider } from '../../src/providers/openai/openaiProvider.js';
import { AnthropicProvider } from '../../src/providers/anthropic/anthropicProvider.js';

// Mock provider classes for registration tests
class MockOpenAIProvider implements LLMProvider {
  get name() { return 'openai'; }
  configure = (jest.fn() as any).mockResolvedValue(undefined);
  setToolRegistry = jest.fn();
  getAvailableTools = (jest.fn() as any).mockReturnValue([]);
  generateCompletion = (jest.fn() as any).mockResolvedValue({ success: true });
  chat = (jest.fn() as any).mockResolvedValue({ success: true });
  executeToolCall = (jest.fn() as any).mockResolvedValue('');
  generateText = (jest.fn() as any).mockResolvedValue({ success: true });
  generateTextWithToolResults = (jest.fn() as any).mockResolvedValue({ success: true });
}
class MockAnthropicProvider implements LLMProvider {
  get name() { return 'anthropic'; }
  configure = (jest.fn() as any).mockResolvedValue(undefined);
  generateCompletion = (jest.fn() as any).mockResolvedValue({ success: true });
  chat = (jest.fn() as any).mockResolvedValue({ success: true });
  executeToolCall = (jest.fn() as any).mockResolvedValue('');
  generateText = (jest.fn() as any).mockResolvedValue({ success: true });
  generateTextWithToolResults = (jest.fn() as any).mockResolvedValue({ success: true });
  // No setToolRegistry on purpose
}

describe('ProviderFactory', () => {
  let mockOpenAIProvider: MockProxy<OpenAIProvider>;
  let mockAnthropicProvider: MockProxy<AnthropicProvider>;
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockConfigManager = {
    loadConfig: jest.fn(),
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    getProviderConfigByAlias: jest.fn(),
    getResolvedApiKey: jest.fn(),
    getDefaults: jest.fn(),
    getMcpConfig: jest.fn()
  } as unknown as ConfigManager;

  const mockToolRegistry = {
    registerTool: jest.fn(),
    registerTools: jest.fn(),
    getTool: jest.fn(),
    getAllTools: jest.fn(),
    getTools: jest.fn(),
    validateToolsForProvider: jest.fn(),
    registerFileSystemTools: jest.fn()
  } as unknown as ToolRegistry;


  beforeEach(() => {
    mockOpenAIProvider = mock<OpenAIProvider>();
    mockOpenAIProvider.name = 'openai';
    mockOpenAIProvider.setToolRegistry.mockImplementation(() => {});
    // ...set up any other method overrides or return values as needed

    mockAnthropicProvider = mock<AnthropicProvider>();
    mockAnthropicProvider.name = 'anthropic';
    // To simulate missing setToolRegistry:
    // @ts-expect-error
    delete mockAnthropicProvider.setToolRegistry;
    // ...set up any other method overrides or return values as needed
  });


  // Sample provider types
  const openaiProviderType: ProviderType = 'openai';
  const anthropicProviderType: ProviderType = 'anthropic';

  let providerFactory: ProviderFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    providerFactory = new ProviderFactory(mockConfigManager, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with the provided dependencies', () => {
      // Assert the factory is initialized
      expect(providerFactory).toBeInstanceOf(ProviderFactory);
    });
  });

  describe('registerProvider', () => {
    it('should register a provider implementation', () => {
      // Act
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      
      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(`Registered provider: ${openaiProviderType}`);
      expect(providerFactory.hasProviderType(openaiProviderType)).toBe(true);
    });

    it('should override existing provider registrations', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      
      // Act - Register a different class for the same type
      const newMockProvider = jest.fn() as unknown as new (...args: any[]) => LLMProvider;
      providerFactory.registerProvider(openaiProviderType, newMockProvider);
      
      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(`Registered provider: ${openaiProviderType}`);
      
      // Create an instance to verify the new class is used
      const provider = providerFactory.getProvider(openaiProviderType);
      expect(newMockProvider).toHaveBeenCalled();
    });
  });

  describe('getProvider', () => {
    it('should create and return a provider instance', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      
      // Act
      const provider = providerFactory.getProvider(openaiProviderType);
      
      // Assert
      expect(provider).toBeInstanceOf(MockOpenAIProvider);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created provider instance'));
    });

    it('should return the same instance for multiple calls with the same parameters', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      
      // Act
      const provider1 = providerFactory.getProvider(openaiProviderType);
      const provider2 = providerFactory.getProvider(openaiProviderType);
      
      // Assert
      expect(provider1).toBe(provider2); // Same instance
    });

    it('should throw error for unregistered provider type', () => {
      // Act & Assert
      expect(() => providerFactory.getProvider('unknown' as ProviderType))
        .toThrow('Provider type not registered');
    });

    it('should create different instances for different instance names', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      
      // Act
      const defaultInstance = providerFactory.getProvider(openaiProviderType);
      const namedInstance = providerFactory.getProvider(openaiProviderType, 'named');
      
      // Assert
      expect(defaultInstance).not.toBe(namedInstance);
    });

    it('should inject tool registry to provider if available', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      providerFactory.setToolRegistry(mockToolRegistry);
      
      // Act
      const provider = providerFactory.getProvider(openaiProviderType) as MockOpenAIProvider;
      
      // Assert
      expect(provider.setToolRegistry).toHaveBeenCalledWith(mockToolRegistry);
    });
  });

  describe('configureProvider', () => {
    it('should configure a provider with the given configuration', async () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      const config = { providerType: openaiProviderType, baseURL: 'https://api.example.com' };
      
      // Act
      const provider = await providerFactory.configureProvider(openaiProviderType, config);
      
      // Assert
      expect(provider).toBeInstanceOf(MockOpenAIProvider);
      expect(provider.configure).toHaveBeenCalledWith({
        ...config,
        instanceName: 'default',
        providerType: openaiProviderType
      });
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Configured provider'));
    });

    it('should handle configuration errors', async () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      const config = { providerType: openaiProviderType };
      const error = new Error('Configuration error');
      // We need to fix this since prototype.configure isn't a jest mock
      // Create a mock instance and mock it directly
      const mockProvider = new MockOpenAIProvider(mockConfigManager, mockLogger);
      mockProvider.configure.mockRejectedValueOnce(error);
      
      // Replace the getProvider method to return our mocked provider
      const getProviderSpy = jest.spyOn(providerFactory, 'getProvider')
        .mockReturnValueOnce(mockProvider);
      
      // Act & Assert
      await expect(providerFactory.configureProvider(openaiProviderType, config))
        .rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error configuring provider')
      );
    });
  });

  describe('hasProviderType', () => {
    it('should return true for registered provider types', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      
      // Act & Assert
      expect(providerFactory.hasProviderType(openaiProviderType)).toBe(true);
    });

    it('should return false for unregistered provider types', () => {
      // Act & Assert
      expect(providerFactory.hasProviderType('unknown' as ProviderType)).toBe(false);
    });
  });

  describe('getRegisteredProviderTypes', () => {
    it('should return all registered provider types', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      providerFactory.registerProvider(anthropicProviderType, MockAnthropicProvider);
      
      // Act
      const types = providerFactory.getRegisteredProviderTypes();
      
      // Assert
      expect(types).toContain(openaiProviderType);
      expect(types).toContain(anthropicProviderType);
      expect(types).toHaveLength(2);
    });

    it('should return empty array when no providers are registered', () => {
      // Act
      const types = providerFactory.getRegisteredProviderTypes();
      
      // Assert
      expect(types).toEqual([]);
    });
  });

  describe('clearInstances', () => {
    it('should clear all cached provider instances', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      const instance1 = providerFactory.getProvider(openaiProviderType);
      
      // Act
      providerFactory.clearInstances();
      const instance2 = providerFactory.getProvider(openaiProviderType);
      
      // Assert
      expect(instance1).not.toBe(instance2);
      expect(mockLogger.info).toHaveBeenCalledWith('Cleared all provider instances');
    });
  });

  describe('setToolRegistry', () => {
    it('should set the tool registry for the factory', () => {
      // Act
      providerFactory.setToolRegistry(mockToolRegistry);
      
      // Assert
      expect(providerFactory.getToolRegistry()).toBe(mockToolRegistry);
      expect(mockLogger.debug).toHaveBeenCalledWith('Set tool registry for provider factory');
    });

    it('should update existing provider instances that support tool registry', () => {
      // Arrange
      providerFactory.registerProvider(openaiProviderType, MockOpenAIProvider);
      providerFactory.registerProvider(anthropicProviderType, MockAnthropicProvider);
      
      const openaiProvider = providerFactory.getProvider(openaiProviderType) as MockOpenAIProvider;
      const anthropicProvider = providerFactory.getProvider(anthropicProviderType) as MockAnthropicProvider;
      
      // Act
      providerFactory.setToolRegistry(mockToolRegistry);
      
      // Assert
      expect(openaiProvider.setToolRegistry).toHaveBeenCalledWith(mockToolRegistry);
      // Anthropic provider doesn't implement setToolRegistry, so it shouldn't be called
    });
  });

  describe('getToolRegistry', () => {
    it('should return the tool registry if set', () => {
      // Arrange
      providerFactory.setToolRegistry(mockToolRegistry);
      
      // Act
      const registry = providerFactory.getToolRegistry();
      
      // Assert
      expect(registry).toBe(mockToolRegistry);
    });

    it('should return undefined if tool registry is not set', () => {
      // Act
      const registry = providerFactory.getToolRegistry();
      
      // Assert
      expect(registry).toBeUndefined();
    });
  });
});