import type { FileSystemTool } from '../fileSystemTool';

export async function applyFileEdits(
  tool: FileSystemTool,
  filePath: string,
  edits: Array<{ oldText: string, newText: string }>,
  dryRun = false
): Promise<string> {
  const content = tool._diffService.normalizeLineEndings(
    await tool._fileSystem.readFile(filePath, 'utf-8')
  );
  let modifiedContent = content;
  for (const edit of edits) {
    const normalizedOld = tool._diffService.normalizeLineEndings(edit.oldText);
    const normalizedNew = tool._diffService.normalizeLineEndings(edit.newText);
    if (modifiedContent.includes(normalizedOld)) {
      modifiedContent = modifiedContent.replace(normalizedOld, normalizedNew);
      continue;
    }
    // ... rest of your fuzzy line-by-line matching logic (can copy from your original)
    throw new Error(`Could not find exact match for edit:\n${edit.oldText}`);
  }
  const diff = tool._diffService.createUnifiedDiff(content, modifiedContent, filePath);
  let numBackticks = 3;
  while (diff.includes('`'.repeat(numBackticks))) numBackticks++;
  const formattedDiff = `${'`'.repeat(numBackticks)}diff\n${diff}${'`'.repeat(numBackticks)}\n\n`;
  if (!dryRun) {
    await tool._fileSystem.writeFile(filePath, modifiedContent, 'utf-8');
  }
  return formattedDiff;
}
