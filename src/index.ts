#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { registerConfigCommands } from './commands/configCommands';
import { registerCredentialCommands } from './commands/credentialCommands';
import { logger } from './core/utils/index';

async function main(): Promise<void> {
  const program = new Command();

  program
    .version(pkg.version)
    .description(pkg.description);

  // Register command groups
  registerConfigCommands(program);
  registerCredentialCommands(program);

  // Default help and error handling
  program.on('--help', () => {
    console.log('');
    console.log('Use "[command] --help" for more information on a command.');
    logger.info('Displaying help information.');
  });

  try {
    await program.parseAsync(process.argv);
    // Use .length === 0 for explicit length check
    if (process.argv.slice(2).length === 0) {
      program.outputHelp();
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Command execution failed: ${error.message}`);
      if (process.env.DEBUG === 'true') {
        console.error(error.stack);
      }
    } else {
      logger.error('An unknown error occurred during command execution.');
    }
    process.exit(1);
  }
}

// Prefer direct top-level await
try {
  await main();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Unhandled error in main function: ${errorMessage}`);
  process.exit(1);
}
