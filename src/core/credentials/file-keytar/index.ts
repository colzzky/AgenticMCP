import os from 'node:os';
import path from 'node:path';
import { FileKeytarImpl } from './file-keytar';
import { NodeCryptoService } from './crypto-service';
import { FileStorageService } from './storage-service';
import { FileKeyManagementService } from './key-management';
import { FileKeytar, FileKeytarOptions } from './interfaces';

// Default configuration
const DEFAULT_CONFIG = {
  storageDirectory: path.join(os.homedir(), '.agenticmcp', 'credentials'),
  masterKeyPath: path.join(os.homedir(), '.agenticmcp', 'master.key'),
  encryptionAlgorithm: 'aes-256-gcm'
};

/**
 * Creates a new FileKeytar instance with the given options
 * @param options - Configuration options
 * @returns A FileKeytar instance with keytar-compatible API
 */
export function createFileKeytar(options: FileKeytarOptions = {}): FileKeytar {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  const cryptoService = new NodeCryptoService(config.encryptionAlgorithm);
  const storageService = new FileStorageService(config.storageDirectory);
  const keyManagementService = new FileKeyManagementService(config.masterKeyPath, cryptoService);
  
  return new FileKeytarImpl(cryptoService, storageService, keyManagementService);
}

// Export a default singleton instance with default configuration
export default createFileKeytar();

// Export all types and implementation classes
export * from './interfaces';
export { FileKeytarImpl } from './file-keytar';
export { NodeCryptoService } from './crypto-service';
export { FileStorageService } from './storage-service';
export { FileKeyManagementService } from './key-management';