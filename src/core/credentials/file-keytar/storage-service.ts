import fs from 'node:fs/promises';
import path from 'node:path';
import { StorageService } from './interfaces';

/**
 * Implements file-based storage for encrypted credentials
 */
export class FileStorageService implements StorageService {
  private filePath: string;
  
  /**
   * Creates a new file storage service
   * @param directory - The directory to store the credentials file in
   * @param filename - The name of the credentials file
   */
  constructor(directory: string, filename: string = 'credentials.enc') {
    this.filePath = path.join(directory, filename);
  }

  /**
   * Ensures the storage directory exists
   * @returns A Promise that resolves when the directory exists or is created
   */
  async ensureStorageDirectory(): Promise<void> {
    const directory = path.dirname(this.filePath);
    try {
      await fs.mkdir(directory, { recursive: true });
    } catch (error) {
      throw new Error(`Could not create storage directory: ${(error as Error).message}`);
    }
  }

  /**
   * Reads encrypted data from the storage file
   * @returns A Promise that resolves to the file contents, or undefined if the file doesn't exist
   */
  async read(): Promise<string | undefined> {
    try {
      await this.ensureStorageDirectory();
      const data = await fs.readFile(this.filePath, 'utf8');
      return data;
    } catch (error) {
      // If file doesn't exist yet, that's not an error
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      // Other errors should be reported
      throw new Error(`Error reading storage file: ${(error as Error).message}`);
    }
  }

  /**
   * Writes encrypted data to the storage file
   * @param data - The encrypted data to write
   * @returns A Promise that resolves when the write is complete
   */
  async write(data: string): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      
      // Set proper file permissions (readable/writable only by the owner)
      // This is important for security
      const fileHandle = await fs.open(this.filePath, 'w', 0o600);
      await fileHandle.writeFile(data, 'utf8');
      await fileHandle.close();
    } catch (error) {
      throw new Error(`Error writing to storage file: ${(error as Error).message}`);
    }
  }
}