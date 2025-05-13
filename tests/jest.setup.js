/**
 * @file Jest setup file for patching Node.js modules and global mocks
 */

// Import Jest
import { jest } from '@jest/globals';
import { Stats, Dirent } from 'node:fs';
import { mock } from 'jest-mock-extended';

// Create global mock registry
globalThis.__mocks__ = {};

/**
 * Create a mock implementation for fs/promises
 * This includes all commonly used methods and properties
 */
const createFsMock = () => ({
  // File access methods
  access: jest.fn().mockResolvedValue(),

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
  writeFile: jest.fn().mockResolvedValue(),
  appendFile: jest.fn().mockResolvedValue(),
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
  unlink: jest.fn().mockResolvedValue(),
  mkdir: jest.fn().mockResolvedValue(),
  rmdir: jest.fn().mockResolvedValue(),
  rm: jest.fn().mockResolvedValue(),
  rename: jest.fn().mockResolvedValue(),
  copyFile: jest.fn().mockResolvedValue(),

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
  setPassword: jest.fn().mockResolvedValue(),
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
    join: jest.fn().mockImplementation((...arguments_) => arguments_.join('/')),
    resolve: jest.fn().mockImplementation((...arguments_) => arguments_.join('/')),
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

/**
 * Create a mock implementation for @google/genai
 */
const createGoogleGenAIMock = () => {
  // Create mock response objects
  const mockChatGenerateContentResponse = {
    candidates: [{ content: { parts: [{ text: 'This is a mock response from Gemini AI' }], role: 'model' } }],
    text: 'This is a mock response from Gemini AI',
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 }
  };

  // Create mock chat session
  const mockChatSession = {
    sendMessage: jest.fn().mockResolvedValue(mockChatGenerateContentResponse)
  };

  // Create mock model
  const mockGenerativeModel = {
    generateContent: jest.fn().mockReturnValue({
      response: Promise.resolve(mockChatGenerateContentResponse)
    }),
    startChat: jest.fn().mockReturnValue(mockChatSession)
  };

  // Create mock models API
  const mockModelsAPI = {
    get: jest.fn().mockReturnValue(mockGenerativeModel)
  };

  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: mockModelsAPI
    })),
    HarmCategory: { HARM_CATEGORY_HARASSMENT: 'harassment' },
    HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: 'medium' }
  };
};

// Create mocks
const fsMock = createFsMock();
const keytarMock = createKeytarMock();
const pathMock = createPathMock();
// Create a type-safe mock for node:os
const osMock = mock<typeof import('node:os')>(createOsMock());

const googleGenAIMock = createGoogleGenAIMock();

// Patch Node.js modules
jest.unstable_mockModule('node:fs/promises', () => fsMock);
jest.unstable_mockModule('fs/promises', () => fsMock);
jest.unstable_mockModule('keytar', () => keytarMock);
jest.unstable_mockModule('node:path', () => pathMock);
jest.unstable_mockModule('path', () => pathMock);
jest.unstable_mockModule('node:os', () => ({ ...osMock, default: osMock }));
jest.unstable_mockModule('os', () => ({ ...osMock, default: osMock }));
jest.unstable_mockModule('@google/genai', () => googleGenAIMock);

// Store mocks in global registry for easy access in tests
globalThis.__mocks__ = {
  fs: fsMock,
  keytar: keytarMock,
  path: pathMock,
  os: osMock,
  googleGenAI: googleGenAIMock
};

// Helper function for accessing mocks from tests
globalThis.getMock = (name) => globalThis.__mocks__[name];

// Reset all mocks before each test
beforeEach(() => {
  // Reset all registered mocks
  for (const mock of Object.values(globalThis.__mocks__)) {
    for (const function_ of Object.values(mock)) {
      if (typeof function_ === 'function' && typeof function_.mockReset === 'function') {
        function_.mockReset();
      }
    }
  }
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