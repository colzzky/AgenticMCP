/**
 * @file Manages role-to-model configuration, including loading from JSON files
 */
import type { PathDI, FileSystemDI } from '../../../types/global.types';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { defaultRoleModelConfig, RoleModelConfig, RoleModelMapping } from './roleModelConfig.js';
import { Logger } from '../../../core/types/logger.types.js';

/**
 * Configuration parameters for the RoleModelConfigManager
 */
export interface RoleModelConfigManagerParams {
  /** Path to a custom config file to use */
  configPath?: string;
  /** File system dependency injection */
  fileSystemDI: FileSystemDI;
  /** Path utilities dependency injection */
  pathDI: PathDI;
  /** Logger for reporting issues */
  logger: Logger;
}

/**
 * Manages role-to-model configurations, with support for loading from JSON files
 */
export class RoleModelConfigManager {
  private config: RoleModelConfig;
  private configPath?: string;
  private fileSystemDI: FileSystemDI;
  private pathDI: PathDI;
  private logger: Logger;

  /**
   * Creates a new RoleModelConfigManager instance
   * @param params Configuration parameters
   */
  constructor(params: RoleModelConfigManagerParams) {
    this.config = defaultRoleModelConfig;
    this.configPath = params.configPath;
    this.fileSystemDI = params.fileSystemDI;
    this.pathDI = params.pathDI;
    this.logger = params.logger;

    // If a config path was provided, try to load it immediately
    if (this.configPath) {
      this.loadConfig(this.configPath);
    }
  }

  /**
   * Loads configuration from a JSON file at the specified path
   * @param configPath Path to the configuration file
   * @returns True if the configuration was loaded successfully, false otherwise
   */
  public loadConfig(configPath: string): boolean {
    try {
      // Make sure the path is absolute
      const absolutePath = this.pathDI.isAbsolute(configPath) 
        ? configPath 
        : this.pathDI.join(process.cwd(), configPath);

      // Check if the file exists
      if (!existsSync(absolutePath)) {
        this.logger.error(`Role model configuration file not found: ${absolutePath}`);
        return false;
      }

      // Load the file content
      const configContent = this.fileSystemDI.readFileSync(absolutePath, 'utf-8');
      
      // Parse the JSON content
      const parsedConfig = JSON.parse(configContent);
      
      // Validate the configuration
      if (!this.validateConfig(parsedConfig)) {
        this.logger.error(`Invalid role model configuration format in file: ${absolutePath}`);
        return false;
      }

      // Store the configuration
      this.config = parsedConfig;
      this.configPath = absolutePath;
      
      this.logger.info(`Successfully loaded role model configuration from: ${absolutePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Error loading role model configuration: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Reloads the current configuration file if one is set
   * @returns True if the configuration was reloaded successfully, false otherwise
   */
  public reloadConfig(): boolean {
    if (!this.configPath) {
      this.logger.warn('No configuration file path set, using default configuration');
      return false;
    }
    
    return this.loadConfig(this.configPath);
  }

  /**
   * Gets the model configuration for a specific role
   * @param role The role to get the model configuration for
   * @returns The model configuration for the role
   */
  public getModelConfigForRole(role: string): RoleModelMapping {
    return this.config.roleMap[role] || this.config.default;
  }

  /**
   * Gets the current configuration
   * @returns The current role model configuration
   */
  public getConfig(): RoleModelConfig {
    return this.config;
  }

  /**
   * Gets the path to the currently loaded configuration file
   * @returns The path to the configuration file, or undefined if using defaults
   */
  public getConfigPath(): string | undefined {
    return this.configPath;
  }

  /**
   * Validates a parsed configuration object to ensure it has the required structure
   * @param config The configuration object to validate
   * @returns True if the configuration is valid, false otherwise
   */
  private validateConfig(config: any): config is RoleModelConfig {
    // Check if the configuration is an object
    if (!config || typeof config !== 'object') {
      this.logger.error('Configuration must be an object');
      return false;
    }

    // Check for default configuration
    if (!config.default || typeof config.default !== 'object') {
      this.logger.error('Configuration must include a "default" object');
      return false;
    }

    // Validate default configuration
    if (!this.validateModelMapping(config.default)) {
      this.logger.error('Invalid default model mapping');
      return false;
    }

    // Check for role map
    if (!config.roleMap || typeof config.roleMap !== 'object') {
      this.logger.error('Configuration must include a "roleMap" object');
      return false;
    }

    // Validate each role mapping
    for (const [role, mapping] of Object.entries(config.roleMap)) {
      if (!this.validateModelMapping(mapping)) {
        this.logger.error(`Invalid model mapping for role: ${role}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validates a model mapping object
   * @param mapping The model mapping to validate
   * @returns True if the mapping is valid, false otherwise
   */
  private validateModelMapping(mapping: any): mapping is RoleModelMapping {
    // Check if the mapping is an object
    if (!mapping || typeof mapping !== 'object') {
      this.logger.error('Model mapping must be an object');
      return false;
    }

    // Check for required provider field
    if (typeof mapping.provider !== 'string' || !mapping.provider) {
      this.logger.error('Model mapping must include a "provider" string');
      return false;
    }

    // Check for required model field
    if (typeof mapping.model !== 'string' || !mapping.model) {
      this.logger.error('Model mapping must include a "model" string');
      return false;
    }

    // Check parameters if present
    if (mapping.parameters !== undefined && (typeof mapping.parameters !== 'object' || mapping.parameters === null)) {
      this.logger.error('Model mapping "parameters" must be an object if provided');
      return false;
    }

    return true;
  }
}