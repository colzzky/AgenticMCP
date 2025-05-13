/**
 * @file Tests for logger utility
 */

import { jest } from '@jest/globals';
import { logger } from '../../../src/core/utils/logger';

describe('Logger', () => {
  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset mocks
    jest.resetModules();
    
    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Reset env vars
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    
    // Restore env vars
    process.env = originalEnv;
  });

  describe('info', () => {
    it('should log message with INFO prefix', () => {
      const message = 'This is an info message';
      
      logger.info(message);
      
      expect(console.log).toHaveBeenCalledWith(`[INFO] ${message}`);
    });
  });

  describe('warn', () => {
    it('should log message with WARN prefix', () => {
      const message = 'This is a warning message';
      
      logger.warn(message);
      
      expect(console.warn).toHaveBeenCalledWith(`[WARN] ${message}`);
    });
  });

  describe('error', () => {
    it('should log message with ERROR prefix', () => {
      const message = 'This is an error message';
      
      logger.error(message);
      
      expect(console.error).toHaveBeenCalledWith(`[ERROR] ${message}`);
    });
  });

  describe('debug', () => {
    it('should not log debug message when DEBUG is not set', () => {
      const message = 'This is a debug message';
      
      logger.debug(message);
      
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should log debug message when DEBUG=true', () => {
      process.env.DEBUG = 'true';
      
      const message = 'This is a debug message';
      
      logger.debug(message);
      
      expect(console.log).toHaveBeenCalledWith(`[DEBUG] ${message}`);
    });

    it('should log debug message when AGENTICMCP_DEBUG=true', () => {
      process.env.AGENTICMCP_DEBUG = 'true';
      
      const message = 'This is a debug message';
      
      logger.debug(message);
      
      expect(console.log).toHaveBeenCalledWith(`[DEBUG] ${message}`);
    });
  });

  describe('setLogLevel', () => {
    it('should set valid log level', () => {
      // Mock error function to check it's not called
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(jest.fn());
      
      logger.setLogLevel('warn');
      
      expect(errorSpy).not.toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });

    it('should log error for invalid log level', () => {
      // Mock error function to check it's called
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(jest.fn());
      
      logger.setLogLevel('invalid');
      
      expect(errorSpy).toHaveBeenCalledWith('Invalid log level: invalid');
      
      errorSpy.mockRestore();
    });
  });
});