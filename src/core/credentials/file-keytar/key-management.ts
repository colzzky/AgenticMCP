import fs from 'node:fs/promises';
import path from 'node:path';
import { CryptoService, KeyManagementService } from './interfaces';

/**
 * Manages encryption keys for the file-keytar system
 */
export class FileKeyManagementService implements KeyManagementService {
  private keyPath: string;
  private masterKey: Buffer | null = null;
  private cryptoService: CryptoService;
  
  /**
   * Creates a new key management service
   * @param keyPath - The path to store the master key
   * @param cryptoService - The crypto service to use for key generation
   */
  constructor(keyPath: string, cryptoService: CryptoService) {
    this.keyPath = keyPath;
    this.cryptoService = cryptoService;
  }

  /**
   * Gets the master encryption key, creating it if it doesn't exist
   * @returns A Promise that resolves to the master key
   */
  async getMasterKey(): Promise<Buffer> {
    // Return cached key if available
    if (this.masterKey) return this.masterKey;
    
    try {
      // Try to read existing key
      const keyData = await fs.readFile(this.keyPath);
      this.masterKey = keyData;
      return keyData;
    } catch (error) {
      // If key doesn't exist, generate a new one
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const newKey = await this.cryptoService.generateKey();
        
        // Ensure directory exists
        const directory = path.dirname(this.keyPath);
        await fs.mkdir(directory, { recursive: true });
        
        // Save the key with restrictive permissions (only readable by owner)
        const fileHandle = await fs.open(this.keyPath, 'w', 0o600);
        await fileHandle.writeFile(newKey);
        await fileHandle.close();
        
        this.masterKey = newKey;
        return newKey;
      }
      
      throw new Error(`Error accessing master key: ${(error as Error).message}`);
    }
  }
}