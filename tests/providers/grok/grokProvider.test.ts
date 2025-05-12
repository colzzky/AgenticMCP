// Reuse all OpenAIProvider tests for GrokProvider
import { runOpenAIProviderTests } from '../openai/openaiProvider.sharedTestUtils';
import { GrokProvider } from '../../../src/providers/grok/grokProvider';
import { ConfigManager } from '../../../src/core/config/configManager';

describe('GrokProvider (inherits OpenAIProvider)', () => {
  runOpenAIProviderTests({
    providerClass: GrokProvider,
    providerName: 'grok',
    configManager: new ConfigManager(),
    isGrok: true,
    customConfig: { baseURL: 'https://api.x.ai/v1' },
  });
});
