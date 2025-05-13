/**
 * Interface for diff service that generates GitHub-style diffs between strings
 */
export interface IDiffService {
  /**
   * Generates a GitHub-style diff between old and new content
   * @param oldContent Original content (empty string for new files)
   * @param newContent New content
   * @returns Formatted diff string in GitHub-style
   */
  generateDiff(oldContent: string, newContent: string): string;
}