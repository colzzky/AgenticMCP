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
export interface ReadFileArgs { path: string; }
export interface DeleteFileArgs { path: string; }
export interface DeleteDirectoryArgs { path: string; }
export interface ListDirectoryArgs { path: string; }
export interface SearchCodebaseArgs { query: string; recursive?: boolean; }
export interface FindFilesArgs { pattern: string; recursive?: boolean; }

export interface ListDirectoryResult { entries: DirectoryEntry[]; }
export interface ReadFileResult { content: string; }
export interface WriteFileResult { 
  success: boolean;
  existingContent?: string;
  fileExists?: boolean;
  message?: string;
}
export interface CreateDirectoryResult { success: boolean; }
export interface DeleteFileResult { success: boolean; }
export interface DeleteDirectoryResult { success: boolean; }
export interface SearchCodebaseResult { results: FileSearchResult[]; }
export interface FindFilesResult { files: string[]; }

export type CommandHandler<Args, Result> = (args: Args) => Promise<Result>;

export interface LocalCliCommandMap {
  create_directory: CommandHandler<CreateDirectoryArgs, CreateDirectoryResult>;
  write_file: CommandHandler<WriteFileArgs, WriteFileResult>;
  read_file: CommandHandler<ReadFileArgs, ReadFileResult>;
  delete_file: CommandHandler<DeleteFileArgs, DeleteFileResult>;
  delete_directory: CommandHandler<DeleteDirectoryArgs, DeleteDirectoryResult>;
  list_directory: CommandHandler<ListDirectoryArgs, ListDirectoryResult>;
  search_codebase: CommandHandler<SearchCodebaseArgs, SearchCodebaseResult>;
  find_files: CommandHandler<FindFilesArgs, FindFilesResult>;
}