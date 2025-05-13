/**
 * @file Test for ConfigManager module import
 */

import { jest, describe, it, expect } from '@jest/globals';

// Mock path dependency
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock all dependencies
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockRejectedValue({ code: 'ENOENT' }),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('node:path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
}));

jest.mock('env-paths', () => jest.fn(() => ({
  config: '/mock/path/config'
})));

// Manually mock credential manager
jest.mock('../../../src/core/credentials/credentialManager', () => ({
  CredentialManager: {
    getSecret: jest.fn().mockResolvedValue('mock-api-key')
  }
}));

// Import after mocking
import { ConfigManager } from '../../../src/core/config/configManager';

describe('ConfigManager import', () => {
  it('should import ConfigManager without error', () => {
    expect(ConfigManager).toBeDefined();
    expect(typeof ConfigManager).toBe('function');
  });
});