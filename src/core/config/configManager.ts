/**
 * @file Manages application configuration, including loading, saving, and providing defaults.
 */
import type { PathDI, FileSystemDI } from '../../types/global.types';
import envPaths from 'env-paths';
import { AppConfig, ProviderSpecificConfig, OpenAIProviderSpecificConfig, McpServerConfig } from '../types/config.types';
import { CredentialManager } from '../credentials/credentialManager';
import { CredentialIdentifier } from '../types/credentials.types';
import { Logger } from '../types/logger.types';

const APP_NAME = 'agenticmcp';
const CONFIG_FILE_NAME = 'config.json';

/**
 * Manages the application's configuration.
 */
export class ConfigManager {
  private configPath: string;
  private config: AppConfig | undefined = undefined;
  private pathDI: PathDI;
  private fileSystemDI: FileSystemDI;
  private credentialManager: InstanceType<typeof CredentialManager>;
  private logger: Logger;

  constructor(
    appName: string = APP_NAME,
    pathDI: PathDI,
    fileSystemDI: FileSystemDI,
    credentialManager: InstanceType<typeof CredentialManager>,
    logger: Logger
  ) {
    const paths = envPaths(appName, { suffix: '' });
    this.configPath = pathDI.join(paths.config, CONFIG_FILE_NAME);
    this.pathDI = pathDI;
    this.fileSystemDI = fileSystemDI;
    this.credentialManager = credentialManager;
    this.logger = logger;
  }

  /**
   * Ensures the configuration directory exists.
   */
  private async ensureConfigDirectory(): Promise<void> {
    const dir = this.pathDI.dirname(this.configPath);
    try {
      await this.fileSystemDI.mkdir(dir, { recursive: true });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code !== 'EEXIST'
      ) {
        this.logger.error(`Failed to create config directory at ${dir}:`, error);
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
      const fileContent = await this.fileSystemDI.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(fileContent) as AppConfig;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'ENOENT'
      ) {
        this.logger.warn(`Config file not found at ${this.configPath}. Initializing with defaults.`);
        this.config = this.getDefaults();
        await this.saveConfig();
      } else {
        this.logger.error(`Error reading config file ${this.configPath}:`, error);
        this.config = this.getDefaults();
      }
    }
    return this.config;
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
      this.logger.warn('No configuration to save. Load or initialize defaults first.');
      return;
    }
    await this.ensureConfigDirectory();
    try {
      const fileContent = JSON.stringify(this.config, undefined, 2);
      await this.fileSystemDI.writeFile(this.configPath, fileContent, 'utf-8');
      this.logger.info(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      this.logger.error(`Error saving config file ${this.configPath}:`, error);
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
    // Ensure config is not undefined before accessing its properties
    return this.config ? this.config[key] : undefined;
  }

  /**
   * Gets the current configuration without async loading
   * @returns {AppConfig} The current configuration
   */
  public getConfig(): AppConfig {
    if (!this.config) {
      return this.getDefaults();
    }
    return this.config;
  }

  /**
   * Gets the MCP server configuration
   * @returns {McpServerConfig} The MCP server configuration
   */
  public getMcpConfig(): McpServerConfig {
    if (!this.config?.mcp) {
      return this.getDefaultMcpConfig();
    }
    return this.config.mcp;
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
    // Ensure config is not undefined before modifying and saving
    if (this.config) {
      this.config[key] = value;
      await this.saveConfig();
    } else {
      this.logger.error('Configuration could not be loaded or initialized. Set operation failed.');
      // In a real app, might throw an error here
    }
  }

  /**
   * Retrieves a provider's specific configuration using its user-defined alias.
   * Loads config if not already loaded.
   * @param alias The user-defined alias of the provider configuration (e.g., 'myOpenAI').
   * @returns {Promise<ProviderSpecificConfig | undefined>} The provider's configuration, or undefined if not found.
   */
  public async getProviderConfigByAlias(alias: string): Promise<ProviderSpecificConfig | undefined> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config?.providers?.[alias];
  }

  /**
   * Retrieves an API key for a given provider configuration from secure storage.
   * @param providerConfig The specific configuration object for the provider instance.
   * @returns {Promise<string | undefined>} The API key string if found, otherwise undefined.
   */
  public async getResolvedApiKey(providerConfig: ProviderSpecificConfig): Promise<string | undefined> {
    if (!providerConfig || !providerConfig.providerType) {
      this.logger.error('Invalid providerConfig (or missing providerType) passed to getResolvedApiKey.');
      return undefined;
    }

    const actualProviderType = providerConfig.providerType;
    // Use instanceName as the accountName for credentials if available,
    // otherwise fall back to 'apiKey' as a default account name for that providerType's credential.
    const accountNameForCredentials = providerConfig.instanceName || 'apiKey';

    const credentialIdentifier: CredentialIdentifier = {
      providerType: actualProviderType,
      accountName: accountNameForCredentials
    };

    try {
      const secret = await this.credentialManager.getSecret(credentialIdentifier);
      if (secret) {
        this.logger.info(`API key for ${actualProviderType} (account: ${accountNameForCredentials}) resolved from secure storage.`);
        return secret;
      }
    } catch (error) {
      this.logger.error(`Error retrieving API key for ${actualProviderType} (account: ${accountNameForCredentials}) from secure storage:`, error);
      // It's important to return undefined or throw, not to fall through to 'not found' if it's an actual error.
      return undefined;
    }

    this.logger.warn(`API key for ${actualProviderType} (account: ${accountNameForCredentials}) not found in secure storage.`);
    return undefined;
  }

  /**
   * Returns the default configuration values.
   * @returns {AppConfig} The default configuration.
   */
  public getDefaults(): AppConfig {
    return {
      defaultProvider: undefined,
      providers: {},
      mcp: this.getDefaultMcpConfig(),
    };
  }

  /**
   * Returns the default MCP server configuration.
   * @returns {McpServerConfig} The default MCP server configuration.
   */
  public getDefaultMcpConfig(): McpServerConfig {
    return {
      enabled: false,
      name: 'AgenticMCP-MCP',
      version: '1.0.0',
      description: 'AgenticMCP MCP Server - Providing filesystem operations for LLMs',
      tools: {
        namePrefix: ''
      }
    };
  }

  /**
   * Gets the file path where the configuration is stored.
   * @returns {string} The configuration file this.pathDI.
   */
  public getConfigFilePath(): string {
    return this.configPath;
  }
}