/**
 * @file Tests for the Google/Gemini Provider adapter
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
// Import actuals for typing jest.requireActual and for type casting
import { 
  GoogleGenAI as ActualGoogleGenAI,
  HarmCategory as ActualHarmCategory,
  HarmBlockThreshold as ActualHarmBlockThreshold,

  Content, // For casting and verifying parts of the request
  Part // For casting and verifying parts of the request
} from '@google/genai'; 
import { GoogleProvider } from '@/providers/google/googleProvider';
import { GoogleProviderSpecificConfig } from '@/core/types/config.types';
import { ConfigManager } from '@/core/config/configManager';
import { ProviderRequest as ChatRequest, ChatMessage as Message } from '@/core/types/provider.types';
import { logger } from '@/core/utils/logger';

// Define the types for the mock constructor and instance more explicitly
interface MockGoogleGenAIConstructorConfig {
  apiKey?: string;
  project?: string;
  location?: string;
}

// Define the structure for the mock response of generateContent/sendMessage
const mockChatGenerateContentResponse = {
  response: {
    candidates: [{ content: { parts: [{ text: 'This is a mock response from Gemini AI' }], role: 'model' as const } }],
  },
};
const mockChatSendMessageResponse = {
  response: {
    candidates: [{ content: { parts: [{ text: 'This is a mock response from Gemini AI' }], role: 'model' as const } }],
  },
};

// For the object returned by startChat
interface MockChatSession {
  sendMessage: jest.Mock<() => Promise<typeof mockChatSendMessageResponse>>;
}

// Create a consistent instance for MockChatSession
const mockChatSessionInstance: MockChatSession = {
  sendMessage: jest.fn<() => Promise<typeof mockChatSendMessageResponse>>().mockResolvedValue(mockChatSendMessageResponse),
};

interface MockGenerativeModelInstance {
  generateContent: jest.MockedFunction<(args: any) => Promise<typeof mockChatGenerateContentResponse>>;
  startChat: jest.MockedFunction<(args?: any) => MockChatSession>;
}

interface MockModelsAPI {
  // Ensure the signature here matches how it's used and expected.
  // _model: string is an argument, returns MockGenerativeModel
  get: jest.Mock<(_model: string) => MockGenerativeModelInstance>;
}

interface MockGoogleGenAIInstance {
  models: MockModelsAPI;
}

// 1. Define the mock constructor logic EXPLICITLY
// Ensure the mock instances fully match their interface definitions.
const mockGenerativeModelInstance: MockGenerativeModelInstance = {
  generateContent: jest.fn<(args: any) => Promise<typeof mockChatGenerateContentResponse>>().mockResolvedValue(mockChatGenerateContentResponse),
  startChat: jest.fn<(args?: any) => MockChatSession>().mockReturnValue(mockChatSessionInstance),
};

const mockModelsAPIInstance: MockModelsAPI = {
  get: jest.fn<(_model: string) => MockGenerativeModelInstance>().mockReturnValue(mockGenerativeModelInstance),
};

// This is the explicit mock constructor function we will use for assertions
// and pass to GoogleProvider
const mockGoogleGenAIConstructor = jest.fn<
  (configOrApiKey?: string | any /* MockGoogleGenAIConstructorConfig */) => MockGoogleGenAIInstance
>(
  (_configOrApiKey?: string | any /* MockGoogleGenAIConstructorConfig */): MockGoogleGenAIInstance => {
    console.log('[Test MOCK] mockGoogleGenAIConstructor called with:', _configOrApiKey);
    // Ensure the returned object *exactly* matches MockGoogleGenAIInstance.
    // mockModelsAPIInstance is already typed as MockModelsAPI.
    // mockGenerativeModelInstance is already typed as MockGenerativeModel.
    return {
      models: mockModelsAPIInstance, // This should be strictly typed.
    } as MockGoogleGenAIInstance;
  }
);

// 2. Tell Jest to use this implementation for GoogleGenAI
interface ActualGenAIModule {
  GoogleGenAI: typeof ActualGoogleGenAI; // Type of the class/constructor
  HarmCategory: typeof ActualHarmCategory;
  HarmBlockThreshold: typeof ActualHarmBlockThreshold;
}

const actualGenAIModule = jest.requireActual('@google/genai') as ActualGenAIModule;

jest.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAIConstructor, // This is the mock constructor function
  HarmCategory: actualGenAIModule.HarmCategory,
  HarmBlockThreshold: actualGenAIModule.HarmBlockThreshold,
}));

jest.mock('@/core/utils/logger');

describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  const baseConfig: GoogleProviderSpecificConfig = {
    providerType: 'google',
    instanceName: 'test-instance',
    apiKey: 'test-api-key',
    model: 'gemini-1.0-pro', // Updated to a common valid model for tests
    maxTokens: 500,
    temperature: 0.7,
  };

  const vertexConfig: GoogleProviderSpecificConfig = {
    providerType: 'google',
    instanceName: 'test-vertex-instance',
    apiKey: 'test-api-key-vertex', // Can still be present, might be used by ConfigManager if vertex settings fail
    model: 'gemini-1.0-pro-vertex',
    maxTokens: 600,
    temperature: 0.8,
    vertexAI: true,
    vertexProject: 'test-project',
    vertexLocation: 'us-central1',
  };

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    mockGoogleGenAIConstructor.mockClear();
    mockModelsAPIInstance.get.mockClear();
    mockGenerativeModelInstance.generateContent.mockClear();
    mockGenerativeModelInstance.startChat.mockClear();
    mockChatSessionInstance.sendMessage.mockClear(); // Clear sendMessage on the consistent instance

    mockConfigManager = {
      getResolvedApiKey: jest.fn<ConfigManager['getResolvedApiKey']>().mockImplementation(async (config: GoogleProviderSpecificConfig) => {
        if (config.apiKey === 'resolved-api-key-trigger') {
          return 'resolved-api-key';
        }
        if (config.apiKey && config.apiKey !== 'resolved-api-key-trigger') return config.apiKey;
        return; // Fixed: unicorn/no-useless-undefined
      }),
      getProviderConfigByAlias: jest.fn<ConfigManager['getProviderConfigByAlias']>(),
      loadConfig: jest.fn<ConfigManager['loadConfig']>(),
      saveConfig: jest.fn<ConfigManager['saveConfig']>(),
      get: jest.fn<ConfigManager['get']>(),
      set: jest.fn<ConfigManager['set']>(),
      getDefaults: jest.fn<ConfigManager['getDefaults']>(),
    } as unknown as jest.Mocked<ConfigManager>; // Using unknown as jest.Mocked<ConfigManager> because we are not mocking all methods of ConfigManager

    // 3. Pass the explicit mock constructor to the GoogleProvider
    // Use ActualGoogleGenAI for the type cast here, as it refers to the original class type
    provider = new GoogleProvider(mockConfigManager, mockGoogleGenAIConstructor as unknown as typeof ActualGoogleGenAI);
  });

  describe('constructor', () => {
    it('should create an instance with default GoogleGenAI if no SDK provided', async () => {
      const providerWithoutSDK = new GoogleProvider(mockConfigManager);
      expect(providerWithoutSDK).toBeInstanceOf(GoogleProvider);
      // Configure the provider to trigger the SDK constructor call
      await providerWithoutSDK.configure(baseConfig); 
      expect(mockGoogleGenAIConstructor).toHaveBeenCalled();
    });

    it('should use provided SDK', async () => {
      // Provider is already created with mockGoogleGenAIConstructor in the outer beforeEach
      await provider.configure(baseConfig);
      expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });
  });

  describe('configure()', () => {
    it('should configure the provider with direct API key', async () => {
      await provider.configure(baseConfig);
      expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });
    });

    it('should configure with Vertex AI settings when vertexAI is true', async () => {
      await provider.configure(vertexConfig);
      expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith({
        project: 'test-project',
        location: 'us-central1',
      });
    });

    it('should throw error when vertexAI is true but project or location missing', async () => {
      const invalidVertexConfig1 = { ...vertexConfig, vertexProject: undefined };
      await expect(provider.configure(invalidVertexConfig1 as any)).rejects.toThrow(
        'Vertex AI requires vertexProject and vertexLocation to be specified'
      );

      const invalidVertexConfig2 = { ...vertexConfig, vertexLocation: undefined };
      await expect(provider.configure(invalidVertexConfig2 as any)).rejects.toThrow(
        'Vertex AI requires vertexProject and vertexLocation to be specified'
      );
    });

    it('should use ConfigManager to get API key if available', async () => {
      const configToTriggerResolvedKey: GoogleProviderSpecificConfig = {
        ...baseConfig,
        apiKey: 'resolved-api-key-trigger', // Special key to trigger mock's different return
      };
      await provider.configure(configToTriggerResolvedKey);

      expect(mockConfigManager.getResolvedApiKey).toHaveBeenCalledWith(configToTriggerResolvedKey);
      expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith({
        apiKey: 'resolved-api-key',
      });
    });
  });

  describe('chat()', () => {
    beforeEach(async () => {
      // Ensure provider is configured before each chat test
      await provider.configure(baseConfig);
      // Reset calls to the constructor from configure, so we only see calls from chat (if any)
      // Or rather, we care about the model methods being called.
      mockModelsAPIInstance.get.mockClear();
      mockGenerativeModelInstance.generateContent.mockClear();
      mockGenerativeModelInstance.startChat.mockClear();
      mockChatSessionInstance.sendMessage.mockClear(); // Clear sendMessage on the consistent instance
    });

    it('should throw error if not configured', async () => {
      const unconfiguredProvider = new GoogleProvider(mockConfigManager, mockGoogleGenAIConstructor as any);
      const request: ChatRequest = { messages: [{ role: 'user', content: 'Hello' }] };
      await expect(unconfiguredProvider.chat(request)).rejects.toThrow('GoogleProvider not configured. Call configure() first.');
    });

    it('should handle single message with generateContent', async () => {
      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
      };
      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.content).toBe('This is a mock response from Gemini AI');
      expect(mockModelsAPIInstance.get).toHaveBeenCalledWith(baseConfig.model);
      expect(mockGenerativeModelInstance.generateContent).toHaveBeenCalled();
      expect(mockGenerativeModelInstance.startChat).not.toHaveBeenCalled();
    });

    it('should handle multiple messages with startChat', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      };
      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.content).toBe('This is a mock response from Gemini AI');
      expect(mockModelsAPIInstance.get).toHaveBeenCalledWith(baseConfig.model);
      expect(mockGenerativeModelInstance.startChat).toHaveBeenCalled();
      expect(mockGenerativeModelInstance.generateContent).not.toHaveBeenCalled();
      // Check sendMessage was called on the object returned by startChat
      const chatSessionResult = mockGenerativeModelInstance.startChat.mock.results[0];
      if (chatSessionResult && chatSessionResult.type === 'return') {
        const chatSession = chatSessionResult.value;
        expect(chatSession.sendMessage).toHaveBeenCalled();
      } else {
        throw new Error('startChat mock did not return a value');
      }
    });

    it('should handle empty message array', async () => {
      const request: ChatRequest = { messages: [] };
      const response = await provider.chat(request);
      expect(response.success).toBe(false);
      expect(response.error).toEqual({ 
        message: 'No messages provided for chat completion',
        code: 'no_messages_provided'
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No messages provided for chat completion'));
    });

    it('should convert system message to user message in generateContent', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, world!' },
        ],
      };
      await provider.chat(request);

      expect(mockModelsAPIInstance.get).toHaveBeenCalledWith(baseConfig.model);
      expect(mockGenerativeModelInstance.generateContent).toHaveBeenCalled();

      // Verify the arguments passed to generateContent
      if (mockGenerativeModelInstance.generateContent.mock.calls.length === 0) {
        throw new Error('generateContent was not called in the system message test.');
      }

      const firstCallArgs = mockGenerativeModelInstance.generateContent.mock.calls[0];
      const generateContentArgs = firstCallArgs[0] as any;
      if (generateContentArgs === undefined) {
        throw new Error('generateContent was called with arguments, but the first argument was literally undefined.');
      }

      console.log('[Test Debug] generateContentArgs in system message test:', JSON.stringify(generateContentArgs, undefined, 2));
      
      expect(generateContentArgs.contents).toBeDefined();
      expect(generateContentArgs.contents).toEqual([
        { role: 'user', parts: [{ text: 'You are a helpful assistant.' }] }, 
        { role: 'user', parts: [{ text: 'Hello, world!' }] },
      ]);
    });
  });

  describe('generateCompletion()', () => {
    it('should be an alias for chat()', async () => {
      // Configure the provider first
      await provider.configure(baseConfig);
      // Spy on the chat method
      const chatSpy = jest.spyOn(provider, 'chat');
      const request: ChatRequest = { messages: [{ role: 'user', content: 'Ping' }] };
      await provider.generateCompletion(request);
      expect(chatSpy).toHaveBeenCalledWith(request);
      chatSpy.mockRestore();
    });
  });

});
