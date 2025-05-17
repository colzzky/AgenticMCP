/**
 * Unit tests for DIContainer
 * Tests the dependency injection container functionality
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DIContainer } from '../../../src/core/di/container.js';
import { DI_TOKENS } from '../../../src/core/di/tokens.js';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    // Get a fresh container instance for each test
    container = DIContainer.getInstance();
    container.clear(); // Clear any existing dependencies
  });

  afterEach(() => {
    // Clean up after each test
    container.clear();
  });

  describe('Singleton Pattern', () => {
    it('should always return the same instance', () => {
      // Get multiple instances and verify they are the same
      const instance1 = DIContainer.getInstance();
      const instance2 = DIContainer.getInstance();
      const instance3 = DIContainer.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(instance3);
    });
  });

  describe('register and get', () => {
    it('should register and retrieve a dependency', () => {
      // Arrange
      const mockDependency = { value: 'test-dependency' };
      
      // Act
      container.register(DI_TOKENS.LOGGER, mockDependency);
      const retrieved = container.get(DI_TOKENS.LOGGER);
      
      // Assert
      expect(retrieved).toBe(mockDependency);
    });

    it('should throw an error when getting an unregistered dependency', () => {
      // Act & Assert
      expect(() => {
        container.get(DI_TOKENS.LOGGER);
      }).toThrow(/Dependency not found/);
    });

    it('should override a previously registered dependency', () => {
      // Arrange
      const initialDependency = { value: 'initial' };
      const newDependency = { value: 'new' };
      
      // Act
      container.register(DI_TOKENS.LOGGER, initialDependency);
      container.register(DI_TOKENS.LOGGER, newDependency);
      const retrieved = container.get(DI_TOKENS.LOGGER);
      
      // Assert
      expect(retrieved).toBe(newDependency);
      expect(retrieved).not.toBe(initialDependency);
    });
  });

  describe('registerSingleton and getSingleton', () => {
    it('should create singleton instances lazily', () => {
      // Arrange
      const mockFactorySpy = (jest.fn() as any).mockReturnValue({ value: 'singleton-value' });
      
      // Act - Register but don't get yet
      container.registerSingleton(DI_TOKENS.FILE_SYSTEM, mockFactorySpy);
      
      // Assert - Factory shouldn't be called until requested
      expect(mockFactorySpy).not.toHaveBeenCalled();
    });

    it('should create singleton only once', () => {
      // Arrange
      const mockFactorySpy = (jest.fn() as any).mockReturnValue({ value: 'singleton-value' });
      
      // Act
      container.registerSingleton(DI_TOKENS.FILE_SYSTEM, mockFactorySpy);
      const instance1 = container.getSingleton(DI_TOKENS.FILE_SYSTEM);
      const instance2 = container.getSingleton(DI_TOKENS.FILE_SYSTEM);
      const instance3 = container.getSingleton(DI_TOKENS.FILE_SYSTEM);
      
      // Assert
      expect(mockFactorySpy).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should throw error when getting unregistered singleton', () => {
      // Act & Assert
      expect(() => {
        container.getSingleton(DI_TOKENS.FILE_SYSTEM);
      }).toThrow(/Singleton not registered/);
    });
  });

  describe('clear', () => {
    it('should remove all registered dependencies', () => {
      // Arrange
      container.register(DI_TOKENS.LOGGER, { value: 'test-logger' });
      container.register(DI_TOKENS.CONFIG_MANAGER, { value: 'test-config' });
      
      // Act
      container.clear();
      
      // Assert
      expect(() => container.get(DI_TOKENS.LOGGER)).toThrow(/Dependency not found/);
      expect(() => container.get(DI_TOKENS.CONFIG_MANAGER)).toThrow(/Dependency not found/);
    });

    it('should remove all registered singletons', () => {
      // Arrange
      const mockFactory = (jest.fn() as any).mockReturnValue({ value: 'singleton-value' });
      container.registerSingleton(DI_TOKENS.FILE_SYSTEM, mockFactory);
      container.getSingleton(DI_TOKENS.FILE_SYSTEM); // Initialize the singleton
      
      // Act
      container.clear();
      
      // Assert
      expect(() => container.getSingleton(DI_TOKENS.FILE_SYSTEM)).toThrow(/Singleton not registered/);
    });
  });
});