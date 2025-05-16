/**
 * Unit tests for roleModelConfig module
 * Tests the role-to-model mapping configuration functionality
 */
import { describe, it, expect } from '@jest/globals';
import { 
  getModelConfigForRole, 
  defaultRoleModelConfig,
  type RoleModelConfig 
} from '../../../../src/mcp/tools/config/roleModelConfig.js';
import { roleEnums } from '../../../../src/mcp/tools/roleSchemas.js';

describe('roleModelConfig', () => {
  describe('getModelConfigForRole', () => {
    it('should return the correct model configuration for a known role', () => {
      // Get model config for a role that exists in the default config
      const modelConfig = getModelConfigForRole(roleEnums.CODER);
      
      // Should match the configuration for CODER role in the default config
      expect(modelConfig).toEqual(defaultRoleModelConfig.roleMap[roleEnums.CODER]);
      expect(modelConfig.model).toBe('claude-3-opus-20240229');
      expect(modelConfig.provider).toBe('anthropic');
    });
    
    it('should return the default model configuration for an unknown role', () => {
      // Get model config for a role that doesn't exist in the default config
      const modelConfig = getModelConfigForRole('unknown_role');
      
      // Should match the default configuration
      expect(modelConfig).toEqual(defaultRoleModelConfig.default);
      expect(modelConfig.model).toBe('claude-3-sonnet-20240229');
      expect(modelConfig.provider).toBe('anthropic');
    });
    
    it('should allow overriding the default configuration', () => {
      // Create a custom configuration
      const customConfig: RoleModelConfig = {
        default: {
          provider: 'openai',
          model: 'gpt-4',
          parameters: {
            temperature: 0.5,
            maxTokens: 2000
          }
        },
        roleMap: {
          [roleEnums.CODER]: {
            provider: 'openai',
            model: 'gpt-4-1106-preview',
            parameters: {
              temperature: 0.2,
              maxTokens: 4000
            }
          }
        }
      };
      
      // Get model config using the custom configuration
      const modelConfig = getModelConfigForRole(roleEnums.CODER, customConfig);
      
      // Should match the custom configuration for CODER role
      expect(modelConfig).toEqual(customConfig.roleMap[roleEnums.CODER]);
      expect(modelConfig.model).toBe('gpt-4-1106-preview');
      expect(modelConfig.provider).toBe('openai');
    });
    
    it('should use the custom default for unknown roles', () => {
      // Create a custom configuration with only a default
      const customConfig: RoleModelConfig = {
        default: {
          provider: 'google',
          model: 'gemini-2.0-pro',
          parameters: {
            temperature: 0.5,
            maxTokens: 2000
          }
        },
        roleMap: {}
      };
      
      // Get model config for a role that doesn't exist in the custom config
      const modelConfig = getModelConfigForRole('unknown_role', customConfig);
      
      // Should match the custom default configuration
      expect(modelConfig).toEqual(customConfig.default);
      expect(modelConfig.model).toBe('gemini-2.0-pro');
      expect(modelConfig.provider).toBe('google');
    });
  });
});