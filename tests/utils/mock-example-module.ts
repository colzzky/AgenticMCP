/**
 * @file Example module used to demonstrate mocking in tests
 * This module is a simplified representation of modules that would be mocked in your actual tests
 */

// Import fs/promises module (this will be mocked in tests)
import * as fs from 'node:fs/promises';

// Import keytar module (this will be mocked in tests)
import * as keytar from 'keytar';

/**
 * Reads a text file from the file system
 * @param filePath Path to the file to read
 * @returns The file contents as a string
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, { encoding: 'utf-8' });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Writes text to a file
 * @param filePath Path to the file to write
 * @param content Content to write to the file
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Gets a credential from the system keychain
 * @param service Service name
 * @param account Account name
 * @returns The credential value or undefined if not found
 */
export async function getCredential(service: string, account: string): Promise<string | null> {
  try {
    return await keytar.getPassword(service, account);
  } catch (error) {
    console.error(`Error retrieving credential for ${account} under ${service}:`, error);
    return null;
  }
}

/**
 * Sets a credential in the system keychain
 * @param service Service name
 * @param account Account name
 * @param password Password or secret to store
 */
export async function setCredential(service: string, account: string, password: string): Promise<void> {
  try {
    await keytar.setPassword(service, account, password);
    console.log(`Credential set for ${account} under ${service}`);
  } catch (error) {
    console.error(`Error setting credential for ${account} under ${service}:`, error);
    throw error;
  }
}