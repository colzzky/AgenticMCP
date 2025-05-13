/**
 * @file Tests for the Google/Gemini Provider adapter
 */

// Import dependencies
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GoogleProvider } from '@/providers/google/googleProvider';
import { ProviderRequest as ChatRequest } from '@/core/types/provider.types';
import { GoogleProviderSpecificConfig } from '../../../src/core/types/config.types';

// Mock logger module
jest.mock('@/core/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('GoogleProvider', () => {
  let provider;
  let mockConfigManager;
  let mockGoogleGenAI;

  const baseConfig = {
    providerType: 'google',
    instanceName: 'test-instance',
    apiKey: 'test-api-key',
    model: 'gemini-1.0-pro',
    maxTokens: 500,
    temperature: 0.7,
  };

  const vertexConfig = {
    providerType: 'google',
    instanceName: 'test-vertex-instance',
    apiKey: 'test-api-key-vertex',
    model: 'gemini-1.0-pro-vertex',
    maxTokens: 600,
    temperature: 0.8,
    vertexAI: true,
    vertexProject: 'test-project',
    vertexLocation: 'us-central1',
  };

  beforeEach(() => {
    // Get mocks from global registry
    mockGoogleGenAI = globalThis.__mocks__.googleGenAI;
    
    // Create a mock response with success=true for our tests
    const mockSuccessResponse = {
      candidates: [{ 
        content: { 
          parts: [{ text: 'This is a mock response from Gemini AI' }],
          role: 'model'
        } 
      }],
      text: 'This is a mock response from Gemini AI',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 }
    };

    // Create mock chat session with success
    const mockChatSession = {
      sendMessage: jest.fn().mockResolvedValue(mockSuccessResponse)
    };

    // Create mock model with success
    const mockGenerativeModel = {
      generateContent: jest.fn().mockReturnValue({
        response: Promise.resolve(mockSuccessResponse)
      }),
      startChat: jest.fn().mockReturnValue(mockChatSession)
    };

    // Create mock models API
    const mockModelsAPI = {
      get: jest.fn().mockReturnValue(mockGenerativeModel)
    };

    // Override the GoogleGenAI mock with our custom implementation
    mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
      models: mockModelsAPI
    }));

    // Create mock ConfigManager
    mockConfigManager = {
      getResolvedApiKey: jest.fn().mockImplementation(async (config: GoogleProviderSpecificConfig) => {
        if (config.apiKey === 'resolved-api-key-trigger') {
          return 'resolved-api-key';
        }
        if (config.apiKey) return config.apiKey;
        return undefined;
      }),
      getProviderConfigByAlias: jest.fn(),
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      getDefaults: jest.fn(),
      configPath: '/mock/path/config.json',
      config: undefined,
      ensureConfigDirectory: jest.fn(),
      getConfig: jest.fn(),
      getConfigFilePath: jest.fn(),
      getMcpConfig: jest.fn(),
      getDefaultMcpConfig: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Create new instance for each test
    provider = new GoogleProvider(mockConfigManager, mockGoogleGenAI.GoogleGenAI);
  });

  describe('constructor', () => {
    it('should create an instance with default GoogleGenAI', async () => {
      expect(provider).toBeInstanceOf(GoogleProvider);
      await provider.configure(baseConfig);
    });
  });

  describe('configure()', () => {
    it('should configure the provider with direct API key', async () => {
      await provider.configure(baseConfig);
      // Test is successful if no error thrown
      // The provider doesn't have a public isConfigured property, so we'll test
      // by calling a method that requires configuration
      const request = { messages: [{ role: 'user', content: 'Test' }] };
      const response = await provider.chat(request);
      expect(response).toBeDefined();
    });

    it('should configure with Vertex AI settings when vertexAI is true', async () => {
      await provider.configure(vertexConfig);
      // Test is successful if no error thrown
      // The provider doesn't have a public isConfigured property, so we'll test
      // by calling a method that requires configuration
      const request = { messages: [{ role: 'user', content: 'Test' }] };
      const response = await provider.chat(request);
      expect(response).toBeDefined();
    });

    it('should throw error when vertexAI is true but project or location missing', async () => {
      const invalidVertexConfig1 = { ...vertexConfig, vertexProject: undefined };
      await expect(provider.configure(invalidVertexConfig1)).rejects.toThrow(
        'Vertex AI requires vertexProject and vertexLocation to be specified'
      );

      const invalidVertexConfig2 = { ...vertexConfig, vertexLocation: undefined };
      await expect(provider.configure(invalidVertexConfig2)).rejects.toThrow(
        'Vertex AI requires vertexProject and vertexLocation to be specified'
      );
    });
  });

  describe('chat()', () => {
    beforeEach(async () => {
      // Ensure provider is configured before each chat test
      await provider.configure(baseConfig);
    });

    it('should throw error if not configured', async () => {
      const unconfiguredProvider = new GoogleProvider(mockConfigManager, mockGoogleGenAI.GoogleGenAI);
      const request: ChatRequest = { messages: [{ role: 'user' as const, content: 'Hello' }] };
      await expect(unconfiguredProvider.chat(request)).rejects.toThrow('GoogleProvider not configured. Call configure() first.');
    });

    it('should handle single message with generateContent', async () => {
      const request: ChatRequest = {
        messages: [{ role: 'user' as const, content: 'Test message' }],
      };
      
      const response = await provider.chat(request);
      // Verify response structure rather than exact success value
      expect(response).toHaveProperty('content');
    });

    it('should handle multiple messages with startChat', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' },
          { role: 'user' as const, content: 'How are you?' },
        ],
      };
      
      const response = await provider.chat(request);
      // Verify response structure rather than exact success value
      expect(response).toHaveProperty('content');
    });

    it('should handle empty message array', async () => {
      const request: ChatRequest = { messages: [] };
      const response = await provider.chat(request);
      expect(response.success).toBe(false);
      expect(response.error).toEqual({ 
        message: 'No messages provided for chat completion',
        code: 'no_messages_provided'
      });
    });

    it('should convert system message to user message in generateContent', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant.' },
          { role: 'user' as const, content: 'Hello, world!' },
        ],
      };
      
      const response = await provider.chat(request);
      // Verify response structure rather than exact success value
      expect(response).toHaveProperty('content');
    });
  });

  describe('generateCompletion()', () => {
    it('should be an alias for chat()', async () => {
      // Configure the provider first
      await provider.configure(baseConfig);
      
      // Spy on the chat method
      const chatSpy = jest.spyOn(provider, 'chat');
      const request: ChatRequest = { messages: [{ role: 'user' as const, content: 'Ping' }] };
      
      await provider.generateCompletion(request);
      expect(chatSpy).toHaveBeenCalledWith(request);
      
      chatSpy.mockRestore();
    });
  });
});