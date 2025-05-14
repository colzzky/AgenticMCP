/**
 * Unit tests for GoogleProvider parallel tool calling functionality
 * Tests the parallel tool calling capabilities of the Google provider implementation
 * focusing on how Google Gemini can output multiple function calls at once
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GoogleProvider } from '../../../src/providers/google/googleProvider.js';
import type { ConfigManager } from '../../../src/core/config/configManager.js';
import type { Logger } from '../../../src/core/types/logger.types.js';
import type { 
  ProviderRequest,
  ProviderResponse,
  Tool,
  ToolResultsRequest
} from '../../../src/core/types/provider.types.js';
import type { GoogleProviderSpecificConfig } from '../../../src/core/types/config.types.js';

// Mock Google GenAI SDK
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

describe('GoogleProvider - Parallel Tool Calling', () => {
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
    model: 'gemini-2.0-flash-001', // Using capable model for parallel tool calling
    temperature: 0.7
  };

  // Sample tools for testing - following Google's docs format exactly
  const getWeatherTool: Tool = {
    type: 'function',
    name: 'get_weather',
    description: 'Get the current weather in a given location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state, e.g. San Francisco, CA'
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'The unit of temperature, either "celsius" or "fahrenheit"'
        }
      },
      required: ['location']
    }
  };

  const getTimeTool: Tool = {
    type: 'function',
    name: 'get_time',
    description: 'Get the current time in a given time zone',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'The IANA time zone name, e.g. America/Los_Angeles'
        }
      },
      required: ['timezone']
    }
  };

  const searchNewsTool: Tool = {
    type: 'function',
    name: 'search_knowledge_base',
    description: 'Query a knowledge base to retrieve relevant info on a topic.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The user question or search query.'
        },
        options: {
          type: 'object',
          properties: {
            num_results: {
              type: 'number',
              description: 'Number of top results to return.'
            },
            domain_filter: {
              type: ['string', 'null'],
              description: 'Optional domain to narrow the search (e.g. \'finance\', \'medical\'). Pass null if not needed.'
            },
            sort_by: {
              type: ['string', 'null'],
              enum: ['relevance', 'date', 'popularity', 'alphabetical'],
              description: 'How to sort results. Pass null if not needed.'
            }
          },
          required: ['num_results', 'domain_filter', 'sort_by']
        }
      },
      required: ['query', 'options']
    }
  };

  const sampleTools = [getWeatherTool, getTimeTool, searchNewsTool];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigManager.getResolvedApiKey = jest.fn().mockResolvedValue('mock-api-key');
    provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
    await provider.configure(mockConfig);
  });

  describe('Parallel Tool Calls', () => {
    it('should extract multiple tool calls when returned in parallel (parts format)', async () => {
      // Setup mock response with multiple parallel function calls in parts
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'I\'ll gather both the weather and time information for New York.'
              },
              {
                functionCall: {
                  name: 'get_weather',
                  args: {
                    location: 'New York, NY',
                    unit: 'celsius'
                  }
                }
              },
              {
                functionCall: {
                  name: 'get_time',
                  args: {
                    timezone: 'America/New_York'
                  }
                }
              }
            ]
          }
        }],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 70,
          totalTokenCount: 170
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
        messages: [{ role: 'user', content: 'What\'s the weather and time in New York?' }],
        tools: sampleTools
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(2);
      
      // Verify first tool call
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![0].arguments).toBe('{"location":"New York, NY","unit":"celsius"}');
      
      // Verify second tool call
      expect(response.toolCalls![1].name).toBe('get_time');
      expect(response.toolCalls![1].arguments).toBe('{"timezone":"America/New_York"}');
    });
    
    it('should extract multiple tool calls when returned in parallel (functionCalls format)', async () => {
      // Setup mock response with multiple parallel function calls in functionCalls array
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'I\'ll gather both the weather and time information for New York.'
              }
            ]
          }
        }],
        functionCalls: [
          {
            name: 'get_weather',
            args: {
              location: 'New York, NY',
              unit: 'celsius'
            }
          },
          {
            name: 'get_time',
            args: {
              timezone: 'America/New_York'
            }
          }
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 70,
          totalTokenCount: 170
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
        messages: [{ role: 'user', content: 'What\'s the weather and time in New York?' }],
        tools: sampleTools
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(2);
      
      // Verify first tool call
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![0].arguments).toBe('{"location":"New York, NY","unit":"celsius"}');
      
      // Verify second tool call
      expect(response.toolCalls![1].name).toBe('get_time');
      expect(response.toolCalls![1].arguments).toBe('{"timezone":"America/New_York"}');
    });

    it('should handle providing multiple tool results back to the model', async () => {
      // First call returns multiple function calls
      const mockGenerateContentFirst = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'I\'ll check both the weather and time in New York.'
              },
              {
                functionCall: {
                  name: 'get_weather',
                  args: {
                    location: 'New York, NY'
                  }
                }
              },
              {
                functionCall: {
                  name: 'get_time',
                  args: {
                    timezone: 'America/New_York'
                  }
                }
              }
            ]
          }
        }]
      });
      
      // Second call with tool results returns final response
      const mockGenerateContentSecond = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'In New York, it\'s currently 68°F and sunny. The local time is 2:30 PM Eastern Time.'
              }
            ]
          }
        }]
      });
      
      // Setup mock model - first call
      const mockGetFirst = jest.fn().mockReturnValue({
        generateContent: mockGenerateContentFirst
      });
      
      // Reconfigure the provider with our first mock
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGetFirst
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      // Initial request
      const initialRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather and time in New York?' }],
        tools: sampleTools
      };

      // Get the tool use response
      const initialResponse = await provider.chat(initialRequest);
      expect(initialResponse.success).toBe(true);
      expect(initialResponse.toolCalls).toHaveLength(2);

      // Now setup the second mock for the tool results submission
      const mockGetSecond = jest.fn().mockReturnValue({
        generateContent: mockGenerateContentSecond
      });
      
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGetSecond
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      // Create tool outputs for both tool calls
      const toolResultsRequest: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather and time in New York?' },
          {
            role: 'assistant',
            content: 'I\'ll check both the weather and time in New York.',
            tool_calls: initialResponse.toolCalls
          }
        ],
        tools: sampleTools,
        tool_outputs: [
          {
            call_id: initialResponse.toolCalls![0].call_id,
            type: 'function_call_output',
            output: '68°F and sunny'
          },
          {
            call_id: initialResponse.toolCalls![1].call_id,
            type: 'function_call_output',
            output: '2:30 PM Eastern Time'
          }
        ]
      };

      // Submit tool results
      const finalResponse = await provider.generateTextWithToolResults(toolResultsRequest);

      // Verify the request format for the second call
      const secondRequestArgs = mockGenerateContentSecond.mock.calls[0][0];
      
      // Should have 4 messages: user question, assistant with function calls, and two tool result messages
      expect(secondRequestArgs.contents).toHaveLength(4);
      
      // First message is user's initial question
      expect(secondRequestArgs.contents[0].role).toBe('user');
      expect(secondRequestArgs.contents[0].parts[0].text).toBe('What\'s the weather and time in New York?');
      
      // Second message is assistant with function calls
      expect(secondRequestArgs.contents[1].role).toBe('model');
      
      // Third message is first tool result
      expect(secondRequestArgs.contents[2].role).toBe('user');
      expect(secondRequestArgs.contents[2].parts[0].text).toBe('68°F and sunny');
      
      // Fourth message is second tool result
      expect(secondRequestArgs.contents[3].role).toBe('user');
      expect(secondRequestArgs.contents[3].parts[0].text).toBe('2:30 PM Eastern Time');
      
      // Verify final response
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toContain('68°F and sunny');
      expect(finalResponse.content).toContain('2:30 PM Eastern Time');
    });
  });

  describe('Complex Parallel Tool Scenarios', () => {
    it('should handle three or more parallel tool calls', async () => {
      // Setup mock response with three parallel function calls
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'I\'ll gather weather, time, and news information for New York.'
              }
            ]
          }
        }],
        functionCalls: [
          {
            name: 'get_weather',
            args: {
              location: 'New York, NY'
            }
          },
          {
            name: 'get_time',
            args: {
              timezone: 'America/New_York'
            }
          },
          {
            name: 'search_knowledge_base',
            args: {
              query: 'New York events today',
              options: {
                num_results: 3,
                domain_filter: null,
                sort_by: 'relevance'
              }
            }
          }
        ]
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
        messages: [{ role: 'user', content: 'What\'s the weather, time, and latest news in New York?' }],
        tools: sampleTools
      };

      const response = await provider.chat(request);

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(3);
      
      // Verify tool calls in order
      expect(response.toolCalls![0].name).toBe('get_weather');
      expect(response.toolCalls![1].name).toBe('get_time');
      expect(response.toolCalls![2].name).toBe('search_knowledge_base');
      
      // Verify news tool call has correct arguments
      const newsArgs = JSON.parse(response.toolCalls![2].arguments);
      expect(newsArgs.query).toBe('New York events today');
      expect(newsArgs.options.num_results).toBe(3);
    });

    it('should handle partial tool results submission', async () => {
      // First call returns multiple function calls
      const mockGenerateContentFirst = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'I\'ll check the weather and time in New York.'
              }
            ]
          }
        }],
        functionCalls: [
          {
            name: 'get_weather',
            args: {
              location: 'New York, NY'
            }
          },
          {
            name: 'get_time',
            args: {
              timezone: 'America/New_York'
            }
          }
        ]
      });
      
      // Second call with partial tool results returns additional function call
      const mockGenerateContentSecond = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'Now I need to search for news in New York.'
              }
            ]
          }
        }],
        functionCalls: [
          {
            name: 'search_knowledge_base',
            args: {
              query: 'New York news today',
              options: {
                num_results: 1,
                domain_filter: null,
                sort_by: 'relevance'
              }
            }
          }
        ]
      });
      
      // Final call with news results returns complete response
      const mockGenerateContentThird = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'In New York, it\'s currently 68°F and sunny. The local time is 2:30 PM Eastern Time. The latest news headline is "Mayor Announces New City Initiative".'
              }
            ]
          }
        }]
      });
      
      // Setup mock model - first call
      const mockGetFirst = jest.fn().mockReturnValue({
        generateContent: mockGenerateContentFirst
      });
      
      // Reconfigure the provider with our first mock
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGetFirst
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      // Initial request
      const initialRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'What\'s the weather, time, and latest news in New York?' }],
        tools: sampleTools
      };

      // Get the tool use response with weather and time tools
      const initialResponse = await provider.chat(initialRequest);
      expect(initialResponse.toolCalls).toHaveLength(2);

      // Now setup the second mock for the weather and time tool results
      const mockGetSecond = jest.fn().mockReturnValue({
        generateContent: mockGenerateContentSecond
      });
      
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGetSecond
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      // Create tool outputs for both initial tool calls
      const toolResultsRequest: ToolResultsRequest = {
        messages: [
          { role: 'user', content: 'What\'s the weather, time, and latest news in New York?' },
          {
            role: 'assistant',
            content: 'I\'ll check the weather and time in New York.',
            tool_calls: initialResponse.toolCalls
          }
        ],
        tools: sampleTools,
        tool_outputs: [
          {
            call_id: initialResponse.toolCalls![0].call_id,
            type: 'function_call_output',
            output: '68°F and sunny'
          },
          {
            call_id: initialResponse.toolCalls![1].call_id,
            type: 'function_call_output',
            output: '2:30 PM Eastern Time'
          }
        ]
      };

      // Submit weather and time results, get news tool call
      const newsToolResponse = await provider.generateTextWithToolResults(toolResultsRequest);
      expect(newsToolResponse.toolCalls).toHaveLength(1);
      expect(newsToolResponse.toolCalls![0].name).toBe('search_knowledge_base');

      // Now setup the third mock for the news tool result
      const mockGetThird = jest.fn().mockReturnValue({
        generateContent: mockGenerateContentThird
      });
      
      mockGoogleGenAI.GoogleGenAI.mockImplementation(() => ({
        models: {
          get: mockGetThird
        }
      }));
      
      provider = new GoogleProvider(mockConfigManager, mockLogger, mockGoogleGenAI.GoogleGenAI);
      await provider.configure(mockConfig);

      // Create updated messages with all previous messages plus the news tool request
      const fullMessages = [
        ...toolResultsRequest.messages,
        {
          role: 'tool',
          content: '68°F and sunny',
          tool_call_id: initialResponse.toolCalls![0].call_id
        },
        {
          role: 'tool',
          content: '2:30 PM Eastern Time',
          tool_call_id: initialResponse.toolCalls![1].call_id
        },
        {
          role: 'assistant',
          content: 'Now I need to search for news in New York.',
          tool_calls: newsToolResponse.toolCalls
        }
      ];

      // Final request with news tool result
      const finalResultsRequest: ToolResultsRequest = {
        messages: fullMessages,
        tools: sampleTools,
        tool_outputs: [
          {
            call_id: newsToolResponse.toolCalls![0].call_id,
            type: 'function_call_output',
            output: 'Mayor Announces New City Initiative'
          }
        ]
      };

      // Submit news result and get final response
      const finalResponse = await provider.generateTextWithToolResults(finalResultsRequest);

      // Verify the final response includes all tool results
      expect(finalResponse.success).toBe(true);
      expect(finalResponse.content).toContain('68°F and sunny');
      expect(finalResponse.content).toContain('2:30 PM Eastern Time');
      expect(finalResponse.content).toContain('Mayor Announces New City Initiative');
    });
  });

  describe('Tool Choice with Parallel Tools', () => {
    it('should respect the required tool_choice for parallel execution', async () => {
      // Setup mock response with multiple function calls
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'I\'ll get the information you asked for.'
              }
            ]
          }
        }],
        functionCalls: [
          {
            name: 'get_weather',
            args: {
              location: 'New York, NY'
            }
          },
          {
            name: 'get_time',
            args: {
              timezone: 'America/New_York'
            }
          }
        ]
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

      // Request with required tool_choice
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Tell me about New York.' }],
        tools: sampleTools,
        toolChoice: 'required'
      };

      await provider.chat(request);

      // Verify that tool_choice was set to 'ANY' in the request (Gemini's version of 'required')
      const generateContentArgs = mockGenerateContent.mock.calls[0][0];
      expect(generateContentArgs.toolConfig?.functionCallingConfig.mode).toBe('ANY');
    });

    it('should handle specific tool choice while allowing parallel execution', async () => {
      // Setup mock response with the specific requested function
      const mockGenerateContent = jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [
              {
                text: 'Let me get the weather for you.'
              }
            ]
          }
        }],
        functionCalls: [
          {
            name: 'get_weather',
            args: {
              location: 'New York, NY'
            }
          }
        ]
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

      // Request with specific tool_choice
      const request: ProviderRequest = {
        messages: [{ role: 'user', content: 'Tell me about New York.' }],
        tools: sampleTools,
        toolChoice: { type: 'function', name: 'get_weather' }
      };

      await provider.chat(request);

      // Verify that tool_choice was set to 'ANY' with the specific allowed function
      const generateContentArgs = mockGenerateContent.mock.calls[0][0];
      expect(generateContentArgs.toolConfig?.functionCallingConfig.mode).toBe('ANY');
      expect(generateContentArgs.toolConfig?.functionCallingConfig.allowedFunctionNames).toEqual(['get_weather']);
    });
  });
});