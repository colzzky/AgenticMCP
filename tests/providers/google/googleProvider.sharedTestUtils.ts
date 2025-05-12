/**
 * @file Shared test utilities for Google/Gemini Provider tests
 */

import { jest } from '@jest/globals';
import type { Tool } from '@/core/types/provider.types';
import type { GoogleProviderSpecificConfig } from '@/core/types/config.types';

/**
 * Create a standard response object that matches what the Google provider expects
 */
export const createStandardResponse = (textContent?: string, functionCall?: Record<string, any>) => {
  const parts: Array<Record<string, any>> = [];

  if (textContent) {
    parts.push({ text: textContent });
  }

  if (functionCall) {
    parts.push({
      functionCall: {
        name: functionCall.name,
        args: functionCall.args
      }
    });
  }

  return {
    response: {
      candidates: [{
        content: {
          parts
        }
      }]
    }
  };
};

/**
 * Create a response with multiple function calls
 */
export const createMultipleFunctionCallsResponse = () => {
  return {
    response: {
      candidates: [{
        content: {
          parts: [
            { text: 'I will get both the weather and calculate a distance for you.' },
            {
              functionCall: {
                name: 'get_weather',
                args: { location: 'San Francisco, CA' }
              }
            },
            {
              functionCall: {
                name: 'calculate_distance',
                args: { origin: 'San Francisco, CA', destination: 'Los Angeles, CA' }
              }
            }
          ]
        }
      }]
    }
  };
};

/**
 * Sample tools for testing with the Google provider
 */
export const sampleTools: Tool[] = [
  {
    type: 'function',
    name: 'get_weather',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state, e.g., San Francisco, CA'
        }
      },
      required: ['location']
    }
  },
  {
    type: 'function',
    name: 'calculate_distance',
    description: 'Calculate distance between two locations',
    parameters: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'Starting location'
        },
        destination: {
          type: 'string',
          description: 'Ending location'
        }
      },
      required: ['origin', 'destination']
    }
  }
];

/**
 * Standard test configuration for Google provider
 */
export const testConfig: GoogleProviderSpecificConfig = {
  providerType: 'google',
  instanceName: 'test-instance',
  apiKey: 'test-api-key',
  model: 'gemini-1.5-flash'
};

/**
 * Creates mock setup for Google provider tests
 */
export const createGoogleMocks = () => {
  const mockGenerateContent = jest.fn();
  const mockModelsGet = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent
  });
  
  const mockGoogleGenAI = jest.fn().mockImplementation(() => ({
    models: {
      get: mockModelsGet
    }
  }));
  
  const mockConfigManager = {
    getResolvedApiKey: jest.fn().mockImplementation(async () => 'test-api-key')
  };

  return {
    mockGenerateContent,
    mockModelsGet,
    mockGoogleGenAI,
    mockConfigManager
  };
};