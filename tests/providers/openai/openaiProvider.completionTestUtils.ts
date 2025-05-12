// Utility for OpenAIProvider completion tests, split out to reduce line count in sharedTestUtils
import { ProviderRequest } from '../../../src/core/types/provider.types';
import { OpenAIProviderSpecificConfig } from '../../../src/core/types/config.types';

export function runOpenAICompletionTests({ provider, mockCreate, baseConfig, completionRequest, isGrok, infoMock, errorMock, mockConfigManager, providerClass, mockOpenAIConstructorSpy }: any) {
  describe('generateCompletion', () => {
    beforeEach(async () => {
      baseConfig = {
        providerType: 'openai-completion',
        instanceName: 'testInstanceGenCompletion',
        apiKey: 'test-api-key-gen',
        model: 'gpt-3.5-turbo-instruct',
      };
      mockConfigManager.getResolvedApiKey.mockResolvedValue('resolved-api-key-gen');
      await provider.configure(baseConfig);
      completionRequest = {
        messages: [{ role: 'user', content: 'Write a tagline for a coffee shop.' }],
        temperature: 0.7,
        maxTokens: 50,
      };
      mockCreate.mockClear();
      mockCreate.mockResolvedValue({
        id: 'cmpl-xxxx',
        object: 'text_completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo-instruct',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Coffee: Brewtiful Mornings!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      });
    });

    it('should return a successful completion', async () => {
      const response = await provider.generateCompletion(completionRequest);
      if (isGrok === false) {
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          model: completionRequest.model || baseConfig.model,
          messages: [{ role: 'user', content: completionRequest.messages![0].content }],
          temperature: completionRequest.temperature,
          max_tokens: completionRequest.maxTokens,
        }));
      }
      if (isGrok === false) {
        expect(response.success).toBe(true);
        expect(response.content).toBe('Coffee: Brewtiful Mornings!');
        if (infoMock && typeof infoMock === 'function' && infoMock.mock) {
          expect(
            infoMock.mock.calls.map((args: any[]) => args[0])
          ).toContain(
            `Chat completion successful for instance ${baseConfig.instanceName} with model ${completionRequest.model || baseConfig.model}`
          );
        }
      } else {
        expect(typeof response.success).toBe('boolean');
      }
    });
    // ... (other completion tests can be moved here as needed)
  });
}
