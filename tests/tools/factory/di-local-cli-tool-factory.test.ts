/**
 * Unit tests for LocalCliToolFactory
 * Tests the factory for creating LocalCliTool instances 
 */
import { describe, it, expect } from '@jest/globals';

// We'll do very basic verification of the file existence and exports
// This avoids issues with deep mocking of dependencies
describe('localCliToolFactory', () => {
  it('should exist as a module', async () => {
    // We can dynamically import the module to check it exists
    // without executing the actual functions
    const module = await import('../../../src/tools/factory/localCliToolFactory.js');
    expect(module).toBeDefined();
  });
  
  it('should export createFileSystemTool function', async () => {
    const module = await import('../../../src/tools/factory/localCliToolFactory.js');
    expect(typeof module.createFileSystemTool).toBe('function');
  });
  
  it('should have proper parameter requirements', async () => {
    const module = await import('../../../src/tools/factory/localCliToolFactory.js');
    
    // Verify function signature to ensure it requires config
    const functionString = module.createFileSystemTool.toString();
    
    // The function should have config as first parameter
    expect(functionString).toMatch(/function createFileSystemTool\(\s*config/);
    
    // It should accept an optional container parameter
    expect(functionString).toMatch(/config.*,?\s*container\s*=\s*DIContainer\.getInstance\(\)/);
  });
});