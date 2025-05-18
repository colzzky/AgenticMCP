/**
 * @file Configuration for role-to-model mappings
 * Defines the configuration types and default mappings for LLM roles to models
 */
import { roleEnums } from '../roleSchemas.js';

/**
 * Configuration for a specific role-to-model mapping
 */
export interface RoleModelMapping {
  /** The provider to use for this role (e.g., 'anthropic', 'openai', 'google') */
  provider: string;
  
  /** The specific model to use for this role */
  model: string;
  
  /** Optional parameters specific to this role-model combination */
  parameters?: {
    /** Temperature setting for this role (0.0 to 1.0) */
    temperature?: number;
    
    /** Maximum tokens to generate */
    maxTokens?: number;
    
    /** Any other model-specific parameters */
    [key: string]: any;
  };
}

/**
 * Configuration mapping each role to a specific provider and model
 */
export interface RoleModelConfig {
  /** Default provider and model to use if a specific role is not configured */
  default: RoleModelMapping;
  
  /** Map of role names to their specific provider and model configurations */
  roleMap: {
    [role: string]: RoleModelMapping;
  };
}

/**
 * Default configuration for role-to-model mappings
 * This can be overridden by user configuration
 */
export const defaultRoleModelConfig: RoleModelConfig = {
  default: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    parameters: {
      temperature: 0.2,
      maxTokens: 4000
    }
  },
  roleMap: {
    // Coder role - uses a model good at code generation
    [roleEnums.CODER]: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      parameters: {
        temperature: 0.1,
        maxTokens: 4000
      }
    },
    // Rewriter role - uses a model good at creative writing with higher temperature
    [roleEnums.REWRITER]: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      parameters: {
        temperature: 0.7,
        maxTokens: 8000
      }
    },
    // UI/UX role - uses a model good at design thinking
    [roleEnums.UI_UX]: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      parameters: {
        temperature: 0.4,
        maxTokens: 4000
      }
    },
    // Analyst role - uses a model good at documentation and analysis
    [roleEnums.ANALYST]: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      parameters: {
        temperature: 0.3,
        maxTokens: 6000
      }
    }
    // Add more role-specific configurations as needed
  }
};

/**
 * Utility to get the model configuration for a specific role
 * Falls back to default if role is not configured
 * 
 * @param role The role to get the model configuration for
 * @param config Optional custom configuration
 * @returns The model configuration for the role
 */
export function getModelConfigForRole(
  role: string,
  config: RoleModelConfig = defaultRoleModelConfig
): RoleModelMapping {
  // Return the role-specific config if it exists, otherwise return the default
  return config.roleMap[role] || config.default;
}