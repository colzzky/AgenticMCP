import crypto from 'node:crypto';
import { CryptoService } from './interfaces';

// Extend Cipher and Decipher for GCM mode
type CipherGCM = crypto.Cipher & { getAuthTag(): Buffer };
type DecipherGCM = crypto.Decipher & { setAuthTag(tag: Buffer): void };

/**
 * Implementation of CryptoService using Node.js crypto module
 * Uses AES-256-GCM for authenticated encryption with authentication tag
 */
export class NodeCryptoService implements CryptoService {
  private algorithm: string;
  
  /**
   * Creates a new crypto service
   * @param algorithm - The encryption algorithm to use (default: 'aes-256-gcm')
   */
  constructor(algorithm: string = 'aes-256-gcm') {
    this.algorithm = algorithm;
  }

  /**
   * Generates a secure random key for encryption
   * @returns A Promise that resolves to a Buffer containing the key
   */
  async generateKey(): Promise<Buffer> {
    // For AES-256, we need a 32-byte key (256 bits)
    return crypto.randomBytes(32);
  }

  /**
   * Encrypts data using the provided key
   * @param plaintext - The data to encrypt
   * @param key - The encryption key
   * @returns A Promise that resolves to the encrypted data as a base64 string
   */
  async encrypt(plaintext: string, key: Buffer): Promise<string> {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher using the algorithm, key, and IV
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the authentication tag (for GCM mode)
    const authTag = (cipher as CipherGCM).getAuthTag();
    
    // Combine IV, auth tag, and encrypted data into a single buffer
    // Format: [IV (16 bytes)][Auth Tag (16 bytes)][Encrypted Data]
    return Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]).toString('base64');
  }

  /**
   * Decrypts data using the provided key
   * @param ciphertext - The encrypted data as a base64 string
   * @param key - The encryption key
   * @returns A Promise that resolves to the decrypted data
   */
  async decrypt(ciphertext: string, key: Buffer): Promise<string> {
    try {
      // Convert from base64 to buffer
      const data = Buffer.from(ciphertext, 'base64');
      
      // Extract IV (first 16 bytes)
      const iv = data.subarray(0, 16);
      
      // Extract auth tag (next 16 bytes for GCM)
      const authTag = data.subarray(16, 32);
      
      // Extract the encrypted content
      const encryptedContent = data.subarray(32).toString('base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      (decipher as DecipherGCM).setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }
}