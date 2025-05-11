import { jest } from '@jest/globals';
import { FileContextManager } from '../../src/context';
import type { ContextSource, ContextItem, ContextProcessor } from '../../src/core/types/context.types';

// Mock node modules before importing
jest.mock('node:fs/promises');
jest.mock('node:path');
jest.mock('minimatch');

describe('FileContextManager', () => {
  let manager: FileContextManager;

  beforeEach(() => {
    jest.resetAllMocks();
    manager = new FileContextManager();
  });

  test('should properly instantiate', () => {
    expect(manager).toBeDefined();
    expect(manager).toBeInstanceOf(FileContextManager);
  });

  test('should initialize with empty sources and items', async () => {
    const items = await manager.getContextItems();
    expect(items).toEqual([]);
  });

  test('should implement required interface methods', () => {
    expect(typeof manager.addSource).toBe('function');
    expect(typeof manager.addProcessor).toBe('function');
    expect(typeof manager.loadContext).toBe('function');
    expect(typeof manager.getContextItems).toBe('function');
    expect(typeof manager.getContextItemById).toBe('function');
    expect(typeof manager.clearContext).toBe('function');
    expect(typeof manager.getTotalTokens).toBe('function');
  });

  test('should clear context', async () => {
    // Add any mock items to the manager
    (manager as any).items = [{ id: 'test1', content: 'test content', type: 'text' }];
    
    // Clear context
    await manager.clearContext();
    
    // Check that items are cleared
    const items = await manager.getContextItems();
    expect(items).toEqual([]);
  });
});
