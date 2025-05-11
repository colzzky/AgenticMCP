/**
 * @file Defines and registers the 'config' command and its subcommands.
 */

import { Command } from 'commander';
import { ConfigManager } from '../core/config/configManager';
import { AppConfig } from '../core/types/config.types';
import { logger } from '../core/utils/index';
import { isValidProviderType } from '../core/utils/index';

/**
 * Registers the 'config' command and its subcommands with the main program.
 * @param program The main Commander program instance.
 */
export function registerConfigCommands(program: Command): void {
  // Show help if no command is specified
  if (process.argv.slice(2).length === 0) {
    program.outputHelp();
  }

  const configCommand = program.command('config').description('Manage CLI configuration.');
  const configManager = new ConfigManager();

  configCommand
    .command('path')
    .description('Display the path to the configuration file')
    .action(() => {
      console.log('Configuration file path:', configManager.getConfigFilePath());
    });

  configCommand
    .command('show')
    .description('Display the current configuration')
    .action(async () => {
      try {
        const currentConfig = await configManager.loadConfig();
        console.log('Current configuration:');
        console.log(JSON.stringify(currentConfig, undefined, 2));
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    });

  configCommand
    .command('get <key>')
    .description('Get a specific configuration value by key (e.g., defaultProvider)')
    .action(async (key: string) => {
      try {
        const value = await configManager.get(key as keyof AppConfig);
        if (value) {
          const currentConfig = await configManager.loadConfig(); // Load to check if key exists
          if (key in currentConfig) {
            console.log(`${key}:`, value); // Value is explicitly undefined or undefined
          } else {
            console.log(`Configuration key '${key}' not found.`);
          }
        }
      } catch (error) {
        console.error(`Failed to get configuration for key '${key}':`, error);
      }
    });

  configCommand
    .command('set <key> <value>')
    .description('Set a specific configuration value by key (e.g., defaultProvider openai, or providers \'{...}\'')
    .action(async (key: string, value: string) => {
      try {
        if (key === 'defaultProvider') {
          if (typeof value !== 'string' || ['true', 'false'].includes(value.toLowerCase()) || (!Number.isNaN(Number(value)) && Number.isFinite(Number(value)))) {
             console.error(`Invalid value for 'defaultProvider'. It must be a string (e.g., 'openai').`);
             return;
          }
          await configManager.set('defaultProvider', value);
          console.log(`Configuration 'defaultProvider' set to:`, value);
        } else if (key === 'providers') {
          try {
            const providersObject = JSON.parse(value);
            // TODO: Add a type guard or schema validation for providersObject structure
            await configManager.set('providers', providersObject);
            console.log(`Configuration 'providers' set to:`, providersObject);
          } catch {
            console.error(`Invalid JSON string for 'providers'. Please provide a valid JSON object string.`);
            console.error('Example: config set providers \'{ "myOpenAI": { "providerType": "openai", "model": "gpt-4" } }\'');
            return;
          }
        } else {
          console.error(`Invalid configuration key: ${key}. Allowed keys are 'defaultProvider' or 'providers'.`);
          return;
        }
      } catch (error) {
        console.error(`Failed to set configuration for key '${key}':`, error);
      }
    });

  configCommand
    .command('remove <key>')
    .description('Remove a specific configuration value by key')
    .action(async (key: string) => {
      try {
        const currentConfig = await configManager.loadConfig();
        if (key in currentConfig) {
          delete currentConfig[key as keyof AppConfig]; // Type assertion after check
          await configManager.saveConfig(currentConfig);
          logger.info(`Configuration key "${key}" removed successfully.`);
        } else {
          console.log(`Configuration key '${key}' not found.`);
        }
      } catch (error) {
        console.error(`Failed to remove configuration for key '${key}':`, error);
      }
    });
}
