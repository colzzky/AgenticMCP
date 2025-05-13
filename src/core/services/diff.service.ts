/**
 * @file Concrete implementation of IDiffService using the 'diff' library
 */

import { IDiffService } from '../interfaces/diff-service.interface';
import * as diff from 'diff';

// Removed: Not using DI decorators currently
export class DiffService implements IDiffService {
  /**
   * Generates a Git-style diff patch between two strings.
   * @param oldContent - The original content.
   * @param newContent - The modified content.
   * @returns A string representing the diff in patch format.
   */
  generateDiff(oldContent: string, newContent: string): string {
    // Create a patch
    // The first two arguments are filenames (can be placeholders)
    // The next two are the old and new content
    // The last two are optional headers (can be empty)
    const patch = diff.createPatch('file', oldContent, newContent, '', '');
    return patch;
  }
}
