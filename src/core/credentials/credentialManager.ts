import keytar from 'keytar';
import { CredentialIdentifier, KeytarCredential } from '../types/credentials.types';
import { logger } from '../utils/index'; // Corrected: Import from barrel file

const SERVICE_NAME_PREFIX = 'AgenticMCP'; // General prefix for all services

/**
 * Manages secure credentials using the system keychain via keytar.
 */
export class CredentialManager {
  /**
   * Generates the full service name for keytar.
   * @param providerType - The type of the provider (e.g., 'openai').
   * @returns The full service name string (e.g., 'AgenticMCP-openai').
   */
  private static getFullServiceName(providerType: string): string {
    return `${SERVICE_NAME_PREFIX}-${providerType.toLowerCase()}`;
  }

  /**
   * Retrieves a secret for a given provider and account name from the keychain.
   * @param identifier - The CredentialIdentifier containing providerType and accountName.
   * @returns The secret string if found, otherwise undefined.
   */
  static async getSecret(identifier: CredentialIdentifier): Promise<string | undefined> {
    const { providerType, accountName } = identifier;
    const serviceName = this.getFullServiceName(providerType);
    try {
      const secret = await keytar.getPassword(serviceName, accountName);
      return secret || undefined;
    } catch (error) {
      console.error(`Error getting secret for ${accountName} under ${serviceName}:`, error);
      return undefined;
    }
  }

  /**
   * Stores a secret for a given provider and account name in the keychain.
   * @param identifier - The CredentialIdentifier containing providerType and accountName.
   * @param secret - The secret string to store.
   * @returns A Promise that resolves when the secret is set.
   */
  static async setSecret(identifier: CredentialIdentifier, secret: string): Promise<void> {
    const { providerType, accountName } = identifier;
    const serviceName = this.getFullServiceName(providerType);
    try {
      await keytar.setPassword(serviceName, accountName, secret);
      console.log(`Secret for ${accountName} under ${serviceName} stored successfully.`);
    } catch (error) {
      console.error(`Error setting secret for ${accountName} under ${serviceName}:`, error);
      // Consider re-throwing or a more specific error handling
      throw new Error(`Failed to set secret for ${accountName} under ${serviceName}`);
    }
  }

  /**
   * Deletes a secret for a given provider and account name from the keychain.
   * @param identifier - The CredentialIdentifier containing providerType and accountName.
   * @returns A Promise that resolves to true if deletion was successful, false otherwise.
   */
  static async deleteSecret(identifier: CredentialIdentifier): Promise<boolean> {
    const { providerType, accountName } = identifier;
    const serviceName = this.getFullServiceName(providerType);
    try {
      const result = await keytar.deletePassword(serviceName, accountName);
      if (result) {
        console.log(`Secret for ${accountName} under ${serviceName} deleted successfully.`);
      } else {
        console.warn(`No secret found for ${accountName} under ${serviceName} to delete.`);
      }
      return result;
    } catch (error) {
      console.error(`Error deleting secret for ${accountName} under ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Finds all credentials stored for a given provider type.
   * @param providerType - The type of the provider.
   * @returns A Promise that resolves to an array of KeytarCredentials.
   */
  static async findCredentialsByProvider(providerType: string): Promise<KeytarCredential[]> {
    const serviceName = this.getFullServiceName(providerType);
    try {
      const credentials = await keytar.findCredentials(serviceName);
      return credentials.map(cred => ({ account: cred.account, password: cred.password }));
    } catch (error) {
      console.error(`Error finding credentials under ${serviceName}:`, error);
      return [];
    }
  }
}
