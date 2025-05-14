/**
 * Tests for command decorators
 */
import { describe, it, expect } from '@jest/globals';
import { CommandHandler, AgentCommand, CommandParam } from '../../../src/core/commands/decorators.js';

describe('Command Decorators', () => {
  describe('CommandHandler', () => {
    it('should be a function', () => {
      expect(typeof CommandHandler).toBe('function');
    });

    it('should return a method decorator', () => {
      // Create a test class
      class TestClass {
        @CommandHandler({ name: 'test' })
        testMethod() {
          return true;
        }
      }

      // Create an instance and check if the method works
      const instance = new TestClass();
      expect(instance.testMethod()).toBe(true);
    });

    it('should accept a string parameter', () => {
      // Create a test class
      class TestClass {
        @CommandHandler('test')
        testMethod() {
          return true;
        }
      }

      // Create an instance and check if the method works
      const instance = new TestClass();
      expect(instance.testMethod()).toBe(true);
    });
  });

  describe('AgentCommand', () => {
    it('should be a function', () => {
      expect(typeof AgentCommand).toBe('function');
    });

    it('should return a class decorator', () => {
      // Create a test class with the decorator
      @AgentCommand({ name: 'TestCommand' })
      class TestClass {
        test() {
          return true;
        }
      }

      // Create an instance and check if it works
      const instance = new TestClass();
      expect(instance.test()).toBe(true);
    });
  });

  describe('CommandParam', () => {
    it('should be a function', () => {
      expect(typeof CommandParam).toBe('function');
    });

    it('should return a parameter decorator', () => {
      // Create a test class with a method using the parameter decorator
      class TestClass {
        testMethod(@CommandParam({ name: 'param1' }) param1: string) {
          return param1;
        }
      }

      // Create an instance and check if the method works
      const instance = new TestClass();
      expect(instance.testMethod('test')).toBe('test');
    });
  });
});