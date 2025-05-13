/**
 * @file Tests for validation utilities
 */

import { jest } from '@jest/globals';
import { isValidProviderType } from '../../../src/core/utils/validation';

describe('Validation Utilities', () => {
  describe('isValidProviderType', () => {
    it('should return true for known provider types', () => {
      // Test with known provider types
      expect(isValidProviderType('openai')).toBe(true);
      expect(isValidProviderType('anthropic')).toBe(true);
      expect(isValidProviderType('google')).toBe(true);
    });

    it('should return false for unknown provider types', () => {
      // Test with unknown provider types
      expect(isValidProviderType('unknown')).toBe(false);
      expect(isValidProviderType('')).toBe(false);
      expect(isValidProviderType('OPENAI')).toBe(false); // Case sensitive
    });

    it('should act as a type guard', () => {
      // This test is mainly for TypeScript type checking
      // It's not a runtime test, but demonstrates the function's purpose
      const providerType = 'openai';
      
      if (isValidProviderType(providerType)) {
        // Inside this if block, TypeScript knows providerType is a valid ProviderType
        const validProvider: 'openai' | 'anthropic' | 'google' = providerType;
        expect(validProvider).toBe('openai');
      }
    });
  });
});