import { runOpenAIProviderTests } from './openaiProvider.sharedTestUtils';
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider';
import { jest } from '@jest/globals';
import { ConfigManager } from '@/core/config/configManager';

describe('OpenAIProvider Chat', () => {
  const configManager = new ConfigManager();
  jest.spyOn(configManager, 'getResolvedApiKey').mockImplementation(async () => { return void 0; });
  const mockOpenAIConstructorSpy = jest.fn();
  const infoMock = jest.fn();
  const errorMock = jest.fn();

  runOpenAIProviderTests({
    providerClass: OpenAIProvider,
    providerName: 'openai',
    configManager,
    testsToRun: ['chat'],
  });

});
