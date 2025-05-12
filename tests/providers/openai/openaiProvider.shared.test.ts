/**
 * @file Tests for OpenAI provider using shared test utilities
 */

import { jest, describe } from '@jest/globals';
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider';
import { runOpenAIProviderTests } from './openaiProviderTestUtils';
import { ConfigManager } from '../../../src/core/config/configManager';

describe('OpenAIProvider with shared test utils', () => {
  // Mock ConfigManager for the tests
  const mockConfigManagerFxn: any = jest.fn()
  const mockConfigManager = {
    getResolvedApiKey: mockConfigManagerFxn.mockResolvedValue('test-api-key')
  } as ConfigManager;
  
  // Run the shared tests with our mocked dependencies
  runOpenAIProviderTests({
    providerClass: OpenAIProvider,
    providerName: 'openai-chat',
    configManager: mockConfigManager,
    customConfig: {
      // Can provide custom configuration here if needed
    }
  });
});