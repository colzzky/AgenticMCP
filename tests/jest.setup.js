/**
 * @file Jest setup file for patching Node.js modules and global mocks
 */

// Import Jest
import { jest } from '@jest/globals';

// Create global mock registry
global.__mocks__ = {};

// Create mock for fs/promises
const fsMock = {
  access: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    isDirectory: jest.fn().mockReturnValue(false),
    size: 1024
  }),
  readFile: jest.fn().mockResolvedValue('mock file content'),
  readdir: jest.fn().mockResolvedValue(['mock-file-1.txt', 'mock-file-2.txt']),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  constants: {
    R_OK: 4,
    W_OK: 2,
    F_OK: 0
  }
};

// Create mock for keytar
const keytarMock = {
  getPassword: jest.fn().mockResolvedValue('mock-password'),
  setPassword: jest.fn().mockResolvedValue(undefined),
  deletePassword: jest.fn().mockResolvedValue(true),
  findCredentials: jest.fn().mockResolvedValue([
    { account: 'mock-account', password: 'mock-password' }
  ])
};

// Patch Node.js modules
jest.unstable_mockModule('node:fs/promises', () => fsMock);
jest.unstable_mockModule('fs/promises', () => fsMock);
jest.unstable_mockModule('keytar', () => keytarMock);

// Store mocks in global registry
global.__mocks__.fs = fsMock;
global.__mocks__.keytar = keytarMock;

// Helper function for accessing mocks from tests
global.getMock = (name) => global.__mocks__[name];

// Reset all mocks before each test
beforeEach(() => {
  // Reset all registered mocks
  Object.values(global.__mocks__).forEach(mock => {
    Object.values(mock).forEach(fn => {
      if (typeof fn === 'function' && typeof fn.mockReset === 'function') {
        fn.mockReset();
      }
    });
  });
});

// Note: You need to update jest.config.js to use this setup file:
// ```
// export default {
//   setupFilesAfterEnv: ['./tests/jest.setup.js'],
//   // other config
// };
// ```