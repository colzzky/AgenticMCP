import { DiffService } from '../services/diff-service';

/**
 * Generates a GitHub-style diff between two strings
 * @deprecated Use DiffService.generateDiff() instead for dependency injection support
 * @param oldContent Original file content or empty string for new files
 * @param newContent New file content
 * @returns Formatted diff string in GitHub-style
 */
export function generateGitHubStyleDiff(oldContent: string, newContent: string): string {
  // Create a singleton instance of DiffService to reuse functionality
  const diffService = new DiffService();
  return diffService.generateDiff(oldContent, newContent);
}