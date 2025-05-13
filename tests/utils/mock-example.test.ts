/**
 * @file Example test that demonstrates proper ES module mocking techniques
 */

import { jest } from '@jest/globals';
import { 
  setupFsPromisesMock, 
  setupKeytarMock, 
  dynamicESModuleMock, 
  mockConsole,
  clearAllMockedModules,
  createModuleSpy
} from './test-setup';

// Setup mocks before any imports of modules that use them
const mockFs = setupFsPromisesMock();
const mockKeytar = setupKeytarMock();

// Example of mocking a local module with the dynamicESModuleMock utility
// This would be used in your actual test code
describe('ES Module Mocking Examples', () => {
  // Console mocks
  let consoleSpy: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    // Reset modules and mocks before each test
    jest.resetModules();
    jest.clearAllMocks();
    clearAllMockedModules();
    
    // Setup console mocks
    consoleSpy = mockConsole();
    
    // Reset fs mock implementations
    mockFs.readFile.mockReset();
    mockFs.writeFile.mockReset();
    
    // Reset keytar mock implementations
    mockKeytar.getPassword.mockReset();
    mockKeytar.setPassword.mockReset();
  });

  afterEach(() => {
    // Restore console mocks
    consoleSpy.restore();
  });

  describe('Mocking node:fs/promises', () => {
    it('demonstrates how to mock fs.readFile', async () => {
      // Setup mock implementation
      const TEST_FILE_PATH = '/path/to/file.txt';
      const TEST_CONTENT = 'file content';
      mockFs.readFile.mockResolvedValueOnce(TEST_CONTENT);
      
      // Import the module that uses fs.readFile
      // In a real test, this would be your actual module under test
      const { readTextFile } = await import('./mock-example-module');
      
      // Call the function that uses fs.readFile
      const result = await readTextFile(TEST_FILE_PATH);
      
      // Verify the result and that fs.readFile was called correctly
      expect(result).toBe(TEST_CONTENT);
      expect(mockFs.readFile).toHaveBeenCalledWith(TEST_FILE_PATH, { encoding: 'utf-8' });
    });

    it('demonstrates how to mock fs.writeFile', async () => {
      // Setup mock implementation
      const TEST_FILE_PATH = '/path/to/file.txt';
      const TEST_CONTENT = 'new content';
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      
      // Import the module that uses fs.writeFile
      const { writeTextFile } = await import('./mock-example-module');
      
      // Call the function that uses fs.writeFile
      await writeTextFile(TEST_FILE_PATH, TEST_CONTENT);
      
      // Verify that fs.writeFile was called correctly
      expect(mockFs.writeFile).toHaveBeenCalledWith(TEST_FILE_PATH, TEST_CONTENT);
    });
  });

  describe('Mocking keytar', () => {
    it('demonstrates how to mock keytar.getPassword', async () => {
      // Setup mock implementation
      const TEST_SERVICE = 'test-service';
      const TEST_ACCOUNT = 'test-account';
      const TEST_PASSWORD = 'secret-password';
      mockKeytar.getPassword.mockResolvedValueOnce(TEST_PASSWORD);
      
      // Import the module that uses keytar
      const { getCredential } = await import('./mock-example-module');
      
      // Call the function that uses keytar.getPassword
      const result = await getCredential(TEST_SERVICE, TEST_ACCOUNT);
      
      // Verify the result and that keytar.getPassword was called correctly
      expect(result).toBe(TEST_PASSWORD);
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(TEST_SERVICE, TEST_ACCOUNT);
    });

    it('demonstrates how to mock keytar.setPassword', async () => {
      // Setup mock implementation
      const TEST_SERVICE = 'test-service';
      const TEST_ACCOUNT = 'test-account';
      const TEST_PASSWORD = 'new-password';
      mockKeytar.setPassword.mockResolvedValueOnce(undefined);
      
      // Import the module that uses keytar
      const { setCredential } = await import('./mock-example-module');
      
      // Call the function that uses keytar.setPassword
      await setCredential(TEST_SERVICE, TEST_ACCOUNT, TEST_PASSWORD);
      
      // Verify that keytar.setPassword was called correctly
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(TEST_SERVICE, TEST_ACCOUNT, TEST_PASSWORD);
    });
  });

  describe('Mocking custom modules', () => {
    it('demonstrates how to use dynamicESModuleMock', async () => {
      // Create a dynamic mock for a custom module
      const mockLogger = await dynamicESModuleMock('./logger-module', () => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }));
      
      // The mockLogger can now be used to verify calls
      // In a real test, you'd import a module that uses the logger
      // and verify that it calls the logger methods correctly
      
      mockLogger.info('test message');
      expect(mockLogger.info).toHaveBeenCalledWith('test message');
    });

    it('demonstrates how to use createModuleSpy', async () => {
      // Create a spy for a module with methods
      const serviceMock = await createModuleSpy('./service-module', {
        fetchData: jest.fn().mockResolvedValue({ id: 1, name: 'Test' }),
        processData: jest.fn().mockReturnValue('processed')
      });
      
      // The serviceMock can now be used in tests
      const result = await serviceMock.fetchData(1);
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(serviceMock.fetchData).toHaveBeenCalledWith(1);
    });
  });
});