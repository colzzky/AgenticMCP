// Types extracted from localCliTool.ts to reduce line count and fix max-lines lint error

export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
}

export interface FileSearchResult {
  file: string;
  line_number: number;
  line_content: string;
}

// --- LocalCliTool Command Argument/Result Types ---
export interface CreateDirectoryArgs { path: string; }
export interface WriteFileArgs { path: string; content: string; allowOverwrite?: boolean; }
export interface EditFileArgs { path: string; edits: { oldText: string; newText: string }[]; dryRun?: boolean; allowOverwrite?: boolean; }
export interface MoveFileArgs { source: string; destination: string; }
export interface ReadFileArgs { path: string; }
export interface DeleteFileArgs { path: string; }
export interface DeleteDirectoryArgs { path: string; }
export interface ListDirectoryArgs { path: string; }
export interface SearchCodebaseArgs { query: string; recursive?: boolean; }
export interface FindFilesArgs { pattern: string; recursive?: boolean; exclude?: string[]; }
export interface DirectoryTreeArgs { path: string; }
export interface GetFileInfoArgs { path: string; }
export interface GetFileInfoResult {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: string;
  path: string;
}
export interface MoveFileResult {
  success: boolean;
  message?: string;
}

export interface ListDirectoryResult { entries: DirectoryEntry[]; }
export interface ReadFileResult { content: string; }
export interface WriteFileResult {
  success: boolean;
  content?: string;
  fileExists?: boolean;
  message?: string;
}
export interface EditFileResult {
  success: boolean;
  existingContent?: string;
  fileExists?: boolean;
  message?: string;
  diff?: string; // GitHub-style diff showing changes made to the file
}

export interface DirectoryTreeEntry {
  name: string;
  type: 'file' | 'directory';
  children?: DirectoryTreeEntry[];
}

export interface DirectoryTreeResult { tree: string; }

export interface CreateDirectoryResult { success: boolean; }
export interface DeleteFileResult { success: boolean; }
export interface DeleteDirectoryResult { success: boolean; }
export interface SearchCodebaseResult { results: FileSearchResult[]; }
export interface FindFilesResult { files: string[]; }

export type CommandHandler<Args, Result> = (args: Args) => Promise<Result>;

export interface ReadMultipleFilesArgs { paths: string[]; }
export interface ReadMultipleFilesResult { content: string; }

export interface LocalCliCommandMap {
  create_directory: CommandHandler<CreateDirectoryArgs, CreateDirectoryResult>;
  get_directory_tree: CommandHandler<DirectoryTreeArgs, DirectoryTreeResult>;
  write_file: CommandHandler<WriteFileArgs, WriteFileResult>;
  get_file_info: CommandHandler<GetFileInfoArgs, GetFileInfoResult>;
  edit_file: CommandHandler<EditFileArgs, EditFileResult>;
  move_file: CommandHandler<MoveFileArgs, MoveFileResult>;
  read_file: CommandHandler<ReadFileArgs, ReadFileResult>;
  read_multiple_files: CommandHandler<ReadMultipleFilesArgs, ReadMultipleFilesResult>;
  delete_file: CommandHandler<DeleteFileArgs, DeleteFileResult>;
  delete_directory: CommandHandler<DeleteDirectoryArgs, DeleteDirectoryResult>;
  list_directory: CommandHandler<ListDirectoryArgs, ListDirectoryResult>;
  search_codebase: CommandHandler<SearchCodebaseArgs, SearchCodebaseResult>;
  find_files: CommandHandler<FindFilesArgs, FindFilesResult>;
}