/**
 * @file Example test that demonstrates proper ES module mocking techniques
 */

import { jest } from '@jest/globals';
import {
  setupFsPromisesMock,
  setupKeytarMock,
  mockConsole,
  clearAllMockedModules,
  createModuleSpy
} from './test-setup';

// IMPORTANT: Always set up mocks BEFORE importing any modules that use them

describe('ES Module Mocking Examples', () => {
  // Console mocks
  let consoleSpy: ReturnType<typeof mockConsole>;
  let mockFs: ReturnType<typeof setupFsPromisesMock>;
  let mockKeytar: ReturnType<typeof setupKeytarMock>;

  // Use beforeAll to set up the mocks and module imports
  beforeAll(async () => {
    // Set up mocks before any imports
    mockFs = setupFsPromisesMock();
    mockKeytar = setupKeytarMock();

    // Register mocks with jest
    jest.unstable_mockModule('node:fs/promises', () => ({
      default: mockFs,
      ...mockFs
    }));

    jest.unstable_mockModule('keytar', () => ({
      default: mockKeytar,
      ...mockKeytar
    }));
  });

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
      // Create the mock implementation
      const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      };

      // Call the mock directly (rather than through module import)
      mockLogger.info('test message');
      expect(mockLogger.info).toHaveBeenCalledWith('test message');
    });

    it('demonstrates how to use createModuleSpy', async () => {
      // Create spies for module methods
      const mockServiceModule = {
        fetchData: jest.fn<(id: number) => Promise<{ id: number; name: string }>>().mockResolvedValue({ id: 1, name: 'Test' }),
        processData: jest.fn().mockReturnValue('processed')
      };

      // Call the mock directly (rather than through module import)
      const result = await mockServiceModule.fetchData(1);
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(mockServiceModule.fetchData).toHaveBeenCalledWith(1);
    });
  });
});