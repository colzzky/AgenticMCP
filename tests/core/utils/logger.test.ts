import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { logger, setLogLevel } from '../../../src/core/utils/logger.js';

describe('Logger', () => {
  // Save original console methods
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // Mock console methods before each test
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });
  
  afterEach(() => {
    // Restore console methods after each test
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    
    // Reset environment variables
    delete process.env.DEBUG;
    delete process.env.AGENTICMCP_DEBUG;
  });
  
  describe('Logger interface implementation', () => {
    it('should implement the Logger interface correctly', () => {
      // Assert
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('setLogLevel');
      
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.setLogLevel).toBe('function');
    });
  });
  
  describe('info()', () => {
    it('should log an info message to console.log', () => {
      // Act
      logger.info('Test info message');
      
      // Assert
      expect(console.log).toHaveBeenCalledWith('[INFO] Test info message');
    });
  });
  
  describe('warn()', () => {
    it('should log a warning message to console.warn', () => {
      // Act
      logger.warn('Test warning message');
      
      // Assert
      expect(console.warn).toHaveBeenCalledWith('[WARN] Test warning message');
    });
  });
  
  describe('error()', () => {
    it('should log an error message to console.error', () => {
      // Act
      logger.error('Test error message');
      
      // Assert
      expect(console.error).toHaveBeenCalledWith('[ERROR] Test error message');
    });
  });
  
  describe('debug()', () => {
    it('should not log debug messages when DEBUG environment variable is not set', () => {
      // Arrange
      process.env.DEBUG = undefined;
      process.env.AGENTICMCP_DEBUG = undefined;
      
      // Act
      logger.debug('Test debug message');
      
      // Assert
      expect(console.log).not.toHaveBeenCalled();
    });
    
    it('should log debug messages when DEBUG=true', () => {
      // Arrange
      process.env.DEBUG = 'true';
      
      // Act
      logger.debug('Test debug message with DEBUG=true');
      
      // Assert
      expect(console.log).toHaveBeenCalledWith('[DEBUG] Test debug message with DEBUG=true');
    });
    
    it('should log debug messages when AGENTICMCP_DEBUG=true', () => {
      // Arrange
      process.env.AGENTICMCP_DEBUG = 'true';
      
      // Act
      logger.debug('Test debug message with AGENTICMCP_DEBUG=true');
      
      // Assert
      expect(console.log).toHaveBeenCalledWith('[DEBUG] Test debug message with AGENTICMCP_DEBUG=true');
    });
  });
  
  describe('setLogLevel()', () => {
    it('should update the log level when a valid level is provided', () => {
      // Use a spy to check if the error function is called
      const errorSpy = jest.spyOn(logger, 'error');
      
      // Act
      logger.setLogLevel('debug');
      
      // Assert
      expect(errorSpy).not.toHaveBeenCalled();
    });
    
    it('should log an error when an invalid log level is provided', () => {
      // Act
      logger.setLogLevel('invalid_level');
      
      // Assert
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid log level'));
    });
  });
});