import { runOpenAIProviderTests } from './openaiProvider.sharedTestUtils';
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider';
import { jest } from '@jest/globals';
import { ConfigManager } from '@/core/config/configManager';
import { runOpenAICompletionTests } from './openaiProvider.completionTestUtils';

describe('OpenAIProvider Completion', () => {
  const configManager = new ConfigManager();
  jest.spyOn(configManager, 'getResolvedApiKey').mockImplementation(async () => { return void 0; });
  const mockOpenAIConstructorSpy = jest.fn();
  const infoMock = jest.fn();
  const errorMock = jest.fn();

  runOpenAICompletionTests({
    providerClass: OpenAIProvider,
    providerName: 'openai',
    configManager,
    mockOpenAIConstructorSpy,
    infoMock,
    errorMock,
  });
  runOpenAIProviderTests({
    providerClass: OpenAIProvider,
    providerName: 'openai',
    configManager,
    testsToRun: ['completion'],
  });
});
