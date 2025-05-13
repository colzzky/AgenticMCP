/**
 * @file Tests for CredentialManager
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { mockConsole } from '../../utils/test-setup';
import { CredentialIdentifier } from '../../../src/core/types/credentials.types';

// Test constants
const SERVICE_NAME_PREFIX = 'AgenticMCP';
const TEST_PROVIDER = 'openai';
const TEST_ACCOUNT = 'test-account';
const TEST_SECRET = 'test-api-key-12345';
const FULL_SERVICE_NAME = `${SERVICE_NAME_PREFIX}-${TEST_PROVIDER}`;

// Create a type-safe mock for keytar using jest-mock-extended
const mockKeytar = mock<typeof import('keytar')>();

// Register the mock before importing the module under test
jest.mock('keytar', () => mockKeytar as unknown as typeof import('keytar'), { virtual: true });

// Import after mocking
import { CredentialManager } from '../../../src/core/credentials/credentialManager';

describe('CredentialManager', () => {
  // Console mocks
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup console mocks
    consoleSpy = mockConsole();

    // Setup keytar mock default implementations
    mockKeytar.getPassword.mockImplementation((service, account) => {
      if (service === FULL_SERVICE_NAME && account === TEST_ACCOUNT) {
        return Promise.resolve(TEST_SECRET);
      }
      return Promise.resolve(null);
    });

    mockKeytar.setPassword.mockImplementation(() => {
      return Promise.resolve();
    });

    mockKeytar.deletePassword.mockImplementation(() => {
      return Promise.resolve(true);
    });

    mockKeytar.findCredentials.mockImplementation(() => {
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    // Restore console mocks
    if (consoleSpy && typeof consoleSpy.restore === 'function') {
      consoleSpy.restore();
    }
  });

  describe('getFullServiceName', () => {
    it('should generate correct service name format', () => {
      // Use reflection to access private static method
      const getFullServiceName = CredentialManager['getFullServiceName'] as (providerType: string) => string;
      
      const result = getFullServiceName(TEST_PROVIDER);
      expect(result).toBe(FULL_SERVICE_NAME);
    });

    it('should convert provider type to lowercase', () => {
      // Use reflection to access private static method
      const getFullServiceName = CredentialManager['getFullServiceName'] as (providerType: string) => string;
      
      const result = getFullServiceName('OPENAI');
      expect(result).toBe(FULL_SERVICE_NAME);
    });
  });

  describe('getSecret', () => {
    it('should retrieve secret for valid provider and account', async () => {
      // Setup specific mock for this test
      mockKeytar.getPassword.mockResolvedValueOnce(TEST_SECRET);

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      const result = await CredentialManager.getSecret(identifier);

      expect(result).toBe(TEST_SECRET);
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT);
    });

    it('should return undefined if secret not found', async () => {
      // Setup keytar mock to return null (no password found)
      mockKeytar.getPassword.mockResolvedValueOnce(null);

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      const result = await CredentialManager.getSecret(identifier);

      expect(result).toBeUndefined();
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT);
    });

    it('should handle keytar errors and return undefined', async () => {
      // Setup keytar mock to throw error
      mockKeytar.getPassword.mockRejectedValueOnce(new Error('Keytar error'));

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      const result = await CredentialManager.getSecret(identifier);

      expect(result).toBeUndefined();
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('setSecret', () => {
    it('should store secret for valid provider and account', async () => {
      // Setup keytar mock
      mockKeytar.setPassword.mockResolvedValueOnce(undefined);

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      await CredentialManager.setSecret(identifier, TEST_SECRET);

      expect(mockKeytar.setPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT, TEST_SECRET);
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should throw error if keytar fails', async () => {
      // Setup keytar mock to throw error
      mockKeytar.setPassword.mockRejectedValueOnce(new Error('Keytar error'));

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      await expect(CredentialManager.setSecret(identifier, TEST_SECRET))
        .rejects.toThrow(`Failed to set secret for ${TEST_ACCOUNT} under ${FULL_SERVICE_NAME}`);

      expect(mockKeytar.setPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT, TEST_SECRET);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('deleteSecret', () => {
    it('should delete secret and return true if secret exists', async () => {
      // Setup keytar mock to return true (delete successful)
      mockKeytar.deletePassword.mockResolvedValueOnce(true);

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      const result = await CredentialManager.deleteSecret(identifier);

      expect(result).toBe(true);
      expect(mockKeytar.deletePassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT);
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should return false if secret does not exist', async () => {
      // Setup keytar mock to return false (nothing to delete)
      mockKeytar.deletePassword.mockResolvedValueOnce(false);

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      const result = await CredentialManager.deleteSecret(identifier);

      expect(result).toBe(false);
      expect(mockKeytar.deletePassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT);
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should handle keytar errors and return false', async () => {
      // Setup keytar mock to throw error
      mockKeytar.deletePassword.mockRejectedValueOnce(new Error('Keytar error'));

      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };

      const result = await CredentialManager.deleteSecret(identifier);

      expect(result).toBe(false);
      expect(mockKeytar.deletePassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('findCredentialsByProvider', () => {
    it('should return array of credentials for provider', async () => {
      // Mock credentials data
      const mockCredentials = [
        { account: 'account1', password: 'password1' },
        { account: 'account2', password: 'password2' }
      ];

      // Setup keytar mock
      mockKeytar.findCredentials.mockResolvedValueOnce(mockCredentials);

      const result = await CredentialManager.findCredentialsByProvider(TEST_PROVIDER);

      expect(result).toEqual(mockCredentials);
      expect(mockKeytar.findCredentials).toHaveBeenCalledWith(FULL_SERVICE_NAME);
    });

    it('should return empty array if no credentials found', async () => {
      // Setup keytar mock to return empty array
      mockKeytar.findCredentials.mockResolvedValueOnce([]);

      const result = await CredentialManager.findCredentialsByProvider(TEST_PROVIDER);

      expect(result).toEqual([]);
      expect(mockKeytar.findCredentials).toHaveBeenCalledWith(FULL_SERVICE_NAME);
    });

    it('should handle keytar errors and return empty array', async () => {
      // Setup keytar mock to throw error
      mockKeytar.findCredentials.mockRejectedValueOnce(new Error('Keytar error'));

      const result = await CredentialManager.findCredentialsByProvider(TEST_PROVIDER);

      expect(result).toEqual([]);
      expect(mockKeytar.findCredentials).toHaveBeenCalledWith(FULL_SERVICE_NAME);
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});