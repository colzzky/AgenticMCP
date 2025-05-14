/**
 * Main public interface - matches keytar's API
 */
export interface FileKeytar {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
  findCredentials(service: string): Promise<Array<{ account: string, password: string }>>;
  findPassword?(service: string): Promise<string | null>; // Optional in original keytar
}

/**
 * Internal data structure for stored credentials
 */
export interface CredentialStore {
  credentials: Array<{
    service: string;
    account: string;
    password: string;
  }>;
  version: string;
  lastModified: string;
}

/**
 * Configuration options for FileKeytar
 */
export interface FileKeytarOptions {
  storageDirectory?: string;  // Custom location for the encrypted file
  masterKeyPath?: string;     // Path to store the master key
  encryptionAlgorithm?: string; // Algorithm to use (default: 'aes-256-gcm')
}

/**
 * Encryption service interface
 */
export interface CryptoService {
  encrypt(plaintext: string, key: Buffer): Promise<string>;
  decrypt(ciphertext: string, key: Buffer): Promise<string>;
  generateKey(): Promise<Buffer>;
}

/**
 * Storage service interface
 */
export interface StorageService {
  read(): Promise<string | null>;
  write(data: string): Promise<void>;
  ensureStorageDirectory(): Promise<void>;
}

/**
 * Key management service interface
 */
export interface KeyManagementService {
  getMasterKey(): Promise<Buffer>;
}