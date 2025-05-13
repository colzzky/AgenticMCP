/**
 * Application configuration for AgenticMCP
 */

export interface AppConfig {
  /**
   * Application name used throughout the system
   */
  appName: string;
}

/**
 * Default application configuration
 */
export const defaultAppConfig: AppConfig = {
  appName: "AgenticMCP"
};
