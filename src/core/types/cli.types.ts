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
