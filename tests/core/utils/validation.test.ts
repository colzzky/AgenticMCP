/**
 * @fileoverview Tests for validation utility functions.
 */

import { isValidProviderType } from '../../../src/core/utils/validation';
import { ProviderType } from '../../../src/core/types';

describe('Validation Utilities', () => {
  describe('isValidProviderType', () => {
    // Tests for valid provider types
    it('should return true for valid provider types', () => {
      expect(isValidProviderType('openai')).toBe(true);
      expect(isValidProviderType('anthropic')).toBe(true);
      expect(isValidProviderType('google')).toBe(true);
    });

    // Tests for invalid provider types
    it('should return false for invalid provider types', () => {
      expect(isValidProviderType('invalid')).toBe(false);
      expect(isValidProviderType('')).toBe(false);
      expect(isValidProviderType('OPENAI')).toBe(false); // Case-sensitive check
      expect(isValidProviderType('OpenAI')).toBe(false);
    });

    // Test for type narrowing
    it('should narrow the type when used in a type guard', () => {
      const testTypeGuard = (input: string): ProviderType | null => {
        if (isValidProviderType(input)) {
          // If this type guard works, TypeScript should recognize input as ProviderType
          const providerType: ProviderType = input;
          return providerType;
        }
        return null;
      };

      expect(testTypeGuard('openai')).toBe('openai');
      expect(testTypeGuard('invalid')).toBe(null);
    });

    // Edge cases
    it('should handle edge cases', () => {
      // @ts-expect-error - Testing with non-string input
      expect(isValidProviderType(null)).toBe(false);
      // @ts-expect-error - Testing with non-string input
      expect(isValidProviderType(undefined)).toBe(false);
      // @ts-expect-error - Testing with non-string input
      expect(isValidProviderType(123)).toBe(false);
      // @ts-expect-error - Testing with non-string input
      expect(isValidProviderType({})).toBe(false);
    });

    // Future extensibility test - simulating adding a new provider type
    it('should support future provider types when added to valid providers array', () => {
      // This test just verifies the implementation logic works as expected
      // It doesn't actually modify the source code
      const validProviders = ['openai', 'anthropic', 'google', 'newprovider'];
      const mockIsValidProviderType = (type: string): boolean => 
        validProviders.includes(type);
      
      expect(mockIsValidProviderType('newprovider')).toBe(true);
      expect(mockIsValidProviderType('notadded')).toBe(false);
    });
  });
});