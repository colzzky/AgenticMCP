/**
 * Unit tests for CredentialManager
 * Tests the secure credential management functionality
 */
import { describe, it, expect, jest } from '@jest/globals';
import { CredentialManager } from '../../../src/core/credentials/credentialManager.js';

describe('CredentialManager', () => {
  describe('Static Methods', () => {
    it('should format service names correctly via getFullServiceName', () => {
      // Access private static method via any type and reflection
      const getFullServiceName = (CredentialManager as any).getFullServiceName;
      
      // Test with a lowercase provider type
      expect(getFullServiceName('openai')).toBe('AgenticMCP-openai');
      
      // Test with an uppercase provider type
      expect(getFullServiceName('OPENAI')).toBe('AgenticMCP-openai');
      
      // Test with a mixed case provider type
      expect(getFullServiceName('OpenAI')).toBe('AgenticMCP-openai');
    });
  });
});