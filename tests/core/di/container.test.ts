/**
 * @file Tests for DI container
 */

import { jest } from '@jest/globals';
import { DIContainer } from '../../../src/core/di/container';

describe('DIContainer', () => {
  // Test dependencies
  const TEST_TOKEN = 'test:token';
  const TEST_SINGLETON_TOKEN = 'test:singleton';
  const TEST_VALUE = { value: 'test' };
  
  let container: DIContainer;
  
  beforeEach(() => {
    // Get a fresh container for each test
    container = DIContainer.getInstance();
    container.clear();
  });
  
  afterEach(() => {
    // Clean up
    container.clear();
  });

  describe('getInstance', () => {
    it('should always return the same instance', () => {
      const instance1 = DIContainer.getInstance();
      const instance2 = DIContainer.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('register & get', () => {
    it('should register and retrieve dependencies', () => {
      container.register(TEST_TOKEN, TEST_VALUE);
      
      const result = container.get(TEST_TOKEN);
      
      expect(result).toBe(TEST_VALUE);
    });

    it('should throw error when retrieving unregistered dependency', () => {
      expect(() => container.get('unknown:token')).toThrow('Dependency not found');
    });
  });

  describe('registerSingleton & getSingleton', () => {
    it('should register and create singleton on first access', () => {
      // Mock factory function
      const mockFactory = jest.fn().mockReturnValue(TEST_VALUE);
      
      container.registerSingleton(TEST_SINGLETON_TOKEN, mockFactory);
      
      // Factory should not be called yet
      expect(mockFactory).not.toHaveBeenCalled();
      
      // Get singleton which should trigger factory
      const result = container.getSingleton(TEST_SINGLETON_TOKEN);
      
      expect(result).toBe(TEST_VALUE);
      expect(mockFactory).toHaveBeenCalledTimes(1);
      
      // Get singleton again - should not call factory again
      const result2 = container.getSingleton(TEST_SINGLETON_TOKEN);
      
      expect(result2).toBe(TEST_VALUE);
      expect(mockFactory).toHaveBeenCalledTimes(1);
    });

    it('should throw error when retrieving unregistered singleton', () => {
      expect(() => container.getSingleton('unknown:singleton')).toThrow('Singleton not registered');
    });
  });

  describe('clear', () => {
    it('should remove all registered dependencies and singletons', () => {
      container.register(TEST_TOKEN, TEST_VALUE);
      container.registerSingleton(TEST_SINGLETON_TOKEN, () => TEST_VALUE);
      
      // Trigger singleton creation
      container.getSingleton(TEST_SINGLETON_TOKEN);
      
      // Clear everything
      container.clear();
      
      // Both should now throw
      expect(() => container.get(TEST_TOKEN)).toThrow('Dependency not found');
      expect(() => container.getSingleton(TEST_SINGLETON_TOKEN)).toThrow('Singleton not registered');
    });
  });

  describe('singleton lifecycle', () => {
    it('should create singleton only when requested', () => {
      // Mock factory function
      const mockFactory = jest.fn().mockReturnValue(TEST_VALUE);
      
      container.registerSingleton(TEST_SINGLETON_TOKEN, mockFactory);
      
      // Factory should not be called yet
      expect(mockFactory).not.toHaveBeenCalled();
      
      // Now get using regular get
      const result = container.get(TEST_SINGLETON_TOKEN);
      
      // Should return the factory itself, not call it
      expect(result).toBe(mockFactory);
      expect(mockFactory).not.toHaveBeenCalled();
      
      // Now get using getSingleton
      const singleton = container.getSingleton(TEST_SINGLETON_TOKEN);
      
      // Should now call factory and return its result
      expect(singleton).toBe(TEST_VALUE);
      expect(mockFactory).toHaveBeenCalledTimes(1);
    });
  });
});