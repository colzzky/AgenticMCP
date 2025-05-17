import os from 'node:os';
import type { FileSystemTool } from '../fileSystemTool';

// Expands ~ and ensures the path is absolute, then normalizes and checks for baseDir security.
export function expandHome(tool: FileSystemTool, filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return tool._pathDI.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export function resolveAndValidatePath(tool: FileSystemTool, rel: string): string {
  const resolved = tool._pathDI.resolve(tool._baseDir, rel);
  if (!resolved.startsWith(tool._baseDir + tool._pathDI.sep) && resolved !== tool._baseDir) {
    throw new Error(`Access denied: Path '${rel}' is outside of baseDir.`);
  }
  return resolved;
}
