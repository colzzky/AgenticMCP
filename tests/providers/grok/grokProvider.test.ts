/**
 * @file Tests for Grok provider (using OpenAI's test utilities)
 */

import { jest } from '@jest/globals';
import { setupNodeOsMock, setupLoggerMock } from '../../utils/node-module-mock';

// Declare module variables
let GrokProvider: typeof import('../../../src/providers/grok/grokProvider').GrokProvider;
let ConfigManager: typeof import('../../../src/core/config/configManager').ConfigManager;
let runOpenAIProviderTests: typeof import('../openai/openaiProviderTestUtils').runOpenAIProviderTests;

// Setup mocks
const mockLogger = setupLoggerMock();
const mockOs = setupNodeOsMock();

// Setup module imports and mocks
beforeAll(async () => {
  // Register mocks
  jest.unstable_mockModule('node:os', () => mockOs);
  jest.unstable_mockModule('../../../src/core/utils/logger', () => mockLogger);

  // Import modules after mocking
  const grokProviderModule = await import('../../../src/providers/grok/grokProvider');
  GrokProvider = grokProviderModule.GrokProvider;

  const configManagerModule = await import('../../../src/core/config/configManager');
  ConfigManager = configManagerModule.ConfigManager;

  const testUtilsModule = await import('../openai/openaiProviderTestUtils');
  runOpenAIProviderTests = testUtilsModule.runOpenAIProviderTests;
});

describe('GrokProvider (inherits OpenAIProvider)', () => {
  it('can be imported', () => {
    expect(GrokProvider).toBeDefined();
  });

  // Run the OpenAI provider tests once the modules are imported
  it('passes OpenAI provider tests', () => {
    if (runOpenAIProviderTests) {
      runOpenAIProviderTests({
        providerClass: GrokProvider,
        providerName: 'grok',
        configManager: new ConfigManager(),
        isGrok: true,
        customConfig: { baseURL: 'https://api.x.ai/v1' },
      });
    }
  });
});
