/**
 * @fileoverview A simple logger utility for the AgenticMCP CLI.
 * Provides basic logging functionalities with different severity levels.
 */

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

// Default log level can be set via environment variable or a config file later
// For now, let's default to 'info'
let currentLogLevel = LOG_LEVELS.indexOf('info');

/**
 * Logs an informational message.
 * @param message - The message to log.
 */
export function info(message: string): void {
  console.log(`[INFO] ${message}`);
}

/**
 * Logs a warning message.
 * @param message - The message to log.
 */
export function warn(message: string): void {
  console.warn(`[WARN] ${message}`);
}

/**
 * Logs an error message.
 * @param message - The message to log.
 */
export function error(message: string): void {
  console.error(`[ERROR] ${message}`);
}

/**
 * Logs a debug message. Only logs if a specific environment variable is set (e.g., DEBUG=true).
 * @param message - The message to log.
 */
export function debug(message: string): void {
  // Simple debug check, can be expanded (e.g., using a library like 'debug')
  if (process.env.DEBUG === 'true' || process.env.AGENTICMCP_DEBUG === 'true') {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Sets the current logging level.
 * @param level - The level to set.
 */
export function setLogLevel(level: string): void {
  const levelIndex = LOG_LEVELS.indexOf(level);
  if (levelIndex === -1) {
    error(`Invalid log level: ${level}`);
  } else {
    currentLogLevel = levelIndex;
  }
}

export const logger = {
  info,
  warn,
  error,
  debug,
  setLogLevel,
};
