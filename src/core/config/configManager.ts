/**
 * @file Manages application configuration, including loading, saving, and providing defaults.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import envPaths from 'env-paths';
import { AppConfig, ProviderSpecificConfig } from '../types'; 
import { CredentialManager } from '../credentials'; 
import { CredentialIdentifier } from '../types/credentials.types'; 

const APP_NAME = 'agenticmcp';
const CONFIG_FILE_NAME = 'config.json';

/**
 * Manages the application's configuration.
 */
class ConfigManager {
  private configPath: string;
  private config: AppConfig | null = null;

  constructor(appName: string = APP_NAME) {
    const paths = envPaths(appName, { suffix: '' });
    this.configPath = path.join(paths.config, CONFIG_FILE_NAME);
  }

  /**
   * Ensures the configuration directory exists.
   */
  private async ensureConfigDirectory(): Promise<void> {
    const dir = path.dirname(this.configPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        console.error(`Failed to create config directory at ${dir}:`, error);
        throw error;
      }
    }
  }

  /**
   * Loads the configuration from the file system.
   * If the config file doesn't exist, it initializes with default settings and creates the file.
   * @returns {Promise<AppConfig>} The loaded or default configuration.
   */
  public async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    await this.ensureConfigDirectory();

    try {
      const fileContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(fileContent) as AppConfig;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`Config file not found at ${this.configPath}. Initializing with defaults.`);
        this.config = this.getDefaults();
        await this.saveConfig();
      } else {
        console.error(`Error reading config file ${this.configPath}:`, error);
        this.config = this.getDefaults();
      }
    }
    return this.config as AppConfig;
  }

  /**
   * Saves the current configuration to the file system.
   * @param newConfig Optional: If provided, this configuration will be saved. Otherwise, the current in-memory config is saved.
   * @returns {Promise<void>}
   */
  public async saveConfig(newConfig?: AppConfig): Promise<void> {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig }; // Merge newConfig into current config
    }
    if (!this.config) {
      console.warn('No configuration to save. Load or initialize defaults first.');
      return;
    }
    await this.ensureConfigDirectory();
    try {
      const fileContent = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, fileContent, 'utf-8');
      console.log(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      console.error(`Error saving config file ${this.configPath}:`, error);
      throw error;
    }
  }

  /**
   * Gets a specific configuration value by key.
   * Loads config if not already loaded.
   * @param key The key of the configuration value to retrieve.
   * @returns {Promise<AppConfig[K] | undefined>} The configuration value, or undefined if not found.
   */
  public async get<K extends keyof AppConfig>(key: K): Promise<AppConfig[K] | undefined> {
    if (!this.config) {
      await this.loadConfig();
    }
    // Ensure config is not null before accessing its properties
    return this.config ? this.config[key] : undefined;
  }

  /**
   * Sets a specific configuration value by key and saves the configuration.
   * Loads config if not already loaded.
   * @param key The key of the configuration value to set.
   * @param value The value to set.
   * @returns {Promise<void>}
   */
  public async set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }
    // Ensure config is not null before modifying and saving
    if (this.config) {
        this.config[key] = value;
        await this.saveConfig();
    } else {
        console.error('Configuration could not be loaded or initialized. Set operation failed.');
        // In a real app, might throw an error here
    }
  }

  /**
   * Retrieves a provider's specific configuration.
   * Loads config if not already loaded.
   * @param providerType The type of the provider (e.g., 'openai').
   * @returns {Promise<ProviderSpecificConfig | undefined>} The provider's configuration, or undefined if not found.
   */
  public async getProviderConfig(providerType: string): Promise<ProviderSpecificConfig | undefined> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config?.providers?.[providerType];
  }

  /**
   * Retrieves an API key for a given provider.
   * It first checks the local configuration file (non-sensitive settings).
   * If not found, it attempts to retrieve the key from the secure keychain.
   * @param providerType The type of the provider (e.g., 'openai').
   * @param apiKeyName The name of the key to look for in the keychain (e.g. 'apiKey', 'secretKey'). Defaults to 'apiKey'.
   * @returns {Promise<string | null>} The API key string if found, otherwise null.
   */
  public async getResolvedApiKey(providerType: string, apiKeyName: string = 'apiKey'): Promise<string | null> {
    if (!this.config) {
      await this.loadConfig();
    }

    // 1. Check non-sensitive config first (e.g., if a user explicitly set it there for some reason)
    // This is not recommended for sensitive keys but provides a fallback.
    const providerConfig = this.config?.providers?.[providerType];
    if (providerConfig && typeof providerConfig[apiKeyName] === 'string') {
      console.warn(`API key for ${providerType} found in non-secure config. Consider moving to secure storage.`);
      return providerConfig[apiKeyName] as string;
    }

    // 2. If not in config, try to get from secure storage
    const credentialIdentifier: CredentialIdentifier = { providerType, accountName: apiKeyName };
    try {
      const secret = await CredentialManager.getSecret(credentialIdentifier);
      if (secret) {
        console.log(`API key for ${providerType} (key: ${apiKeyName}) resolved from secure storage.`);
        return secret;
      }
    } catch (error) {
      console.error(`Error retrieving API key for ${providerType} (key: ${apiKeyName}) from secure storage:`, error);
      return null;
    }
    
    console.log(`API key for ${providerType} (key: ${apiKeyName}) not found in config or secure storage.`);
    return null;
  }

  /**
   * Returns the default configuration values.
   * @returns {AppConfig} The default configuration.
   */
  public getDefaults(): AppConfig {
    return {
      defaultProvider: undefined,
      providers: {},
    };
  }

  /**
   * Gets the file path where the configuration is stored.
   * @returns {string} The configuration file path.
   */
  public getConfigFilePath(): string {
    return this.configPath;
  }
}

export const configManager = new ConfigManager();
