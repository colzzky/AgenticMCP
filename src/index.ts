#!/usr/bin/env node

import { Command } from 'commander';
import { version, description } from '../package.json'; // Assuming package.json is in the root

const program = new Command();

program
  .version(version)
  .description(description);

// Example command (to be expanded later)
program
  .command('hello')
  .description('Prints a greeting message')
  .action(() => {
    console.log('Hello from AgenticMCP CLI!');
  });

program.parse(process.argv);

// Handle cases where no command is specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
