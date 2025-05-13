/**
 * @file Test for ConfigManager module import
 */

import { jest, describe, it, expect } from '@jest/globals';
import { setupNodeOsMock, setupLoggerMock } from '../../utils/node-module-mock';

// Declare dynamically imported module
let ConfigManager: typeof import('../../../src/core/config/configManager').ConfigManager;

// Setup mocks
const mockLogger = setupLoggerMock();
const mockOs = setupNodeOsMock();

// Setup module imports and mocks
beforeAll(async () => {
  // Register mocks
  jest.unstable_mockModule('node:os', () => mockOs);
  jest.unstable_mockModule('../../../src/core/utils/logger', () => mockLogger);

  // Import module after mocking
  const configManagerModule = await import('../../../src/core/config/configManager');
  ConfigManager = configManagerModule.ConfigManager;
});

describe('ConfigManager import', () => {
  it('should import ConfigManager without error', () => {
    expect(ConfigManager).toBeDefined();
    expect(typeof ConfigManager).toBe('function');
  });
});
