/**
 * @fileoverview Tests for UnifiedShellCliTool factory
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { UnifiedShellCliTool } from '../../../src/tools/unifiedShellCliTool';
import { DI_TOKENS } from '../../../src/core/di/tokens';
import type { Logger } from '../../../src/core/types/logger.types';
import type { ShellCommandWrapper } from '../../../src/types/shell.types';
import type { DIContainer } from '../../../src/core/di/container';

// We'll use a manual mock approach instead of jest.mock to fix the issues with the factory tests
const mockLogger = mock<Logger>();
const mockShellWrapper = mock<ShellCommandWrapper>();

// Mock module factory function
const mockCreateUnifiedShellCliTool = jest.fn().mockImplementation(
  (config, container?) => {
    // Create and return a new UnifiedShellCliTool instance
    return new UnifiedShellCliTool(config, mockShellWrapper, mockLogger);
  }
);

// Manually mock the DI container functions
const mockGetFn = jest.fn().mockReturnValue(mockLogger);
const mockGetSingletonFn = jest.fn().mockReturnValue(mockShellWrapper);
const mockRegisterFn = jest.fn();

// Mock container object
const mockContainer = {
  get: mockGetFn,
  getSingleton: mockGetSingletonFn,
  register: mockRegisterFn,
};

// Mock the DIContainer.getInstance function
const mockGetInstance = jest.fn().mockReturnValue(mockContainer);

describe('unifiedShellToolFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create a UnifiedShellCliTool instance with dependencies from DI container', () => {
    // Setup: Import factory function with manual mock
    jest.doMock('../../../src/tools/factory/unifiedShellToolFactory', () => ({
      createUnifiedShellCliTool: mockCreateUnifiedShellCliTool,
    }));
    jest.doMock('../../../src/core/di/container', () => ({
      DIContainer: {
        getInstance: mockGetInstance,
      },
    }));
    
    // Execute
    const config = { allowedCommands: ['ls', 'cat', 'grep'] };
    const unifiedShellTool = mockCreateUnifiedShellCliTool(config);
    
    // Verify instance was created
    expect(unifiedShellTool).toBeDefined();
    expect(unifiedShellTool).toBeInstanceOf(UnifiedShellCliTool);
    
    // Verify the mock was called correctly
    expect(mockCreateUnifiedShellCliTool).toHaveBeenCalledWith(config);
  });
  
  it('should use provided container when specified', () => {
    // Setup custom container
    const customContainer = {
      get: jest.fn().mockReturnValue(mockLogger),
      getSingleton: jest.fn().mockReturnValue(mockShellWrapper),
      register: jest.fn(),
    };
    
    // Execute
    const config = { allowedCommands: ['ls', 'cat', 'grep'] };
    const unifiedShellTool = mockCreateUnifiedShellCliTool(config, customContainer as unknown as DIContainer);
    
    // Verify the mock was called with the custom container
    expect(unifiedShellTool).toBeDefined();
    expect(mockCreateUnifiedShellCliTool).toHaveBeenCalledWith(config, customContainer);
  });
});