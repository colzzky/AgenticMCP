/**
 * @file Mock logger module for testing
 * This is a stub file that will be mocked in tests
 */

export function info(message: string): void {
  console.info(message);
}

export function error(message: string, error?: any): void {
  console.error(message, error);
}

export function debug(message: string): void {
  console.debug(message);
}

// Default export for ESM compatibility
export default {
  info,
  error,
  debug
};