/**
 * @file Integration tests for the tool system with providers
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ToolRegistry } from '../../src/tools/toolRegistry';
import { ProviderFactory } from '../../src/providers/providerFactory';
import { OpenAIProvider } from '../../src/providers/openai/openaiProvider';
import { AnthropicProvider } from '../../src/providers/anthropic/anthropicProvider';
import { ConfigManager } from '../../src/core/config/configManager';
import { Logger } from '../../src/core/types/logger.types';

// Mock dependencies
jest.mock('../../src/core/config/configManager');
jest.mock('../../src/providers/openai/openaiProvider');
jest.mock('../../src/providers/anthropic/anthropicProvider');

describe('Tool System Integration', () => {
  let toolRegistry: ToolRegistry;
  let providerFactory: ProviderFactory;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockLogger: Logger;
  
  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Create mock config manager
    mockConfigManager = new ConfigManager() as jest.Mocked<ConfigManager>;
    
    // Create tool registry
    toolRegistry = new ToolRegistry(mockLogger);
    
    // Register some test tools
    toolRegistry.registerTool({
      type: 'function',
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'A test parameter' }
        },
        required: ['param1']
      }
    });
    
    // Create provider factory
    providerFactory = new ProviderFactory(mockConfigManager);
    
    // Register provider classes
    providerFactory.registerProvider('openai', OpenAIProvider);
    providerFactory.registerProvider('anthropic', AnthropicProvider);
    
    // Set tool registry on provider factory
    providerFactory.setToolRegistry(toolRegistry);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('ProviderFactory with ToolRegistry', () => {
    it('should correctly attach tool registry to provider factory', () => {
      expect(providerFactory.getToolRegistry()).toBe(toolRegistry);
    });
    
    it('should pass tool registry to new provider instances', () => {
      // Get a provider instance
      const openaiProvider = providerFactory.getProvider('openai');
      
      // Verify the setToolRegistry method was called on the provider
      expect(openaiProvider.setToolRegistry).toHaveBeenCalledWith(toolRegistry);
    });
  });
  
  describe('OpenAI Provider with tools', () => {
    it('should make tool registry available to providers', async () => {
      // Setup the mock provider instance
      const openaiProvider = providerFactory.getProvider('openai') as jest.Mocked<OpenAIProvider>;

      // Mock necessary methods
      (openaiProvider.getAvailableTools as any).mockReturnValue([
        {
          name: 'test_tool',
          description: 'A test tool',
          type: 'function',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ]);

      // Configure the provider
      await providerFactory.configureProvider('openai', {
        apiKey: 'test-key',
        model: 'gpt-4',
        providerType: 'openai',
        instanceName: 'test-instance'
      });

      // Verify that the provider's setToolRegistry method was called
      expect(openaiProvider.setToolRegistry).toHaveBeenCalledWith(toolRegistry);
      expect(openaiProvider.getAvailableTools).toBeDefined();

      // Test that the tool registry is accessible
      const tools = openaiProvider.getAvailableTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
    });
  });
});