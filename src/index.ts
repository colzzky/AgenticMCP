#!/usr/bin/env node

import { Command } from 'commander';
import { version, description } from '../package.json'; // Assuming package.json is in the root
import { configManager } from './core/config'; // Import the configManager
import { registerConfigCommands } from './commands/configCommands';
import { registerCredentialCommands } from './commands/credentialCommands'; // Add this import

const program = new Command();

program
  .version(version)
  .description(description);

async function main() {
  // Register command modules
  registerConfigCommands(program);
  registerCredentialCommands(program); // Add this line

  // Example command (to be expanded later)
  program
    .command('hello')
    .description('Prints a greeting message')
    .action(() => {
      console.log('Hello from AgenticMCP CLI!');
    });

  // Handle cases where no command is specified
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }

  program.parse(process.argv);
}

main();
