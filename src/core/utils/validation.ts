/**
 * @fileoverview Validation utility functions for AgenticMCP CLI.
 */

import { ProviderType } from '../types/index';

/**
 * Checks if the given provider type is a valid, known provider.
 * @param providerType - The provider type string to validate.
 * @returns True if the provider type is valid, false otherwise.
 */
export function isValidProviderType(providerType: string): providerType is ProviderType {
  const validProviders: ProviderType[] = ['openai', 'anthropic', 'google']; // Add more as they are supported
  return validProviders.includes(providerType as ProviderType);
}
