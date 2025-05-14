import { FileKeytarImpl } from '../file-keytar';
import { CryptoService, KeyManagementService, StorageService } from '../interfaces';

// Mock implementations
const mockCryptoService = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  generateKey: jest.fn()
};

const mockStorageService = {
  read: jest.fn(),
  write: jest.fn(),
  ensureStorageDirectory: jest.fn()
};

const mockKeyManagementService = {
  getMasterKey: jest.fn()
};

describe('FileKeytarImpl', () => {
  let fileKeytar: FileKeytarImpl;
  let mockKey: Buffer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    fileKeytar = new FileKeytarImpl(
      mockCryptoService as unknown as CryptoService,
      mockStorageService as unknown as StorageService,
      mockKeyManagementService as unknown as KeyManagementService
    );
    
    // Mock key for encryption/decryption
    mockKey = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    mockKeyManagementService.getMasterKey.mockResolvedValue(mockKey);
    
    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  describe('getPassword', () => {
    it('should retrieve a password when it exists', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'test-service', account: 'test-account', password: 'test-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      
      // Act
      const result = await fileKeytar.getPassword('test-service', 'test-account');
      
      // Assert
      expect(result).toBe('test-password');
      expect(mockStorageService.read).toHaveBeenCalledTimes(1);
      expect(mockKeyManagementService.getMasterKey).toHaveBeenCalledTimes(1);
      expect(mockCryptoService.decrypt).toHaveBeenCalledWith(mockEncryptedData, mockKey);
    });
    
    it('should return null when password does not exist', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'test-service', account: 'wrong-account', password: 'wrong-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      
      // Act
      const result = await fileKeytar.getPassword('test-service', 'test-account');
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should return null when no credentials file exists', async () => {
      // Arrange
      mockStorageService.read.mockResolvedValue(null);
      
      // Act
      const result = await fileKeytar.getPassword('test-service', 'test-account');
      
      // Assert
      expect(result).toBeNull();
      expect(mockCryptoService.decrypt).not.toHaveBeenCalled();
    });
    
    it('should handle encryption errors gracefully', async () => {
      // Arrange
      mockStorageService.read.mockResolvedValue('encrypted-data');
      mockCryptoService.decrypt.mockRejectedValue(new Error('Decryption failed'));
      
      // Act
      const result = await fileKeytar.getPassword('test-service', 'test-account');
      
      // Assert
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('setPassword', () => {
    it('should add a new password when it does not exist', async () => {
      // Arrange
      mockStorageService.read.mockResolvedValue(null); // No existing file
      mockCryptoService.encrypt.mockResolvedValue('new-encrypted-data');
      
      // Act
      await fileKeytar.setPassword('test-service', 'test-account', 'new-password');
      
      // Assert
      expect(mockStorageService.write).toHaveBeenCalledTimes(1);
      
      // Check the data being encrypted
      const encryptCallArg = mockCryptoService.encrypt.mock.calls[0][0];
      const parsedData = JSON.parse(encryptCallArg);
      expect(parsedData.credentials).toEqual([
        { service: 'test-service', account: 'test-account', password: 'new-password' }
      ]);
    });
    
    it('should update an existing password', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'test-service', account: 'test-account', password: 'old-password' },
          { service: 'other-service', account: 'other-account', password: 'other-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      mockCryptoService.encrypt.mockResolvedValue('new-encrypted-data');
      
      // Act
      await fileKeytar.setPassword('test-service', 'test-account', 'updated-password');
      
      // Assert
      expect(mockStorageService.write).toHaveBeenCalledTimes(1);
      
      // Check the data being encrypted
      const encryptCallArg = mockCryptoService.encrypt.mock.calls[0][0];
      const parsedData = JSON.parse(encryptCallArg);
      expect(parsedData.credentials).toContainEqual(
        { service: 'test-service', account: 'test-account', password: 'updated-password' }
      );
      expect(parsedData.credentials).toContainEqual(
        { service: 'other-service', account: 'other-account', password: 'other-password' }
      );
    });
    
    it('should throw an error when encryption fails', async () => {
      // Arrange
      mockStorageService.read.mockResolvedValue(null);
      mockCryptoService.encrypt.mockRejectedValue(new Error('Encryption failed'));
      
      // Act & Assert
      await expect(fileKeytar.setPassword('test-service', 'test-account', 'new-password'))
        .rejects.toThrow('Failed to save credentials');
    });
  });
  
  describe('deletePassword', () => {
    it('should delete a password and return true when it exists', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'test-service', account: 'test-account', password: 'test-password' },
          { service: 'other-service', account: 'other-account', password: 'other-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      mockCryptoService.encrypt.mockResolvedValue('new-encrypted-data');
      
      // Act
      const result = await fileKeytar.deletePassword('test-service', 'test-account');
      
      // Assert
      expect(result).toBe(true);
      
      // Check that it was deleted from the data
      const encryptCallArg = mockCryptoService.encrypt.mock.calls[0][0];
      const parsedData = JSON.parse(encryptCallArg);
      expect(parsedData.credentials).toHaveLength(1);
      expect(parsedData.credentials).not.toContainEqual(
        { service: 'test-service', account: 'test-account', password: 'test-password' }
      );
      expect(parsedData.credentials).toContainEqual(
        { service: 'other-service', account: 'other-account', password: 'other-password' }
      );
    });
    
    it('should return false when password does not exist', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'other-service', account: 'other-account', password: 'other-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      
      // Act
      const result = await fileKeytar.deletePassword('test-service', 'test-account');
      
      // Assert
      expect(result).toBe(false);
      // No write should happen
      expect(mockStorageService.write).not.toHaveBeenCalled();
    });
    
    it('should return false and handle errors gracefully', async () => {
      // Arrange
      mockStorageService.read.mockRejectedValue(new Error('Read error'));
      
      // Act
      const result = await fileKeytar.deletePassword('test-service', 'test-account');
      
      // Assert
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('findCredentials', () => {
    it('should return all credentials for a service', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'test-service', account: 'account1', password: 'password1' },
          { service: 'test-service', account: 'account2', password: 'password2' },
          { service: 'other-service', account: 'other-account', password: 'other-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      
      // Act
      const result = await fileKeytar.findCredentials('test-service');
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ account: 'account1', password: 'password1' });
      expect(result).toContainEqual({ account: 'account2', password: 'password2' });
    });
    
    it('should return an empty array when no credentials match the service', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'other-service', account: 'other-account', password: 'other-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      
      // Act
      const result = await fileKeytar.findCredentials('test-service');
      
      // Assert
      expect(result).toHaveLength(0);
    });
    
    it('should return an empty array and handle errors gracefully', async () => {
      // Arrange
      mockStorageService.read.mockRejectedValue(new Error('Read error'));
      
      // Act
      const result = await fileKeytar.findCredentials('test-service');
      
      // Assert
      expect(result).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('findPassword', () => {
    it('should return the first password for a service', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'test-service', account: 'account1', password: 'password1' },
          { service: 'test-service', account: 'account2', password: 'password2' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      
      // Act
      const result = await fileKeytar.findPassword('test-service');
      
      // Assert
      expect(result).toBe('password1');
    });
    
    it('should return null when no passwords match the service', async () => {
      // Arrange
      const mockEncryptedData = 'encrypted-data';
      const mockDecryptedData = JSON.stringify({
        credentials: [
          { service: 'other-service', account: 'other-account', password: 'other-password' }
        ],
        version: '1.0',
        lastModified: new Date().toISOString()
      });
      
      mockStorageService.read.mockResolvedValue(mockEncryptedData);
      mockCryptoService.decrypt.mockResolvedValue(mockDecryptedData);
      
      // Act
      const result = await fileKeytar.findPassword('test-service');
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should return null and handle errors gracefully', async () => {
      // Arrange
      mockStorageService.read.mockRejectedValue(new Error('Read error'));
      
      // Act
      const result = await fileKeytar.findPassword('test-service');
      
      // Assert
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });
});