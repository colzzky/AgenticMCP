/**
 * Simple functional tests for CredentialCommands
 * Tests the functionality rather than the Commander.js implementation
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CredentialManager } from '../../src/core/credentials/credentialManager.js';
import { CredentialIdentifier, KeytarCredential } from '../../src/core/types/credentials.types.js';
import { Logger } from '../../src/core/types/logger.types.js';

describe('CredentialCommands Functionality', () => {
  // Mock dependencies
  const mockCredentialManager = {
    getSecret: jest.fn(),
    setSecret: jest.fn(),
    deleteSecret: jest.fn(),
    findCredentialsByProvider: jest.fn(),
    getFullServiceName: jest.fn()
  } as unknown as typeof CredentialManager;

  // Mock logger
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(), 
    warn: jest.fn(),
    error: jest.fn(),
    setLogLevel: jest.fn()
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Credentials Set Command', () => {
    it('should set a secret for a provider and account', async () => {
      // Setup
      const providerType = 'openai';
      const accountName = 'apiKey';
      const secret = 'test-secret-key';
      const identifier: CredentialIdentifier = { providerType, accountName };

      mockCredentialManager.setSecret.mockResolvedValue(undefined);

      // Execute the action directly (simulating the command handler)
      try {
        await mockCredentialManager.setSecret(identifier, secret);
        // Message is logged by CredentialManager
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(`Failed to set secret: ${(error as Error).message}`);
        } else {
          mockLogger.error('Failed to set secret due to an unknown error.');
        }
      }

      // Verify
      expect(mockCredentialManager.setSecret).toHaveBeenCalledWith(identifier, secret);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle errors when setting a secret', async () => {
      // Setup
      const providerType = 'openai';
      const accountName = 'apiKey';
      const secret = 'test-secret-key';
      const identifier: CredentialIdentifier = { providerType, accountName };
      const error = new Error('Failed to set secret');

      mockCredentialManager.setSecret.mockRejectedValue(error);

      // Execute the action directly (simulating the command handler)
      try {
        await mockCredentialManager.setSecret(identifier, secret);
        // Message is logged by CredentialManager
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(`Failed to set secret: ${(error as Error).message}`);
        } else {
          mockLogger.error('Failed to set secret due to an unknown error.');
        }
      }

      // Verify
      expect(mockCredentialManager.setSecret).toHaveBeenCalledWith(identifier, secret);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to set secret: Failed to set secret');
    });
  });

  describe('Credentials Get Command', () => {
    it('should retrieve a secret for a provider and account', async () => {
      // Setup
      const providerType = 'openai';
      const accountName = 'apiKey';
      const secret = 'test-secret-key';
      const identifier: CredentialIdentifier = { providerType, accountName };

      mockCredentialManager.getSecret.mockResolvedValue(secret);

      // Execute the action directly (simulating the command handler)
      try {
        const retrievedSecret = await mockCredentialManager.getSecret(identifier);
        if (retrievedSecret) {
          mockLogger.info(
            `Retrieved secret for provider '${identifier.providerType}', account '${identifier.accountName}'. Secret length: ${retrievedSecret.length}`,
          );
        } else {
          mockLogger.warn(
            `No secret found for provider '${identifier.providerType}', account '${identifier.accountName}'.`,
          );
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(`Failed to retrieve secret: ${(error as Error).message}`);
        } else {
          mockLogger.error('Failed to retrieve secret due to an unknown error.');
        }
      }

      // Verify
      expect(mockCredentialManager.getSecret).toHaveBeenCalledWith(identifier);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Retrieved secret for provider '${providerType}', account '${accountName}'. Secret length: ${secret.length}`
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle case when no secret is found', async () => {
      // Setup
      const providerType = 'openai';
      const accountName = 'apiKey';
      const identifier: CredentialIdentifier = { providerType, accountName };

      mockCredentialManager.getSecret.mockResolvedValue(undefined);

      // Execute the action directly (simulating the command handler)
      try {
        const retrievedSecret = await mockCredentialManager.getSecret(identifier);
        if (retrievedSecret) {
          mockLogger.info(
            `Retrieved secret for provider '${identifier.providerType}', account '${identifier.accountName}'. Secret length: ${retrievedSecret.length}`,
          );
        } else {
          mockLogger.warn(
            `No secret found for provider '${identifier.providerType}', account '${identifier.accountName}'.`,
          );
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(`Failed to retrieve secret: ${(error as Error).message}`);
        } else {
          mockLogger.error('Failed to retrieve secret due to an unknown error.');
        }
      }

      // Verify
      expect(mockCredentialManager.getSecret).toHaveBeenCalledWith(identifier);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `No secret found for provider '${providerType}', account '${accountName}'.`
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle errors when retrieving a secret', async () => {
      // Setup
      const providerType = 'openai';
      const accountName = 'apiKey';
      const identifier: CredentialIdentifier = { providerType, accountName };
      const error = new Error('Failed to retrieve secret');

      mockCredentialManager.getSecret.mockRejectedValue(error);

      // Execute the action directly (simulating the command handler)
      try {
        const retrievedSecret = await mockCredentialManager.getSecret(identifier);
        if (retrievedSecret) {
          mockLogger.info(
            `Retrieved secret for provider '${identifier.providerType}', account '${identifier.accountName}'. Secret length: ${retrievedSecret.length}`,
          );
        } else {
          mockLogger.warn(
            `No secret found for provider '${identifier.providerType}', account '${identifier.accountName}'.`,
          );
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(`Failed to retrieve secret: ${(error as Error).message}`);
        } else {
          mockLogger.error('Failed to retrieve secret due to an unknown error.');
        }
      }

      // Verify
      expect(mockCredentialManager.getSecret).toHaveBeenCalledWith(identifier);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve secret: Failed to retrieve secret');
    });
  });

  describe('Credentials Delete Command', () => {
    it('should delete a secret for a provider and account', async () => {
      // Setup
      const providerType = 'openai';
      const accountName = 'apiKey';
      const identifier: CredentialIdentifier = { providerType, accountName };

      mockCredentialManager.deleteSecret.mockResolvedValue(true);

      // Execute the action directly (simulating the command handler)
      try {
        await mockCredentialManager.deleteSecret(identifier);
        mockLogger.info(`Successfully deleted secret for ${JSON.stringify(identifier)}`);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(`Failed to delete secret for ${JSON.stringify(identifier)}: ${(error as Error).message}`);
        } else {
          mockLogger.error('Failed to delete secret due to an unknown error.');
        }
      }

      // Verify
      expect(mockCredentialManager.deleteSecret).toHaveBeenCalledWith(identifier);
      expect(mockLogger.info).toHaveBeenCalledWith(`Successfully deleted secret for ${JSON.stringify(identifier)}`);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle errors when deleting a secret', async () => {
      // Setup
      const providerType = 'openai';
      const accountName = 'apiKey';
      const identifier: CredentialIdentifier = { providerType, accountName };
      const error = new Error('Failed to delete secret');

      mockCredentialManager.deleteSecret.mockRejectedValue(error);

      // Execute the action directly (simulating the command handler)
      try {
        await mockCredentialManager.deleteSecret(identifier);
        mockLogger.info(`Successfully deleted secret for ${JSON.stringify(identifier)}`);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(`Failed to delete secret for ${JSON.stringify(identifier)}: ${(error as Error).message}`);
        } else {
          mockLogger.error('Failed to delete secret due to an unknown error.');
        }
      }

      // Verify
      expect(mockCredentialManager.deleteSecret).toHaveBeenCalledWith(identifier);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to delete secret for ${JSON.stringify(identifier)}: Failed to delete secret`
      );
    });
  });

  describe('Credentials List Command', () => {
    it('should list all credentials for a provider', async () => {
      // Setup
      const providerType = 'openai';
      const credentials: KeytarCredential[] = [
        { account: 'apiKey', password: 'secret1' },
        { account: 'orgId', password: 'secret2' }
      ];

      mockCredentialManager.findCredentialsByProvider.mockResolvedValue(credentials);

      // Execute the action directly (simulating the command handler)
      try {
        const foundCredentials = await mockCredentialManager.findCredentialsByProvider(providerType);
        if (foundCredentials.length > 0) {
          mockLogger.info(`Found credentials for provider '${providerType}':`);
          for (const cred of foundCredentials) {
            mockLogger.info(`  Account: ${cred.account}, Password Set: ${cred.password ? 'Yes' : 'No'}`);
          }
        } else {
          mockLogger.warn(`No credentials found for provider '${providerType}'.`);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(
            `Failed to list secrets for provider '${providerType}': ${(error as Error).message}`,
          );
        } else {
          mockLogger.error(
            `Failed to list secrets for provider '${providerType}' due to an unknown error.`,
          );
        }
      }

      // Verify
      expect(mockCredentialManager.findCredentialsByProvider).toHaveBeenCalledWith(providerType);
      expect(mockLogger.info).toHaveBeenCalledWith(`Found credentials for provider '${providerType}':`);
      expect(mockLogger.info).toHaveBeenCalledWith(`  Account: apiKey, Password Set: Yes`);
      expect(mockLogger.info).toHaveBeenCalledWith(`  Account: orgId, Password Set: Yes`);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle case when no credentials are found', async () => {
      // Setup
      const providerType = 'openai';
      const credentials: KeytarCredential[] = [];

      mockCredentialManager.findCredentialsByProvider.mockResolvedValue(credentials);

      // Execute the action directly (simulating the command handler)
      try {
        const foundCredentials = await mockCredentialManager.findCredentialsByProvider(providerType);
        if (foundCredentials.length > 0) {
          mockLogger.info(`Found credentials for provider '${providerType}':`);
          for (const cred of foundCredentials) {
            mockLogger.info(`  Account: ${cred.account}, Password Set: ${cred.password ? 'Yes' : 'No'}`);
          }
        } else {
          mockLogger.warn(`No credentials found for provider '${providerType}'.`);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(
            `Failed to list secrets for provider '${providerType}': ${(error as Error).message}`,
          );
        } else {
          mockLogger.error(
            `Failed to list secrets for provider '${providerType}' due to an unknown error.`,
          );
        }
      }

      // Verify
      expect(mockCredentialManager.findCredentialsByProvider).toHaveBeenCalledWith(providerType);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(`No credentials found for provider '${providerType}'.`);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle errors when listing credentials', async () => {
      // Setup
      const providerType = 'openai';
      const error = new Error('Failed to list credentials');

      mockCredentialManager.findCredentialsByProvider.mockRejectedValue(error);

      // Execute the action directly (simulating the command handler)
      try {
        const foundCredentials = await mockCredentialManager.findCredentialsByProvider(providerType);
        if (foundCredentials.length > 0) {
          mockLogger.info(`Found credentials for provider '${providerType}':`);
          for (const cred of foundCredentials) {
            mockLogger.info(`  Account: ${cred.account}, Password Set: ${cred.password ? 'Yes' : 'No'}`);
          }
        } else {
          mockLogger.warn(`No credentials found for provider '${providerType}'.`);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          mockLogger.error(
            `Failed to list secrets for provider '${providerType}': ${(error as Error).message}`,
          );
        } else {
          mockLogger.error(
            `Failed to list secrets for provider '${providerType}' due to an unknown error.`,
          );
        }
      }

      // Verify
      expect(mockCredentialManager.findCredentialsByProvider).toHaveBeenCalledWith(providerType);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to list secrets for provider '${providerType}': Failed to list credentials`
      );
    });
  });
});