/**
 * @file Example test demonstrating ES module compatible credential testing
 */

import { jest } from '@jest/globals';
import { mockConsole, setupKeytarMock, mockESModule } from '../utils/test-setup';

let mockKeytar: ReturnType<typeof setupKeytarMock>;
beforeAll(() => {
  mockKeytar = setupKeytarMock();
  mockESModule('keytar', mockKeytar, { virtual: true });
});

// Now we can import the module that uses keytar
import { CredentialManager } from '../../src/core/credentials/credentialManager';
import { CredentialIdentifier } from '../../src/core/types/credentials.types';

describe('CredentialManager Example', () => {
  // Console mocks for verifying logging
  let consoleSpy: ReturnType<typeof mockConsole>;
  
  // Test constants
  const TEST_PROVIDER = 'openai';
  const TEST_ACCOUNT = 'test-account';
  const TEST_SECRET = 'test-api-key-12345';
  const FULL_SERVICE_NAME = `AgenticMCP-${TEST_PROVIDER}`;
  
  beforeEach(() => {
    // Reset module state and mocks
    jest.resetModules();
    jest.clearAllMocks();
    
    // Set up console mocks
    consoleSpy = mockConsole();
    
    // Set up mock implementations
    mockKeytar.getPassword.mockImplementation((service, account) => {
      if (service === FULL_SERVICE_NAME && account === TEST_ACCOUNT) {
        return Promise.resolve(TEST_SECRET);
      }
      return Promise.resolve(null);
    });
    
    mockKeytar.setPassword.mockResolvedValue(undefined);
    mockKeytar.deletePassword.mockResolvedValue(true);
    mockKeytar.findCredentials.mockResolvedValue([
      { account: 'account1', password: 'password1' },
      { account: 'account2', password: 'password2' }
    ]);
  });
  
  afterEach(() => {
    // Restore console mocks
    consoleSpy.restore();
  });
  
  describe('getSecret', () => {
    it('should retrieve secret for valid provider and account', async () => {
      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };
      
      const result = await CredentialManager.getSecret(identifier);
      
      expect(result).toBe(TEST_SECRET);
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT);
    });
    
    it('should return undefined if secret not found', async () => {
      // Set up mock for this specific test
      mockKeytar.getPassword.mockResolvedValueOnce(null);
      
      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: 'unknown-account'
      };
      
      const result = await CredentialManager.getSecret(identifier);
      
      expect(result).toBeUndefined();
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, 'unknown-account');
    });
  });
  
  describe('setSecret', () => {
    it('should store secret for valid provider and account', async () => {
      const identifier: CredentialIdentifier = {
        providerType: TEST_PROVIDER,
        accountName: TEST_ACCOUNT
      };
      
      await CredentialManager.setSecret(identifier, TEST_SECRET);
      
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(FULL_SERVICE_NAME, TEST_ACCOUNT, TEST_SECRET);
      expect(consoleSpy.log).toHaveBeenCalled();
    });
    
    it('should throw error if keytar fails', async () => {
      // Set up mock to throw error
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
  
  describe('findCredentialsByProvider', () => {
    it('should return array of credentials for provider', async () => {
      const mockCredentials = [
        { account: 'account1', password: 'password1' },
        { account: 'account2', password: 'password2' }
      ];
      
      const result = await CredentialManager.findCredentialsByProvider(TEST_PROVIDER);
      
      expect(result).toEqual(mockCredentials);
      expect(mockKeytar.findCredentials).toHaveBeenCalledWith(FULL_SERVICE_NAME);
    });
  });
});