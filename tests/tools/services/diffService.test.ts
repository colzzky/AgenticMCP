import { describe, it, expect, beforeEach } from '@jest/globals';
import { DiffService } from '../../../src/tools/services/diffService.js';

describe('DiffService', () => {
  let diffService: DiffService;
  
  beforeEach(() => {
    diffService = new DiffService();
  });
  
  describe('generateDiff', () => {
    it('should generate a basic diff with addition', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 2\nLine 3\nLine 4';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain('--- old');
      expect(diff).toContain('+++ new');
      expect(diff).toContain('@@');
      expect(diff).toContain('+Line 4');
    });
    
    it('should generate a basic diff with removal', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 3';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain('--- old');
      expect(diff).toContain('+++ new');
      expect(diff).toContain('@@');
      expect(diff).toContain('-Line 2');
    });
    
    it('should generate a diff with modifications', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nModified Line\nLine 3';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain('--- old');
      expect(diff).toContain('+++ new');
      expect(diff).toContain('@@');
      expect(diff).toContain('-Line 2');
      expect(diff).toContain('+Modified Line');
    });
    
    it('should handle empty old content (new file)', () => {
      // Arrange
      const oldContent = '';
      const newContent = 'Line 1\nLine 2\nLine 3';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain('--- old');
      expect(diff).toContain('+++ new');
      expect(diff).toContain('@@');
      expect(diff).toContain('+Line 1');
      expect(diff).toContain('+Line 2');
      expect(diff).toContain('+Line 3');
    });
    
    it('should handle empty new content (file deletion)', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = '';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain('--- old');
      expect(diff).toContain('+++ new');
      expect(diff).toContain('@@');
      expect(diff).toContain('-Line 1');
      expect(diff).toContain('-Line 2');
      expect(diff).toContain('-Line 3');
    });
    
    it('should not show changes for identical content', () => {
      // Arrange
      const content = 'Line 1\nLine 2\nLine 3';
      
      // Act
      const diff = diffService.generateDiff(content, content);
      
      // Assert
      expect(diff).toContain('--- old');
      expect(diff).toContain('+++ new');
      expect(diff).not.toContain('-Line');
      expect(diff).not.toContain('+Line');
    });
    
    it('should show context around changes', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
      const newContent = 'Line 1\nLine 2\nChanged Line\nLine 4\nLine 5\nLine 6';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain(' Line 1');
      expect(diff).toContain(' Line 2');
      expect(diff).toContain('-Line 3');
      expect(diff).toContain('+Changed Line');
      expect(diff).toContain(' Line 4');
      expect(diff).toContain(' Line 5');
    });
    
    it('should handle multiple changes in different areas', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8';
      const newContent = 'Line 1\nModified 2\nLine 3\nLine 4\nLine 5\nModified 6\nLine 7\nLine 8';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain('-Line 2');
      expect(diff).toContain('+Modified 2');
      expect(diff).toContain('-Line 6');
      expect(diff).toContain('+Modified 6');
    });
    
    it('should format chunk headers correctly', () => {
      // Arrange
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nChanged\nLine 3';
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      // Check that the chunk header format matches @@ -X,Y +X,Y @@
      expect(diff).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/);
    });
    
    it('should handle large files with many unchanged lines', () => {
      // Arrange
      const oldLines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      const newLines = [...oldLines]; // Clone the array
      
      // Change only one line in the middle
      newLines[50] = 'Modified Line';
      
      const oldContent = oldLines.join('\n');
      const newContent = newLines.join('\n');
      
      // Act
      const diff = diffService.generateDiff(oldContent, newContent);
      
      // Assert
      expect(diff).toContain('-Line 51');
      expect(diff).toContain('+Modified Line');
      expect(diff).toContain(' ...'); // Should include ellipsis for large unchanged sections
    });
  });
});