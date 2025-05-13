/**
 * @file Example test specifically demonstrating how to mock fs/promises and keytar
 */

import { jest } from '@jest/globals';
import { setupFsPromisesMock, setupKeytarMock, mockConsole } from './test-setup';

// Mock dependencies before importing any modules that use them
const mockFs = setupFsPromisesMock();
const mockKeytar = setupKeytarMock();

// Test constants
const TEST_FILE_PATH = '/test/config.json';
const TEST_SERVICE = 'AgenticMCP-test';
const TEST_ACCOUNT = 'test-account';
const TEST_SECRET = 'test-api-key-12345';
const TEST_CONFIG = JSON.stringify({ apiKey: 'API_KEY_PLACEHOLDER' });
const TEST_CONFIG_WITH_KEY = JSON.stringify({ apiKey: TEST_SECRET });

/**
 * This test demonstrates a realistic scenario: a config manager that:
 * 1. Reads a config file from the filesystem
 * 2. Replaces placeholder values with secrets from the keychain
 * 3. Writes the updated config back to the filesystem
 */
describe('ConfigManager with Keychain Integration', () => {
  // Console mocks
  let consoleSpy: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    // Reset modules and mocks
    jest.resetModules();
    jest.clearAllMocks();
    
    // Setup console mocks
    consoleSpy = mockConsole();
    
    // Reset fs mock implementations
    mockFs.readFile.mockReset();
    mockFs.writeFile.mockReset();
    mockFs.access.mockReset();
    
    // Reset keytar mock implementations
    mockKeytar.getPassword.mockReset();
    mockKeytar.setPassword.mockReset();
  });

  afterEach(() => {
    // Restore console mocks
    consoleSpy.restore();
  });

  describe('loadConfig', () => {
    it('should load config and replace API key placeholder with value from keychain', async () => {
      // Setup fs mock to return test config
      mockFs.access.mockResolvedValueOnce(undefined); // File exists
      mockFs.readFile.mockResolvedValueOnce(TEST_CONFIG);
      
      // Setup keytar mock to return test secret
      mockKeytar.getPassword.mockResolvedValueOnce(TEST_SECRET);
      
      // Import the module under test after mocks are set up
      const { ConfigManager } = await import('./config-manager-example');
      const configManager = new ConfigManager();
      
      // Call the function under test
      const config = await configManager.loadConfig(TEST_FILE_PATH);
      
      // Verify the config contains the secret from keychain
      expect(config).toEqual({ apiKey: TEST_SECRET });
      
      // Verify fs and keytar were called correctly
      expect(mockFs.access).toHaveBeenCalledWith(TEST_FILE_PATH);
      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_FILE_PATH, { encoding: 'utf-8' });
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(TEST_SERVICE, TEST_ACCOUNT);
    });

    it('should create default config if file does not exist', async () => {
      // Setup fs mock to simulate file not existing
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      
      // Setup keytar mock to return test secret
      mockKeytar.getPassword.mockResolvedValueOnce(TEST_SECRET);
      
      // Import the module under test after mocks are set up
      const { ConfigManager } = await import('./config-manager-example');
      const configManager = new ConfigManager();
      
      // Call the function under test
      const config = await configManager.loadConfig(TEST_FILE_PATH);
      
      // Verify the config contains the secret from keychain
      expect(config).toEqual({ apiKey: TEST_SECRET });
      
      // Verify fs.writeFile was called to create the default config
      expect(mockFs.writeFile).toHaveBeenCalledWith(TEST_FILE_PATH, expect.any(String));
    });

    it('should handle missing keychain value', async () => {
      // Setup fs mock to return test config
      mockFs.access.mockResolvedValueOnce(undefined); // File exists
      mockFs.readFile.mockResolvedValueOnce(TEST_CONFIG);
      
      // Setup keytar mock to return null (no secret found)
      mockKeytar.getPassword.mockResolvedValueOnce(null);
      
      // Import the module under test after mocks are set up
      const { ConfigManager } = await import('./config-manager-example');
      const configManager = new ConfigManager();
      
      // Call the function under test
      const config = await configManager.loadConfig(TEST_FILE_PATH);
      
      // Verify the config still has the placeholder
      expect(config).toEqual({ apiKey: 'API_KEY_PLACEHOLDER' });
      
      // Verify console.warn was called
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('saveConfig', () => {
    it('should save config with placeholders and store actual values in keychain', async () => {
      // Setup fs mock
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      
      // Setup keytar mock
      mockKeytar.setPassword.mockResolvedValueOnce(undefined);
      
      // Import the module under test after mocks are set up
      const { ConfigManager } = await import('./config-manager-example');
      const configManager = new ConfigManager();
      
      // Call the function under test
      const configToSave = { apiKey: TEST_SECRET };
      await configManager.saveConfig(TEST_FILE_PATH, configToSave);
      
      // Verify fs.writeFile was called with config containing placeholder
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        TEST_FILE_PATH, 
        expect.stringContaining('API_KEY_PLACEHOLDER')
      );
      
      // Verify keytar.setPassword was called with actual secret
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        TEST_SERVICE, 
        TEST_ACCOUNT, 
        TEST_SECRET
      );
    });

    it('should handle error when setting keychain value fails', async () => {
      // Setup fs mock
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      
      // Setup keytar mock to simulate error
      mockKeytar.setPassword.mockRejectedValueOnce(new Error('Keychain access denied'));
      
      // Import the module under test after mocks are set up
      const { ConfigManager } = await import('./config-manager-example');
      const configManager = new ConfigManager();
      
      // Call the function under test and expect error
      const configToSave = { apiKey: TEST_SECRET };
      await expect(configManager.saveConfig(TEST_FILE_PATH, configToSave))
        .rejects.toThrow('Failed to store secret in keychain');
      
      // Verify console.error was called
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});