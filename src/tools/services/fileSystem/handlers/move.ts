import type { FileSystemTool } from '../fileSystemTool';
import type { MoveFileArgs, MoveFileResult } from '../../../../core/types/cli.types';

export async function moveFile(
  tool: FileSystemTool,
  args: MoveFileArgs
): Promise<MoveFileResult> {
  const validSourcePath = await tool._resolveAndValidatePath(args.source);
  const validDestPath = await tool._resolveAndValidatePath(args.destination);
  await tool._fileSystem.rename(validSourcePath, validDestPath);
  return {
    success: true,
    message: `Successfully moved ${args.source} to ${args.destination}`,
  };
}
