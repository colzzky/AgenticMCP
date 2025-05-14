/**
 * @fileoverview Tests for the DiffService class.
 * This approach focuses on testing the actual functionality rather than mocking the diff library.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DiffService } from '../../../src/core/services/diff.service.js';

describe('DiffService', () => {
  let diffService: DiffService;
  
  beforeEach(() => {
    // Create a fresh DiffService instance for each test
    diffService = new DiffService();
  });
  
  describe('generateDiff', () => {
    it('should generate a patch diff between two strings', () => {
      // Arrange
      const oldContent = 'Hello world';
      const newContent = 'Hello, world!';
      
      // Act
      const result = diffService.generateDiff(oldContent, newContent);
      
      // Assert - check for expected patch format and content
      expect(result).toContain('Index: file');
      expect(result).toContain('===');
      expect(result).toContain('--- file');
      expect(result).toContain('+++ file');
      expect(result).toContain('@@ ');
      expect(result).toContain('-Hello world');
      expect(result).toContain('+Hello, world!');
    });
    
    it('should handle empty old content (new file scenario)', () => {
      // Arrange
      const oldContent = '';
      const newContent = 'New file content';
      
      // Act
      const result = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(result).toContain('Index: file');
      expect(result).toContain('===');
      expect(result).toContain('--- file');
      expect(result).toContain('+++ file');
      expect(result).toContain('@@ ');
      expect(result).toContain('+New file content');
    });
    
    it('should handle empty new content (file deletion scenario)', () => {
      // Arrange
      const oldContent = 'File to be deleted';
      const newContent = '';
      
      // Act
      const result = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(result).toContain('Index: file');
      expect(result).toContain('===');
      expect(result).toContain('--- file');
      expect(result).toContain('+++ file');
      expect(result).toContain('@@ ');
      expect(result).toContain('-File to be deleted');
    });
    
    it('should handle multiline content', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nModified line\nLine 3\nLine 4';
      
      // Act
      const result = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(result).toContain('Index: file');
      expect(result).toContain('===');
      expect(result).toContain('--- file');
      expect(result).toContain('+++ file');
      expect(result).toContain('@@ ');
      expect(result).toContain('-Line 2');
      expect(result).toContain('+Modified line');
      expect(result).toContain('+Line 4');
    });
    
    it('should handle identical content with minimal diff output', () => {
      // Arrange
      const content = 'Identical content';
      
      // Act
      const result = diffService.generateDiff(content, content);
      
      // Assert
      expect(result).toContain('Index: file');
      expect(result).toContain('===');
      // No actual changes should be shown in the diff
      expect(result).not.toContain('-Identical content');
      expect(result).not.toContain('+Identical content');
    });
    
    it('should properly format complex diffs', () => {
      // Arrange
      const oldContent = `function test() {
  console.log("Hello");
  return true;
}`;
      const newContent = `function test() {
  console.log("Hello, world!");
  const x = 42;
  return x > 0;
}`;
      
      // Act
      const result = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(result).toContain('Index: file');
      expect(result).toContain('===');
      expect(result).toContain('-  console.log("Hello");');
      expect(result).toContain('+  console.log("Hello, world!");');
      expect(result).toContain('+  const x = 42;');
      expect(result).toContain('-  return true;');
      expect(result).toContain('+  return x > 0;');
    });
  });
});