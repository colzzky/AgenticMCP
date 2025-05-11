import { describe, it, expect } from '@jest/globals';
import { ConfigManager } from '../../../src/core/config/configManager';

describe('ConfigManager import', () => {
  it('should import ConfigManager without error', () => {
    expect(ConfigManager).toBeDefined();
    expect(typeof ConfigManager).toBe('function');
  });
});
