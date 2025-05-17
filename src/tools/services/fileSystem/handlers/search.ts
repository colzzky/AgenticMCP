import { Minimatch } from 'minimatch';
import type { FileSystemTool } from '../fileSystemTool';
import type { SearchCodebaseArgs, SearchCodebaseResult, FileSearchResult, FindFilesArgs, FindFilesResult } from '../../../../core/types/cli.types';

export async function searchCodebase(
  tool: FileSystemTool,
  args: SearchCodebaseArgs
): Promise<SearchCodebaseResult> {
  const results: FileSearchResult[] = [];
  const regex = new RegExp(args.query, 'i');
  const maxResults = 50;
  const recursive = args.recursive ?? false;

  const walk = async (dir: string) => {
    try {
      const items = await tool._fileSystem.readdir(dir);
      for (const itemName of items) {
        if (results.length >= maxResults) return;
        const itemPath = tool._pathDI.join(dir, itemName);
        const stat = await tool._fileSystem.stat(itemPath);
        if (stat.isDirectory()) {
          if (recursive) await walk(itemPath);
        } else {
          try {
            const content = await tool._fileSystem.readFile(itemPath, 'utf8');
            const lines = content.split(/\r?\n/);
            for (const [i, lineRaw] of lines.entries()) {
              if (regex.test(lineRaw)) {
                let line = lineRaw.trim();
                if (line.length > 200) line = line.slice(0, 197) + '...';
                results.push({
                  file: tool._pathDI.relative(tool._baseDir, itemPath),
                  line_number: i + 1,
                  line_content: line,
                });
                if (results.length >= maxResults) return;
              }
            }
          } catch {/* skip unreadable */}
        }
      }
    } catch {/* skip unreadable */}
  };

  await walk(tool._baseDir);
  return { results };
}

export async function findFiles(
  tool: FileSystemTool,
  args: FindFilesArgs
): Promise<FindFilesResult> {
  const results: string[] = [];
  const recursive = args.recursive ?? true;
  const matcher = new Minimatch(args.pattern);
  const excludePatterns = args.exclude?.map(pattern => new Minimatch(pattern)) || [];
  const walk = async (dir: string) => {
    try {
      const items = await tool._fileSystem.readdir(dir);
      for (const itemName of items) {
        const itemPath = tool._pathDI.join(dir, itemName);
        const relativePath = tool._pathDI.relative(tool._baseDir, itemPath);
        if (excludePatterns.some(pattern => pattern.match(relativePath))) continue;
        const stat = await tool._fileSystem.stat(itemPath);
        if (stat.isDirectory() && recursive) {
          await walk(itemPath);
        } else if (!stat.isDirectory() && matcher.match(itemName)) {
          results.push(relativePath);
        }
      }
    } catch {/* skip */}
  };
  await walk(tool._baseDir);
  return { files: results };
}
