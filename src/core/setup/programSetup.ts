import { Command } from 'commander';
import type { Logger } from '../types/logger.types';

/**
 * Runs the CLI program with proper error handling
 */
export async function runProgram(
  program: Command,
  processDi: NodeJS.Process,
  loggerTool: Logger
): Promise<void> {
  // Add help handler
  program.on('--help', () => {
    console.log('');
    console.log('Use "[command] --help" for more information on a command.');
    loggerTool.info('Displaying help information.');
  });

  try {
    await program.parseAsync(processDi.argv);
    if (processDi.argv.slice(2).length === 0) {
      program.outputHelp();
    }
  } catch (error) {
    if (error instanceof Error) {
      loggerTool.error(`Command execution failed: ${error.message}`);
      if (processDi.env.DEBUG === 'true') {
        console.error(error.stack);
      }
    } else {
      loggerTool.error('An unknown error occurred during command execution.');
    }
    processDi.exit(1);
  }
}
