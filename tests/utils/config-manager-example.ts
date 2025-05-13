/**
 * @file Example ConfigManager that demonstrates interactions with file system and keychain
 * This is a simplified example used to showcase mocking both fs/promises and keytar
 */

import * as fs from 'node:fs/promises';
import * as keytar from 'keytar';

// Config interface
interface Config {
  apiKey: string;
}

/**
 * ConfigManager that handles loading/saving configuration with secrets
 * For secrets, it uses placeholders in the config file and stores actual values in the keychain
 */
export class ConfigManager {
  // Constants
  private readonly SERVICE_NAME = 'AgenticMCP-test';
  private readonly ACCOUNT_NAME = 'test-account';
  private readonly API_KEY_PLACEHOLDER = 'API_KEY_PLACEHOLDER';
  
  /**
   * Loads config from a file, replacing placeholders with actual secrets from keychain
   * If the file doesn't exist, creates a default config
   */
  async loadConfig(filePath: string): Promise<Config> {
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Read config file
      const configStr = await fs.readFile(filePath, { encoding: 'utf-8' });
      const config = JSON.parse(configStr) as Config;
      
      // Replace placeholder with actual API key from keychain if it's a placeholder
      if (config.apiKey === this.API_KEY_PLACEHOLDER) {
        const apiKey = await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
        
        if (apiKey) {
          config.apiKey = apiKey;
        } else {
          console.warn(`No API key found in keychain for ${this.ACCOUNT_NAME}`);
        }
      }
      
      return config;
    } catch (error) {
      // If file doesn't exist, create default config
      console.info(`Config file not found at ${filePath}, creating default config`);
      
      // Try to get API key from keychain
      let apiKey = await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
      
      // Use placeholder if no key in keychain
      if (!apiKey) {
        apiKey = this.API_KEY_PLACEHOLDER;
        console.warn(`No API key found in keychain for ${this.ACCOUNT_NAME}`);
      }
      
      // Create default config
      const defaultConfig: Config = {
        apiKey
      };
      
      // Write default config to file (with placeholder)
      const configToWrite: Config = {
        ...defaultConfig,
        apiKey: this.API_KEY_PLACEHOLDER
      };
      
      await fs.writeFile(filePath, JSON.stringify(configToWrite, null, 2));
      
      return defaultConfig;
    }
  }
  
  /**
   * Saves config to a file, replacing actual secrets with placeholders
   * and storing the actual values in the keychain
   */
  async saveConfig(filePath: string, config: Config): Promise<void> {
    try {
      // Store API key in keychain if it's not a placeholder
      if (config.apiKey !== this.API_KEY_PLACEHOLDER) {
        try {
          await keytar.setPassword(this.SERVICE_NAME, this.ACCOUNT_NAME, config.apiKey);
          console.info(`Stored API key in keychain for ${this.ACCOUNT_NAME}`);
        } catch (error) {
          console.error(`Failed to store API key in keychain:`, error);
          throw new Error('Failed to store secret in keychain');
        }
      }
      
      // Write config to file with placeholder instead of actual API key
      const configToWrite: Config = {
        ...config,
        apiKey: this.API_KEY_PLACEHOLDER
      };
      
      await fs.writeFile(filePath, JSON.stringify(configToWrite, null, 2));
      console.info(`Config saved to ${filePath}`);
    } catch (error) {
      console.error(`Failed to save config to ${filePath}:`, error);
      throw error;
    }
  }
}