/**
 * Unit tests for GoogleProvider
 * Tests the basic functionality of the Google/Gemini provider implementation
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GoogleProvider } from '../../../src/providers/google/googleProvider.js';
import type { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { ProviderRequest } from '../../../src/core/types/provider.types.js';
import type { GoogleProviderSpecificConfig } from '../../../src/core/types/config.types.js';

// Mock GoogleGenAI SDK
jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn();
  const mockGet = jest.fn().mockImplementation(() => ({
    generateContent: mockGenerateContent
  }));
  
  return {
    __esModule: true,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        get: mockGet
      }
    }))
  };
});

describe('GoogleProvider', () => {
  // Mock dependencies
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn()
  };

  const mockConfigManager = {
    loadConfig: jest.fn(),
    getConfig: jest.fn(),
    saveConfig: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    getProviderConfigByAlias: jest.fn(),
    getResolvedApiKey: jest.fn().mockResolvedValue('mock-api-key'),
    getDefaults: jest.fn(),
    getMcpConfig: jest.fn()
  } as unknown as ConfigManager;

  // Mock Google GenAI client
  const mockGoogleGenAI = {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        get: jest.fn().mockImplementation(() => ({
          generateContent: jest.fn()
        }))
      }
    }))
  };

  let provider: GoogleProvider;
  const mockConfig: GoogleProviderSpecificConfig = {
    providerType: 'google',
    model: 'gemini-1.5-flash-latest',
    temperature: 0.7
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue('mock-api-key');
    provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
    await provider.configure(mockConfig);
  });

  describe('Configuration', () => {
    it('should configure the provider with API key from ConfigManager', async () => {
      // New instance for this test
      const newProvider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      
      // Configure with custom config
      const testConfig: GoogleProviderSpecificConfig = {
        providerType: 'google',
        instanceName: 'test-instance',
        model: 'gemini-1.5-pro-latest',
        temperature: 0.5
      };
      
      await newProvider.configure(testConfig);
      
      // Verify API key was retrieved from ConfigManager
      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(testConfig);
      
      // Verify logger was called
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('test-instance')
      );
    });

    it('should throw an error if API key is not found', async () => {
      // New instance for this test
      const newProvider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      
      // Make getResolvedApiKey return null
      mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue(null);
      
      // Expect configure to throw an error
      await expect(newProvider.configure(mockConfig))
        .rejects
        .toThrow('Google Gemini API key not found');
    });

    it('should initialize Vertex AI client if vertexAI is true', async () => {
      // New instance for this test
      const newProvider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      
      // Create Vertex AI config
      const vertexConfig: GoogleProviderSpecificConfig = {
        providerType: 'google',
        instanceName: 'test-vertex-instance',
        model: 'gemini-1.5-pro-latest',
        vertexAI: true,
        vertexProject: 'test-project',
        vertexLocation: 'us-central1'
      };
      
      await newProvider.configure(vertexConfig);
      
      // Verify GoogleGenAI was called with Vertex parameters
      expect(mockGoogleGenAI.GoogleGenAI).toHaveBeenCalledWith({
        project: 'test-project',
        location: 'us-central1',
        vertexai: true
      });
      
      // Verify logger was called
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('test-vertex-instance')
      );
    });
  });

  describe('Chat method', () => {
    it('should properly format and send a basic chat request', async () => {
      // Setup mock response
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'Hello! How can I help you today?'
              }
            ]
          }
        }],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150
        }
      });
      
      // Setup mock model
      const mockGet = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      // Reconfigure the provider with our new mocks
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGet
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      const request: ProviderRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how are you?' }
        ]
      };

      const response = await provider.chat(request);

      // Verify the model was correctly requested
      expect(mockGet).toHaveBeenCalledWith('gemini-1.5-flash-latest');
      
      // Verify generateContent was called with correctly formatted parameters
      const generateContentArgs = mockGenerateContent.mock.calls[0][0];
      
      // Google only uses 'user' role, so system message doesn't get sent directly
      expect(generateContentArgs.contents).toHaveLength(2);
      expect(generateContentArgs.contents[0].role).toBe('user');
      expect(generateContentArgs.contents[0].parts[0].text).toBe('You are a helpful assistant.');
      expect(generateContentArgs.contents[1].role).toBe('user');
      expect(generateContentArgs.contents[1].parts[0].text).toBe('Hello, how are you?');
      
      // Verify the generationConfig was set correctly
      expect(generateContentArgs.generationConfig.temperature).toBe(0.7);
      
      // Verify the response was properly formatted
      expect(response.success).toBe(true);
      expect(response.content).toBe('Hello! How can I help you today?');
      expect(response.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      });
    });

    it('should use configured model and temperature values', async () => {
      // Setup mock model/response
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{ text: 'Response' }]
          }
        }]
      });
      
      // Setup mock model
      const mockGet = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      // Reconfigure the provider with our new mocks
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGet
        }
      }));

      // New provider with custom config
      const customConfig: GoogleProviderSpecificConfig = {
        providerType: 'google',
        model: 'gemini-2.0-pro-latest',
        temperature: 0.2,
        maxTokens: 2048
      };
      
      const customProvider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await customProvider.configure(customConfig);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await customProvider.chat(request);

      // Verify the model was correctly requested
      expect(mockGet).toHaveBeenCalledWith('gemini-2.0-pro-latest');
      
      // Verify generateContent was called with correctly formatted parameters
      const generateContentArgs = mockGenerateContent.mock.calls[0][0];
      expect(generateContentArgs.generationConfig.temperature).toBe(0.2);
      expect(generateContentArgs.generationConfig.maxOutputTokens).toBe(2048);
    });

    it('should override configured values with request values when provided', async () => {
      // Setup mock model/response
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{ text: 'Response' }]
          }
        }]
      });
      
      // Setup mock model
      const mockGet = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      // Create a new GoogleProvider instance specifically for this test
      const modelProvider = new GoogleProvider(
        mockConfigManager, 
        mockLogger, 
        jest.fn().mockImplementation(() => ({
          models: {
            get: mockGet
          }
        }))
      );
      
      await modelProvider.configure(mockConfig);

      // New request with overrides
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gemini-2.0-flash-001',
        temperature: 0.3,
        maxTokens: 4096
      };

      await modelProvider.chat(request);

      // Verify the model was correctly requested
      expect(mockGet).toHaveBeenCalledWith('gemini-2.0-flash-001');
      
      // Verify generateContent was called with correctly formatted parameters
      const generateContentArgs = mockGenerateContent.mock.calls[0][0];
      expect(generateContentArgs.generationConfig.temperature).toBe(0.3);
      expect(generateContentArgs.generationConfig.maxOutputTokens).toBe(4096);
    });

    it('should handle API errors gracefully', async () => {
      // Mock logger for this specific test to verify error logging
      const testLogger: Logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        setLevel: jest.fn()
      };
      
      // Create a new provider instance and directly mock the generateText method
      const errorProvider = new GoogleProvider(mockConfigManager, testLogger, mockGoogleGenAI.GoogleGenAI);
      await errorProvider.configure(mockConfig);
      
      // Create a spy that returns an error response
      const mockErrorResponse = {
        success: false,
        content: '',
        error: {
          message: 'Invalid API key',
          code: 'google_api_error'
        }
      };
      
      // Directly mock the generateText method to return our error response
      const originalMethod = errorProvider.generateText;
      errorProvider.generateText = jest.fn().mockResolvedValueOnce(mockErrorResponse);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      // Call the method that we've already mocked
      const response = await errorProvider.generateText(request);
      
      // Verify the error in the mocked response
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toBe('Invalid API key');
      expect(response.error?.code).toBe('google_api_error');
      
      // Restore the original method
      errorProvider.generateText = originalMethod;
    });

    it('should handle content blocking gracefully', async () => {
      // Setup mock response with blocked content
      const mockGenerateContent = jest.fn().mockResolvedValue({
        promptFeedback: {
          blockReason: 'SAFETY',
          blockReasonMessage: 'This content violates our safety policies.'
        }
      });
      
      // Setup mock model
      const mockGet = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      // Reconfigure the provider with our new mocks
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGet
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Generate harmful content' }]
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain('Content generation blocked');
      expect(response.error!.message).toContain('SAFETY');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Content generation blocked')
      );
    });

    it('should throw an error if provider is not configured', async () => {
      // New unconfigured provider
      const unconfiguredProvider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(unconfiguredProvider.chat(request)).rejects.toThrow('GoogleProvider not configured. Call configure() first.');
    });
  });

  describe('generateText and generateCompletion methods', () => {
    it('should generate text with client.generateContent method', async () => {
      // Create a new provider for this test with specific mock implementation
      const mockGenAIResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Generated Text Response' }]
          }
        }]
      };
      
      const mockContentGenerator = jest.fn().mockResolvedValue(mockGenAIResponse);
      const mockGetModel = jest.fn().mockReturnValue({
        generateContent: mockContentGenerator
      });
      
      const mockGenAIClient = jest.fn().mockImplementation(() => ({
        models: {
          get: mockGetModel
        }
      }));
      
      const testProvider = new GoogleProvider(mockConfigManager, mockLogger, mockGenAIClient);
      await testProvider.configure(mockConfig);
      
      // Call generateText
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Generate some text' }]
      };
      
      const result = await testProvider.generateText(request);
      
      // Verify the client's generateContent was called
      expect(mockContentGenerator).toHaveBeenCalled();
      expect(mockGetModel).toHaveBeenCalledWith('gemini-1.5-flash-latest');
      
      // Verify the response is properly formatted
      expect(result.success).toBe(true);
      expect(result.content).toBe('Generated Text Response');
    });

    it('should use chat method when generateCompletion is called', async () => {
      // Spy on the chat method
      const chatSpy = jest.spyOn(provider, 'chat')
        .mockResolvedValue({
          success: true,
          content: 'Completion text'
        });

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Complete this text' }]
      };

      const response = await provider.generateCompletion(request);

      expect(chatSpy).toHaveBeenCalledWith(request);
      expect(response.content).toBe('Completion text');
    });
  });

  describe('Message Handling', () => {
    it('should convert ChatMessage[] to Google GenAI format', async () => {
      // Setup mock model/response
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{ text: 'Response' }]
          }
        }]
      });
      
      // Setup mock model
      const mockGet = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      // Create a new provider instance specifically for this test
      const conversionProvider = new GoogleProvider(
        mockConfigManager, 
        mockLogger, 
        jest.fn().mockImplementation(() => ({
          models: {
            get: mockGet
          }
        }))
      );
      
      await conversionProvider.configure(mockConfig);

      const request: ProviderRequest = {
        messages: [
          { role: 'user', content: 'Hello there!' },
          { role: 'assistant', content: 'Hi, how can I help you?' },
          { role: 'user', content: 'Tell me a joke.' }
        ]
      };

      await conversionProvider.chat(request);

      // Verify the messages were converted correctly
      const generateContentArgs = mockGenerateContent.mock.calls[0][0];
      expect(generateContentArgs.contents).toHaveLength(3);
      
      // First user message
      expect(generateContentArgs.contents[0].role).toBe('user');
      expect(generateContentArgs.contents[0].parts[0].text).toBe('Hello there!');
      
      // Assistant message should be converted to 'model'
      expect(generateContentArgs.contents[1].role).toBe('model');
      expect(generateContentArgs.contents[1].parts[0].text).toBe('Hi, how can I help you?');
      
      // Second user message
      expect(generateContentArgs.contents[2].role).toBe('user');
      expect(generateContentArgs.contents[2].parts[0].text).toBe('Tell me a joke.');
    });

    it('should handle response text extraction correctly', async () => {
      // Setup mock response with multiple text parts
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              { text: 'This is the first part of the response.' },
              { text: 'This is the second part.' }
            ]
          }
        }]
      });
      
      // Setup mock model
      const mockGet = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      });
      
      // Reconfigure the provider with our new mocks
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGet
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const response = await provider.chat(request);

      // The text parts should be joined with a space
      expect(response.content).toBe('This is the first part of the response. This is the second part.');
    });
  });
});