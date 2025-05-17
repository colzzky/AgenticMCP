import type { FileSystemTool } from '../fileSystemTool';
import type {
  WriteFileArgs, WriteFileResult, EditFileArgs, EditFileResult, ReadFileArgs, ReadFileResult,
  DeleteFileArgs, DeleteFileResult, ReadMultipleFilesArgs, ReadMultipleFilesResult
} from '../../../../core/types/cli.types';
import { applyFileEdits } from '../helpers/editHelpers';

export async function writeFile(
  tool: FileSystemTool,
  args: WriteFileArgs
): Promise<WriteFileResult> {
  const target = tool._resolveAndValidatePath(args.path);
  try {
    await tool._fileSystem.writeFile(target, args.content, "utf-8");
    return { success: true, content: args.content, message: "File written successfully" };
  } catch {
    return { success: false, content: "", message: "Failed to write file" };
  }
}

export async function editFile(
  tool: FileSystemTool,
  args: EditFileArgs
): Promise<EditFileResult> {
  const target = tool._resolveAndValidatePath(args.path);
  const allowOverwrite = args.allowOverwrite ?? tool._allowFileOverwrite;
  try {
    await tool._fileSystem.mkdir(tool._pathDI.dirname(target), { recursive: true });
    let existingContent = '';
    let fileExists = false;
    try {
      await tool._fileSystem.access(target);
      const stats = await tool._fileSystem.stat(target);
      if (stats.isDirectory()) {
        return { success: false, message: `Path is a directory, not a file: ${args.path}` };
      }
      fileExists = true;
      existingContent = await tool._fileSystem.readFile(target, 'utf8');
      if (!allowOverwrite) {
        tool._logger.warn(`File exists at ${args.path} and allowOverwrite is false`);
        return {
          success: false,
          fileExists: true,
          existingContent,
          message: "File exists and allowOverwrite is false. Set allowOverwrite to true to proceed."
        };
      }
    } catch { /* File doesn't exist, fine */ }

    const validPath = await tool._resolveAndValidatePath(args.path);
    const result = await applyFileEdits(tool, validPath, args.edits, args.dryRun);

    return { success: true, diff: result, message: "File edited successfully" };
  } catch (error) {
    tool._logger.error(`Error writing file ${args.path}: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, message: `Error writing file: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function readFile(
  tool: FileSystemTool,
  args: ReadFileArgs
): Promise<ReadFileResult> {
  const target = tool._resolveAndValidatePath(args.path);
  try {
    const content = await tool._fileSystem.readFile(target, 'utf8');
    return { content };
  } catch {
    return { content: '' };
  }
}

export async function deleteFile(
  tool: FileSystemTool,
  args: DeleteFileArgs
): Promise<DeleteFileResult> {
  const target = tool._resolveAndValidatePath(args.path);
  try {
    await tool._fileSystem.unlink(target);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function readMultipleFiles(
  tool: FileSystemTool,
  args: ReadMultipleFilesArgs
): Promise<ReadMultipleFilesResult> {
  const results = await Promise.all(
    args.paths.map(async (filePath: string) => {
      try {
        const validPath = await tool._resolveAndValidatePath(filePath);
        const content = await tool._fileSystem.readFile(validPath, "utf-8");
        return `<file>\n<file_path>${filePath}<file_path>:\n<file_contents>${content}<file_contents>\n<file>`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `${filePath}: Error - ${errorMessage}`;
      }
    }),
  );
  return {
    content: "Here's the contents of all files read - each file is wrapped in <file> tags, with the file path in <file_path> and the file contents in <file_contents>:\n\n" + results.join("\n\n"),
  };
}
