import { NodeCryptoService } from '../../../../src/core/credentials/file-keytar/crypto-service';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('NodeCryptoService', () => {
  let cryptoService: NodeCryptoService;
  
  beforeEach(() => {
    cryptoService = new NodeCryptoService();
  });
  
  describe('generateKey', () => {
    it('should generate a key of 32 bytes (256 bits)', async () => {
      // Act
      const key = await cryptoService.generateKey();
      
      // Assert
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });
    
    it('should generate unique keys on each call', async () => {
      // Act
      const key1 = await cryptoService.generateKey();
      const key2 = await cryptoService.generateKey();
      
      // Assert
      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });
  });
  
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      // Arrange
      const plaintext = 'This is a test secret';
      const key = await cryptoService.generateKey();
      
      // Act
      const encrypted = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(encrypted, key);
      
      // Assert
      expect(decrypted).toBe(plaintext);
    });
    
    it('should produce different ciphertext for same input due to IV', async () => {
      // Arrange
      const plaintext = 'This is a test secret';
      const key = await cryptoService.generateKey();
      
      // Act
      const encrypted1 = await cryptoService.encrypt(plaintext, key);
      const encrypted2 = await cryptoService.encrypt(plaintext, key);
      
      // Assert
      expect(encrypted1).not.toBe(encrypted2);
    });
    
    it('should handle empty string input', async () => {
      // Arrange
      const plaintext = '';
      const key = await cryptoService.generateKey();
      
      // Act
      const encrypted = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(encrypted, key);
      
      // Assert
      expect(decrypted).toBe(plaintext);
    });
    
    it('should handle JSON string input', async () => {
      // Arrange
      const plaintext = JSON.stringify({ test: 'value', number: 123, nested: { foo: 'bar' } });
      const key = await cryptoService.generateKey();
      
      // Act
      const encrypted = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(encrypted, key);
      
      // Assert
      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(plaintext));
    });
    
    it('should throw an error when decrypting with the wrong key', async () => {
      // Arrange
      const plaintext = 'This is a test secret';
      const key1 = await cryptoService.generateKey();
      const key2 = await cryptoService.generateKey();
      const encrypted = await cryptoService.encrypt(plaintext, key1);
      
      // Act & Assert
      await expect(cryptoService.decrypt(encrypted, key2)).rejects.toThrow();
    });
    
    it('should throw an error when decrypting invalid data', async () => {
      // Arrange
      const key = await cryptoService.generateKey();
      const invalidData = 'not-valid-encrypted-data';
      
      // Act & Assert
      await expect(cryptoService.decrypt(invalidData, key)).rejects.toThrow();
    });
  });
});