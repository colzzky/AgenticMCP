// src/tools/localShellCliToolDefinitions.ts

export const SHELL_COMMANDS = [
  "ls", "pwd", "cd", "clear", "exit", "history", "man", "alias", "unalias",
  "cat", "less", "more", "head", "tail", "wc",
  "stat", "file", "readlink", "realpath", "basename", "dirname", "lsattr", "getfacl",
  "find", "locate", "which", "whereis", "type",
  "grep", "sed", "awk", "cut", "tr", "sort", "uniq", "paste", "column", "nl", "yes"
] as const;

type ShellCommandName = typeof SHELL_COMMANDS[number];

export function getLocalShellCliToolDefinitions() {
  const descriptions: Record<string, string> = {
    ls: `List directory contents. Usage: ls -l /path/to/dir. When to use: To see files and folders in a directory, including details like permissions and size.`,
    pwd: `Print the current working directory. Usage: pwd. When to use: To find out the absolute path of your current location in the filesystem.`,
    cd: `Change the current directory. Usage: cd /path/to/dir. When to use: To navigate to a different folder before running file operations.`,
    clear: `Clear the terminal screen. Usage: clear. When to use: To reset the terminal display for better readability.`,
    exit: `Exit the shell session. Usage: exit. When to use: To safely close the current shell or script.`,
    history: `Show command history. Usage: history. When to use: To review or repeat previously executed commands.`,
    man: `Display the manual for a command. Usage: man grep. When to use: To read detailed documentation and usage options for a command.`,
    alias: `Create a shortcut for a command. Usage: alias ll='ls -l'. When to use: To define custom short commands for convenience.`,
    unalias: `Remove a defined alias. Usage: unalias ll. When to use: To delete a custom command shortcut.`,
    cat: `Concatenate and display file contents. Usage: cat file.txt. When to use: To quickly view the full contents of a file.`,
    less: `View file contents page by page. Usage: less file.txt. When to use: To scroll through large files interactively.`,
    more: `View file contents page by page (simpler than less). Usage: more file.txt. When to use: To page through files one screen at a time.`,
    head: `Show the first lines of a file. Usage: head -n 10 file.txt. When to use: To preview the start of a file.`,
    tail: `Show the last lines of a file. Usage: tail -n 10 file.txt. When to use: To preview the end of a file or monitor logs in real time.`,
    wc: `Count lines, words, or bytes in files. Usage: wc -l file.txt. When to use: To measure the number of lines, words, or characters in a file.`,
    stat: `Display file or filesystem status. Usage: stat file.txt. When to use: To inspect metadata such as size, permissions, and modification time.`,
    file: `Determine file type. Usage: file file.txt. When to use: To check what kind of data a file contains (text, binary, image, etc.).`, 
    readlink: `Print the value of a symbolic link. Usage: readlink symlink. When to use: To resolve the target of a symlink.`,
    realpath: `Display the absolute path of a file. Usage: realpath file.txt. When to use: To resolve relative paths or symlinks to their canonical location.`,
    basename: `Show the filename portion of a path. Usage: basename /path/to/file.txt. When to use: To extract the file name from a path.`,
    dirname: `Show the directory portion of a path. Usage: dirname /path/to/file.txt. When to use: To extract the directory path from a full file path.`,
    lsattr: `List file attributes on a Linux file system. Usage: lsattr file.txt. When to use: To inspect special file attributes like immutable or append-only.`,
    getfacl: `Get file access control lists. Usage: getfacl file.txt. When to use: To examine advanced permissions beyond standard Unix modes.`,
    find: `Search for files and directories. Usage: find . -name "*.js". When to use: To locate files by name, type, or other attributes recursively.`,
    locate: `Find files by name using a database. Usage: locate filename.txt. When to use: To quickly search for files anywhere on the system.`,
    which: `Show the full path of shell commands. Usage: which python. When to use: To determine where a command's executable is located.`,
    whereis: `Locate the binary, source, and man page for a command. Usage: whereis ls. When to use: To find all locations related to a command.`,
    type: `Describe how a command name is interpreted. Usage: type ls. When to use: To check if a command is a shell builtin, alias, or external executable.`,
    grep: `Search for patterns in files. Usage: grep -n "searchString" filename.txt. When to use: To find lines matching a pattern, with line numbers for inspection.`,
    sed: `Stream editor for filtering and transforming text. Usage: echo "hello world" | sed 's/world/user/'. When to use: To safely search and replace text in streams or files (avoid -i for safety).`,
    awk: `Pattern scanning and text processing language. Usage: echo "apple" | awk '{gsub("apple","orange"); print}'. When to use: For advanced field extraction, transformation, or reporting on text data.`,
    cut: `Remove sections from each line of files. Usage: cut -d: -f1 /etc/passwd. When to use: To extract columns or fields from structured text.`,
    tr: `Translate or delete characters. Usage: echo "hello" | tr 'a-z' 'A-Z'. When to use: To perform character-level transformations.`,
    sort: `Sort lines of text files. Usage: sort file.txt. When to use: To order lines alphabetically or numerically.`,
    uniq: `Report or omit repeated lines. Usage: sort file.txt | uniq. When to use: To filter out duplicate lines from sorted input.`,
    paste: `Merge lines of files. Usage: paste file1.txt file2.txt. When to use: To combine corresponding lines from multiple files.`,
    column: `Format text into columns. Usage: column -t file.txt. When to use: To create a well-aligned tabular display from plain text.`,
    nl: `Number lines of files. Usage: nl file.txt. When to use: To add line numbers to each line of a file.`,
    yes: `Output a string repeatedly until killed. Usage: yes | head -n 5. When to use: To generate repeated input for testing or scripting.`
  };

  return SHELL_COMMANDS.map((cmd) => ({
    type: 'function',
    name: cmd,
    description: descriptions[cmd] || `Run the '${cmd}' shell command (read-only, safe)`,
    parameters: {
      type: 'object',
      properties: {
        args: {
          type: 'array',
          items: { type: 'string' },
          description: `Arguments for the '${cmd}' command`
        }
      },
      required: []
    }
  }));
}
