/**
 * @file Defines and registers the 'config' command and its subcommands.
 */

import { Command } from 'commander';
import { configManager } from '../core/config';
import { AppConfig } from '../core/types'; // Ensure AppConfig is correctly typed

/**
 * Registers the 'config' command and its subcommands with the main program.
 * @param program The main Commander program instance.
 */
export function registerConfigCommands(program: Command): void {
  const configCommand = program.command('config').description('Manage CLI configuration');

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
        console.log(JSON.stringify(currentConfig, null, 2));
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
        if (value !== undefined) {
          console.log(`${key}:`, value);
        } else {
          const currentConfig = await configManager.loadConfig(); // Load to check if key exists
          if (Object.prototype.hasOwnProperty.call(currentConfig, key)) {
            console.log(`${key}:`, value); // Value is explicitly undefined or null
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
    .description('Set a specific configuration value by key (e.g., defaultProvider openai)')
    .action(async (key: string, value: any) => {
      try {
        let parsedValue: any = value;
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') {
                parsedValue = true;
            } else if (value.toLowerCase() === 'false') {
                parsedValue = false;
            } else if (!isNaN(parseFloat(value)) && isFinite(value as any)) {
                // Check if it's a number, but ensure it's not just a string that happens to be numeric
                // Commander might pass numbers as strings
                const num = parseFloat(value);
                if (String(num) === value) { // If re-stringifying gives the same value, it's likely a number
                    parsedValue = num;
                }
            }
        }
        // If value is already a boolean or number from Commander's parsing, it will be used directly.

        await configManager.set(key as keyof AppConfig, parsedValue);
        console.log(`Configuration '${key}' set to:`, parsedValue);
      } catch (error) {
        console.error(`Failed to set configuration for key '${key}':`, error);
      }
    });
}
