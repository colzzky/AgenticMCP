import { CryptoService, StorageService, KeyManagementService, FileKeytar, CredentialStore } from './interfaces';

/**
 * Implementation of the FileKeytar interface that stores credentials in an encrypted file
 */
export class FileKeytarImpl implements FileKeytar {
  private cryptoService: CryptoService;
  private storageService: StorageService;
  private keyManagementService: KeyManagementService;
  private cache: CredentialStore | undefined = undefined;

  /**
   * Creates a new FileKeytar implementation
   * @param cryptoService - The crypto service to use for encryption/decryption
   * @param storageService - The storage service to use for file operations
   * @param keyManagementService - The key management service to use for the master key
   */
  constructor(
    cryptoService: CryptoService,
    storageService: StorageService,
    keyManagementService: KeyManagementService
  ) {
    this.cryptoService = cryptoService;
    this.storageService = storageService;
    this.keyManagementService = keyManagementService;
  }

  /**
   * Loads credentials from the storage service
   * @returns A Promise that resolves to the credential store
   */
  private async loadCredentials(): Promise<CredentialStore> {
    // Return cached data if available
    // Return a deep clone of the cache to avoid accidental mutation by consumers
    if (this.cache !== undefined) return structuredClone(this.cache) as CredentialStore;
    
    // Read encrypted data from storage
    const encryptedData = await this.storageService.read();
    
    // If no data exists yet, return an empty store
    if (!encryptedData) {
      return {
        credentials: [],
        version: '1.0',
        lastModified: new Date().toISOString()
      };
    }
    
    try {
      // Get the master key and decrypt the data
      const key = await this.keyManagementService.getMasterKey();
      const decryptedData = await this.cryptoService.decrypt(encryptedData, key);
      
      // Parse and cache the data
      this.cache = JSON.parse(decryptedData);
      return structuredClone(this.cache) as CredentialStore;
    } catch (error) {
      throw new Error(`Failed to load credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Saves credentials to the storage service
   * @param store - The credential store to save
   * @returns A Promise that resolves when the save is complete
   */
  private async saveCredentials(store: CredentialStore): Promise<void> {
    // Update timestamp
    store.lastModified = new Date().toISOString();
    
    try {
      // Convert to JSON
      const data = JSON.stringify(store);
      
      // Get the master key and encrypt the data
      const key = await this.keyManagementService.getMasterKey();
      const encryptedData = await this.cryptoService.encrypt(data, key);
      
      // Write to storage and update cache
      await this.storageService.write(encryptedData);
      this.cache = store;
    } catch (error) {
      throw new Error(`Failed to save credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Gets a password for a service and account
   * @param service - The service name
   * @param account - The account name
   * @returns A Promise that resolves to the password, or null if not found
   */
  async getPassword(service: string, account: string): Promise<string | undefined> {
    try {
      const store = await this.loadCredentials();
      const credential = store.credentials.find(
        c => c.service === service && c.account === account
      );
      return credential ? credential.password : undefined;
    } catch (error) {
      // Log error but return null to match keytar behavior
      console.error(`Error in getPassword: ${(error as Error).message}`);
      return undefined;
    }
  }

  /**
   * Sets a password for a service and account
   * @param service - The service name
   * @param account - The account name
   * @param password - The password to set
   * @returns A Promise that resolves when the password is set
   */
  async setPassword(service: string, account: string, password: string): Promise<void> {
    try {
      const store = await this.loadCredentials();
      
      // Find existing credential
      const index = store.credentials.findIndex(
        c => c.service === service && c.account === account
      );
      
      // Update or add the credential
      if (index === -1) {
        store.credentials.push({ service, account, password });
      } else {
        store.credentials[index].password = password;
      }
      
      // Save the updated store
      await this.saveCredentials(store);
    } catch (error) {
      throw new Error(`Failed to set password: ${(error as Error).message}`);
    }
  }

  /**
   * Deletes a password for a service and account
   * @param service - The service name
   * @param account - The account name
   * @returns A Promise that resolves to true if deleted, false if not found
   */
  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      const store = await this.loadCredentials();
      
      // Find the credential
      const index = store.credentials.findIndex(
        c => c.service === service && c.account === account
      );
      
      // If not found, return false
      if (index === -1) {
        return false;
      }
      // If found, remove it and save
      store.credentials.splice(index, 1);
      await this.saveCredentials(store);
      return true;
    } catch (error) {
      // Log error but return false to match keytar behavior
      console.error(`Error in deletePassword: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Finds all credentials for a service
   * @param service - The service name
   * @returns A Promise that resolves to an array of credentials
   */
  async findCredentials(service: string): Promise<Array<{ account: string, password: string }>> {
    try {
      const store = await this.loadCredentials();
      
      // Filter by service and return account/password pairs
      return store.credentials
        .filter(c => c.service === service)
        .map(({ account, password }) => ({ account, password }));
    } catch (error) {
      // Log error but return empty array to match keytar behavior
      console.error(`Error in findCredentials: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Finds the first password for a service
   * @param service - The service name
   * @returns A Promise that resolves to the first password found, or null
   */
  async findPassword(service: string): Promise<string | undefined> {
    try {
      const credentials = await this.findCredentials(service);
      return credentials.length > 0 ? credentials[0].password : undefined;
    } catch (error) {
      // Log error but return null to match keytar behavior
      console.error(`Error in findPassword: ${(error as Error).message}`);
      return undefined;
    }
  }
}