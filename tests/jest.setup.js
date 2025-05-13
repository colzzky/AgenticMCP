/**
 * @file Jest setup file for patching Node.js modules and global mocks
 */

// Import Jest
import { jest } from '@jest/globals';
import { Stats, Dirent } from 'fs';

// Create global mock registry
global.__mocks__ = {};

/**
 * Create a mock implementation for fs/promises
 * This includes all commonly used methods and properties
 */
const createFsMock = () => ({
  // File access methods
  access: jest.fn().mockResolvedValue(undefined),

  // File info methods
  stat: jest.fn().mockImplementation(() => {
    const mockStat = {
      isDirectory: jest.fn().mockReturnValue(false),
      isFile: jest.fn().mockReturnValue(true),
      isSymbolicLink: jest.fn().mockReturnValue(false),
      isBlockDevice: jest.fn().mockReturnValue(false),
      isCharacterDevice: jest.fn().mockReturnValue(false),
      isFIFO: jest.fn().mockReturnValue(false),
      isSocket: jest.fn().mockReturnValue(false),
      size: 1024,
      mode: 0o666,
      uid: 1000,
      gid: 1000,
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date()
    };
    return Promise.resolve(mockStat);
  }),

  // File read/write methods
  readFile: jest.fn().mockImplementation((path, options) => {
    // Return Buffer by default, string if encoding is specified
    const encoding = options?.encoding;
    const content = 'mock file content';
    return Promise.resolve(encoding ? content : Buffer.from(content));
  }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockImplementation((path) => {
    // Create mock Dirent objects
    const createDirent = (name, isDir = false) => {
      const dirent = new Dirent();
      dirent.name = name;
      dirent.isDirectory = () => isDir;
      dirent.isFile = () => !isDir;
      dirent.isSymbolicLink = () => false;
      dirent.isBlockDevice = () => false;
      dirent.isCharacterDevice = () => false;
      dirent.isFIFO = () => false;
      dirent.isSocket = () => false;
      return dirent;
    };

    return Promise.resolve([
      createDirent('mock-file-1.txt'),
      createDirent('mock-file-2.txt'),
      createDirent('mock-dir', true)
    ]);
  }),

  // File/directory manipulation methods
  unlink: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  rename: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),

  // Constants
  constants: {
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    F_OK: 0,
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4
  }
});

/**
 * Create a mock implementation for keytar
 */
const createKeytarMock = () => ({
  getPassword: jest.fn().mockResolvedValue('mock-password'),
  setPassword: jest.fn().mockResolvedValue(undefined),
  deletePassword: jest.fn().mockResolvedValue(true),
  findCredentials: jest.fn().mockResolvedValue([
    { account: 'mock-account', password: 'mock-password' }
  ])
});

/**
 * Create a mock implementation for path
 */
const createPathMock = () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    // Override specific methods for testing
    join: jest.fn().mockImplementation((...args) => args.join('/')),
    resolve: jest.fn().mockImplementation((...args) => args.join('/')),
    dirname: jest.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/')),
    basename: jest.fn().mockImplementation((p) => p.split('/').pop()),
    extname: jest.fn().mockImplementation((p) => {
      const parts = p.split('.');
      return parts.length > 1 ? `.${parts.pop()}` : '';
    })
  };
};

/**
 * Create a mock implementation for os
 */
const createOsMock = () => ({
  homedir: jest.fn().mockReturnValue('/mock/home/dir'),
  platform: jest.fn().mockReturnValue('mock-platform'),
  tmpdir: jest.fn().mockReturnValue('/mock/tmp/dir'),
  EOL: '\n',
  cpus: jest.fn().mockReturnValue([{ model: 'Mock CPU', speed: 2000 }])
});

// Create mocks
const fsMock = createFsMock();
const keytarMock = createKeytarMock();
const pathMock = createPathMock();
const osMock = createOsMock();

// Patch Node.js modules
jest.unstable_mockModule('node:fs/promises', () => fsMock);
jest.unstable_mockModule('fs/promises', () => fsMock);
jest.unstable_mockModule('keytar', () => keytarMock);
jest.unstable_mockModule('node:path', () => pathMock);
jest.unstable_mockModule('path', () => pathMock);
jest.unstable_mockModule('node:os', () => osMock);
jest.unstable_mockModule('os', () => osMock);

// Store mocks in global registry for easy access in tests
global.__mocks__.fs = fsMock;
global.__mocks__.keytar = keytarMock;
global.__mocks__.path = pathMock;
global.__mocks__.os = osMock;

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

// Optional: Log when Jest setup is complete
console.log('Jest setup complete: Node.js core modules have been patched');

// Note: You need to update jest.config.js to use this setup file:
// ```
// export default {
//   setupFilesAfterEnv: ['./tests/jest.setup.js'],
//   // other config
// };
// ```