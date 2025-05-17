/**
 * Unit tests for ProviderInitializer
 * Tests the provider initializer functionality that centralizes provider registration
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProviderInitializer } from '../../src/providers/providerInitializer.js';
import type { ProviderFactoryInterface } from '../../src/providers/types.js';
import type { LLMProvider, ProviderType } from '../../src/core/types/provider.types.js';
import type { Logger } from '../../src/core/types/logger.types.js';

describe('ProviderInitializer', () => {
  // Mock implementations
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn()
  };

  // Create a mock provider factory
  const mockFactory: ProviderFactoryInterface = {
    registerProvider: jest.fn(),
    getProvider: jest.fn(),
    configureProvider: jest.fn(),
    hasProviderType: jest.fn(),
    getRegisteredProviderTypes: (jest.fn() as any).mockReturnValue(['openai', 'anthropic']),
    clearInstances: jest.fn(),
    setToolRegistry: jest.fn(),
    getToolRegistry: jest.fn()
  };

  // Mock provider class
  class MockProvider implements LLMProvider {
    get name() { return 'mockProvider'; }
    configure = (jest.fn() as any).mockResolvedValue(undefined);
    setToolRegistry = jest.fn();
    getAvailableTools = (jest.fn() as any).mockReturnValue([]);
    generateCompletion = (jest.fn() as any).mockResolvedValue({ success: true, content: 'test completion' });
    chat = (jest.fn() as any).mockResolvedValue({ success: true, content: 'test chat' });
    executeToolCall = (jest.fn() as any).mockResolvedValue('tool result');
    generateText = (jest.fn() as any).mockResolvedValue({ success: true, content: 'test text' });
    generateTextWithToolResults = (jest.fn() as any).mockResolvedValue({ success: true, content: 'tool results' });
  }

  let providerInitializer: ProviderInitializer;
  let providerClasses: Map<ProviderType, new (...args: any[]) => LLMProvider>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock provider classes
    providerClasses = new Map();
    providerClasses.set('openai', MockProvider);
    providerClasses.set('anthropic', MockProvider);
  });
  
  describe('Constructor', () => {
    it('should initialize without provider classes', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger);
      expect(mockFactory.registerProvider).not.toHaveBeenCalled();
    });
    
    it('should register provider classes when provided', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger, providerClasses);
      expect(mockFactory.registerProvider).toHaveBeenCalledTimes(2);
      expect(mockFactory.registerProvider).toHaveBeenCalledWith('openai', MockProvider);
      expect(mockFactory.registerProvider).toHaveBeenCalledWith('anthropic', MockProvider);
      expect(mockLogger.info).toHaveBeenCalled();
    });
    
    it('should handle empty provider classes map', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger, new Map());
      expect(mockFactory.registerProvider).not.toHaveBeenCalled();
    });
  });
  
  describe('getFactory', () => {
    it('should return the factory instance', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger);
      const factory = providerInitializer.getFactory();
      expect(factory).toBe(mockFactory);
    });
  });
  
  describe('getProvider', () => {
    it('should delegate to factory.getProvider with default instance name', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger);
      const mockProviderInstance = new MockProvider();
      mockFactory.getProvider = (jest.fn() as any).mockReturnValue(mockProviderInstance);
      
      const provider = providerInitializer.getProvider('openai');
      
      expect(mockFactory.getProvider).toHaveBeenCalledWith('openai', 'default');
      expect(provider).toBe(mockProviderInstance);
    });
    
    it('should delegate to factory.getProvider with custom instance name', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger);
      const mockProviderInstance = new MockProvider();
      mockFactory.getProvider = (jest.fn() as any).mockReturnValue(mockProviderInstance);
      
      const provider = providerInitializer.getProvider('anthropic', 'custom');
      
      expect(mockFactory.getProvider).toHaveBeenCalledWith('anthropic', 'custom');
      expect(provider).toBe(mockProviderInstance);
    });
    
    it('should propagate errors from factory.getProvider', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger);
      mockFactory.getProvider = (jest.fn() as any).mockImplementation(() => {
        throw new Error('Provider not found');
      });
      
      expect(() => providerInitializer.getProvider('unknown')).toThrow('Provider not found');
      expect(mockFactory.getProvider).toHaveBeenCalledWith('unknown', 'default');
    });
  });
  
  describe('Integration with Factory', () => {
    it('should properly initialize and interact with the factory', () => {
      // Create the initializer with provider classes
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger, providerClasses);
      
      // Verify registrations occurred
      expect(mockFactory.registerProvider).toHaveBeenCalledTimes(2);
      
      // Mock successful provider retrieval
      const mockProviderInstance = new MockProvider();
      mockFactory.getProvider = (jest.fn() as any).mockReturnValue(mockProviderInstance);
      
      // Test getting a provider
      const provider = providerInitializer.getProvider('openai');
      expect(provider).toBe(mockProviderInstance);
      expect(mockFactory.getProvider).toHaveBeenCalledWith('openai', 'default');
    });
  });
  
  describe('Private registerProviders', () => {
    it('should register all providers in the map', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger);
      
      // Access private method using type assertion
      (providerInitializer as any).registerProviders(providerClasses);
      
      expect(mockFactory.registerProvider).toHaveBeenCalledTimes(2);
      expect(mockFactory.registerProvider).toHaveBeenCalledWith('openai', MockProvider);
      expect(mockFactory.registerProvider).toHaveBeenCalledWith('anthropic', MockProvider);
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockFactory.getRegisteredProviderTypes).toHaveBeenCalled();
    });
    
    it('should handle errors during provider registration', () => {
      providerInitializer = new ProviderInitializer(mockFactory, mockLogger);
      
      // Mock a failure
      mockFactory.registerProvider = (jest.fn() as any).mockImplementation((type) => {
        if (type === 'anthropic') {
          throw new Error('Registration failed');
        }
      });
      
      // We expect this to throw for the second provider
      expect(() => {
        (providerInitializer as any).registerProviders(providerClasses);
      }).toThrow('Registration failed');
      
      // The first provider should have been registered
      expect(mockFactory.registerProvider).toHaveBeenCalledWith('openai', MockProvider);
    });
  });
});