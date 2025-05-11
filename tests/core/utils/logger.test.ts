import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as logger from '@/core/utils';
jest.mock('@/core/utils');

describe('Logger Utility', () => {
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;
  let originalDebugEnv: string | undefined;
  let originalAgenticMCPDebugEnv: string | undefined;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Backup and clear debug environment variables
    originalDebugEnv = process.env.DEBUG;
    originalAgenticMCPDebugEnv = process.env.AGENTICMCP_DEBUG;
    delete process.env.DEBUG;
    delete process.env.AGENTICMCP_DEBUG;

    // Reset log level to a known default for consistent testing
    // logger.setLogLevel is available via the re-export in src/core/utils/index.ts
    logger.setLogLevel('info');
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Restore debug environment variables
    process.env.DEBUG = originalDebugEnv;
    process.env.AGENTICMCP_DEBUG = originalAgenticMCPDebugEnv;
  });

  it('should log info messages correctly', () => {
    const message = 'Test info message';
    logger.info(message);
    expect(consoleLogSpy).toHaveBeenCalledWith(`[INFO] ${message}`);
  });

  it('should log warn messages correctly', () => {
    const message = 'Test warn message';
    logger.warn(message);
    expect(consoleWarnSpy).toHaveBeenCalledWith(`[WARN] ${message}`);
  });

  it('should log error messages correctly', () => {
    const message = 'Test error message';
    logger.error(message);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`[ERROR] ${message}`);
  });

  describe('debug logging', () => {
    const message = 'Test debug message';

    it('should not log debug messages by default', () => {
      logger.debug(message);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug messages when process.env.DEBUG is "true"', () => {
      process.env.DEBUG = 'true';
      logger.debug(message);
      expect(consoleLogSpy).toHaveBeenCalledWith(`[DEBUG] ${message}`);
    });

    it('should log debug messages when process.env.AGENTICMCP_DEBUG is "true"', () => {
      process.env.AGENTICMCP_DEBUG = 'true';
      logger.debug(message);
      expect(consoleLogSpy).toHaveBeenCalledWith(`[DEBUG] ${message}`);
    });

    it('should not log debug messages if DEBUG is other than "true"', () => {
      process.env.DEBUG = 'false';
      logger.debug(message);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setLogLevel function', () => {
    // Note: The current logger's info/warn/error/debug functions do not yet use the internal
    // currentLogLevel to filter messages. These tests primarily check if setLogLevel itself works.

    it('should allow setting a valid log level (e.g., "debug") without throwing', () => {
      expect(() => logger.setLogLevel('debug')).not.toThrow();
    });

    it('should log an error when setting an invalid log level', () => {
      const invalidLevel = 'invalid_level';
      logger.setLogLevel(invalidLevel);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`[ERROR] Invalid log level: ${invalidLevel}`);
    });
  });
});
