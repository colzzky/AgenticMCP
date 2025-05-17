import type { FileSystemTool } from '../fileSystemTool';
import type {
  CreateDirectoryArgs, CreateDirectoryResult, ListDirectoryArgs, ListDirectoryResult,
  DeleteDirectoryArgs, DeleteDirectoryResult, DirectoryTreeArgs, DirectoryTreeResult,
  DirectoryTreeEntry, GetFileInfoArgs, GetFileInfoResult
} from '../../../../core/types/cli.types';

export async function createDirectory(
  tool: FileSystemTool,
  args: CreateDirectoryArgs
): Promise<CreateDirectoryResult> {
  const target = tool._resolveAndValidatePath(args.path);
  try {
    await tool._fileSystem.mkdir(target, { recursive: true });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteDirectory(
  tool: FileSystemTool,
  args: DeleteDirectoryArgs
): Promise<DeleteDirectoryResult> {
  const target = tool._resolveAndValidatePath(args.path);
  try {
    await tool._fileSystem.access(target);
    const stats = await tool._fileSystem.stat(target);
    if (!stats.isDirectory()) return { success: false };
    await tool._fileSystem.rmdir(target, { recursive: true, force: true });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function listDirectory(
  tool: FileSystemTool,
  args: ListDirectoryArgs
): Promise<ListDirectoryResult> {
  const rel = args.path || '.';
  const target = tool._resolveAndValidatePath(rel);
  try {
    const entries = [] as ListDirectoryResult['entries'];
    const items = await tool._fileSystem.readdir(target);
    for (const itemName of items) {
      if (itemName.startsWith('.')) continue;
      const itemPath = tool._pathDI.join(target, itemName);
      const stat = await tool._fileSystem.stat(itemPath);
      entries.push({
        name: tool._pathDI.relative(tool._baseDir, itemPath),
        type: stat.isDirectory() ? 'directory' : 'file'
      });
    }
    return { entries };
  } catch {
    return { entries: [] };
  }
}

export async function getDirectoryTree(
  tool: FileSystemTool,
  args: DirectoryTreeArgs
): Promise<DirectoryTreeResult> {
  async function buildTree(currentPath: string, currentName: string): Promise<DirectoryTreeEntry> {
    const validPath = await tool._resolveAndValidatePath(currentPath);
    const stats = await tool._fileSystem.stat(validPath);
    const entry: DirectoryTreeEntry = {
      name: currentName,
      type: stats.isDirectory() ? 'directory' : 'file'
    };
    if (stats.isDirectory()) {
      const items = await tool._fileSystem.readdir(validPath);
      entry.children = await Promise.all(
        items.filter(n => !n.startsWith('.')).map(name => {
          const itemPath = tool._pathDI.join(currentPath, name);
          return buildTree(itemPath, name);
        })
      );
    }
    return entry;
  }
  const targetPath = tool._resolveAndValidatePath(args.path);
  const baseName = tool._pathDI.basename(targetPath);
  const treeData = await buildTree(targetPath, baseName);
  return { tree: JSON.stringify(treeData, undefined, 2) };
}

export async function getFileInfo(
  tool: FileSystemTool,
  args: GetFileInfoArgs
): Promise<GetFileInfoResult> {
  const validPath = tool._resolveAndValidatePath(args.path);
  const stats = await tool._fileSystem.stat(validPath);
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    permissions: stats.mode?.toString(8).slice(-3) || '644',
    path: args.path
  };
}
