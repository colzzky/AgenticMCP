import { CredentialIdentifier, KeytarCredential } from '../types/credentials.types';
import { Logger } from '../types/logger.types';
import { KeytarDi } from '../../types/global.types';

const SERVICE_NAME_PREFIX = 'AgenticMCP'; // General prefix for all services

/**
 * Manages secure credentials using the system keychain via keytar.
 */
export class CredentialManager {

  private keytarDi: KeytarDi;
  private loggerDi: Logger;

  constructor(keytarDi: KeytarDi, loggerDi: Logger) {
    this.keytarDi = keytarDi;
    this.loggerDi = loggerDi;
  }

  /**
   * Generates the full service name for keytar.
   * @param providerType - The type of the provider (e.g., 'openai').
   * @returns The full service name string (e.g., 'AgenticMCP-openai').
   */
  private getFullServiceName(providerType: string): string {
    return `${SERVICE_NAME_PREFIX}-${providerType.toLowerCase()}`;
  }

  /**
   * Retrieves a secret for a given provider and account name from the keychain.
   * @param identifier - The CredentialIdentifier containing providerType and accountName.
   * @returns The secret string if found, otherwise undefined.
   */
  async getSecret(identifier: CredentialIdentifier): Promise<string | undefined> {
    const { providerType, accountName } = identifier;
    const serviceName = this.getFullServiceName(providerType);
    try {
      const secret = await this.keytarDi.getPassword(serviceName, accountName);
      return secret || undefined;
    } catch (error) {
      this.loggerDi.error(`Error getting secret for ${accountName} under ${serviceName}:`, error);
      return undefined;
    }
  }

  /**
   * Stores a secret for a given provider and account name in the keychain.
   * @param identifier - The CredentialIdentifier containing providerType and accountName.
   * @param secret - The secret string to store.
   * @returns A Promise that resolves when the secret is set.
   */
  async setSecret(identifier: CredentialIdentifier, secret: string): Promise<void> {
    const { providerType, accountName } = identifier;
    const serviceName = this.getFullServiceName(providerType);
    try {
      await this.keytarDi.setPassword(serviceName, accountName, secret);
      this.loggerDi.info(`Secret for ${accountName} under ${serviceName} stored successfully.`);
    } catch (error) {
      this.loggerDi.error(`Error setting secret for ${accountName} under ${serviceName}:`, error);
      // Consider re-throwing or a more specific error handling
      throw new Error(`Failed to set secret for ${accountName} under ${serviceName}`);
    }
  }

  /**
   * Deletes a secret for a given provider and account name from the keychain.
   * @param identifier - The CredentialIdentifier containing providerType and accountName.
   * @returns A Promise that resolves to true if deletion was successful, false otherwise.
   */
  async deleteSecret(identifier: CredentialIdentifier): Promise<boolean> {
    const { providerType, accountName } = identifier;
    const serviceName = this.getFullServiceName(providerType);
    try {
      const result = await this.keytarDi.deletePassword(serviceName, accountName);
      if (result) {
        this.loggerDi.info(`Secret for ${accountName} under ${serviceName} deleted successfully.`);
      } else {
        this.loggerDi.warn(`No secret found for ${accountName} under ${serviceName} to delete.`);
      }
      return result;
    } catch (error) {
      this.loggerDi.error(`Error deleting secret for ${accountName} under ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Finds all credentials stored for a given provider type.
   * @param providerType - The type of the provider.
   * @returns A Promise that resolves to an array of KeytarCredentials.
   */
  async findCredentialsByProvider(providerType: string): Promise<KeytarCredential[]> {
    const serviceName = this.getFullServiceName(providerType);
    if (typeof (this.keytarDi as any).findCredentials !== 'function') {
      this.loggerDi.warn(
        `keytar.findCredentials is not available in this environment. ` +
        `Listing all credentials is not supported in Node.js keytar. Returning an empty list.`
      );
      return [];
    }
    try {
      const credentials = await (this.keytarDi as any).findCredentials(serviceName);
      return credentials.map((cred: any) => ({ account: cred.account, password: cred.password }));
    } catch (error) {
      this.loggerDi.error(`Error finding credentials under ${serviceName}:`, error);
      return [];
    }
  }
}
