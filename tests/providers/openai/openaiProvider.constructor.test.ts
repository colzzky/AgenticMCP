import { runOpenAIProviderTests } from './openaiProvider.sharedTestUtils';
import { OpenAIProvider } from '../../../src/providers/openai/openaiProvider';
import { ConfigManager } from '@/core/config/configManager';

describe('OpenAIProvider - Constructor & Configuration', () => {
  runOpenAIProviderTests({
    providerClass: OpenAIProvider,
    providerName: 'openai',
    configManager: new ConfigManager(),
    testsToRun: ['constructor'],
  });
});
