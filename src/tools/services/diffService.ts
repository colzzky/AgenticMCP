import { diffLines, createTwoFilesPatch } from 'diff';
import { IDiffService } from '../../core/interfaces/diff-service.interface';

/**
 * Service that generates GitHub-style diffs between file versions
 */
export class DiffService implements IDiffService {
  /**
   * Generates a GitHub-style diff between old and new content
   * @param oldContent Original content (empty string for new files)
   * @param newContent New content
   * @returns Formatted diff string in GitHub-style
   */
  public generateDiff(oldContent: string, newContent: string): string {
    const changes = diffLines(oldContent, newContent);
    let oldLine = 1, newLine = 1;
    let result = `--- old\n+++ new\n`;

    // Create chunks with context
    const chunks: Array<{
      oldStart: number,
      oldLines: number,
      newStart: number,
      newLines: number,
      content: string
    }> = [];

    let currentChunk = {
      oldStart: 1,
      oldLines: 0,
      newStart: 1,
      newLines: 0,
      content: ''
    };

    for (const change of changes) {
      const lines = change.value.split('\n');
      // Remove trailing empty line if present
      if (lines.at(-1) === '') lines.pop();

      if (change.added) {
        // For new chunk or continuing a chunk with additions
        if (currentChunk.content === '') {
          currentChunk.oldStart = oldLine;
          currentChunk.newStart = newLine;
        }

        currentChunk.newLines += lines.length;
        for (const line of lines) {
          currentChunk.content += `+${line}\n`;
        }
        newLine += lines.length;
      } else if (change.removed) {
        // For new chunk or continuing a chunk with removals
        if (currentChunk.content === '') {
          currentChunk.oldStart = oldLine;
          currentChunk.newStart = newLine;
        }

        currentChunk.oldLines += lines.length;
        for (const line of lines) {
          currentChunk.content += `-${line}\n`;
        }
        oldLine += lines.length;
      } else {
        // Context lines - if we have changes, finalize the chunk
        if (currentChunk.content && (currentChunk.oldLines > 0 || currentChunk.newLines > 0)) {
          // Add 3 lines of context before starting a new chunk
          const contextLines = Math.min(3, lines.length);
          for (let i = 0; i < contextLines; i++) {
            if (i < lines.length) {
              currentChunk.content += ` ${lines[i]}\n`;
              currentChunk.oldLines++;
              currentChunk.newLines++;
            }
          }

          chunks.push({ ...currentChunk });

          // Start a new chunk, but first add trailing context from this unchanged section
          const trailingContextStart = Math.max(0, lines.length - 3);

          currentChunk = {
            oldStart: oldLine + trailingContextStart,
            oldLines: 0,
            newStart: newLine + trailingContextStart,
            newLines: 0,
            content: ''
          };

          // Add trailing context to the new chunk
          for (let i = trailingContextStart; i < lines.length; i++) {
            currentChunk.content += ` ${lines[i]}\n`;
            currentChunk.oldLines++;
            currentChunk.newLines++;
          }
        } else {
          // For completely unchanged content or first context lines
          if (currentChunk.content === '') {
            currentChunk.oldStart = oldLine;
            currentChunk.newStart = newLine;
          }

          // Only include context lines if they're at the beginning or end (3 lines max)
          const contextLines = Math.min(3, lines.length);
          for (let i = 0; i < contextLines; i++) {
            if (i < lines.length) {
              currentChunk.content += ` ${lines[i]}\n`;
              currentChunk.oldLines++;
              currentChunk.newLines++;
            }
          }

          // If there are more unchanged lines than our context limit, add ellipsis
          if (lines.length > 2 * contextLines) {
            currentChunk.content += ` ...\n`;

            // Add trailing context
            for (let i = lines.length - contextLines; i < lines.length; i++) {
              if (i >= 0) {
                currentChunk.content += ` ${lines[i]}\n`;
                currentChunk.oldLines++;
                currentChunk.newLines++;
              }
            }
          } else {
            // If the unchanged section is small, include all lines
            for (let i = contextLines; i < lines.length; i++) {
              currentChunk.content += ` ${lines[i]}\n`;
              currentChunk.oldLines++;
              currentChunk.newLines++;
            }
          }
        }

        oldLine += lines.length;
        newLine += lines.length;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.content && (currentChunk.oldLines > 0 || currentChunk.newLines > 0)) {
      chunks.push(currentChunk);
    }

    // Format output with chunk headers
    for (const chunk of chunks) {
      result += `@@ -${chunk.oldStart},${chunk.oldLines} +${chunk.newStart},${chunk.newLines} @@\n`;
      result += chunk.content;
    }

    return result;
  }

  normalizeLineEndings(text: string): string {
    // Use regex-based replace as a replacement for replaceAll
    return text.replaceAll('\r\n', '\n');
  }

  createUnifiedDiff(originalContent: string, newContent: string, filepath: string = 'file'): string {
    // Ensure consistent line endings for diff
    const normalizedOriginal = this.normalizeLineEndings(originalContent);
    const normalizedNew = this.normalizeLineEndings(newContent);

    return createTwoFilesPatch(
      filepath,
      filepath,
      normalizedOriginal,
      normalizedNew,
      'original',
      'modified'
    );
  }

}