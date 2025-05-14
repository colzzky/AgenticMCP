import { Command } from 'commander';
import type { Logger } from '../types/logger.types';


export type RunProgramFn = (
  program: InstanceType<typeof Command>,
  process: NodeJS.Process,
  logger: Logger
) => Promise<void>;

/**
 * Runs the CLI program with proper error handling
 */
export const runProgram: RunProgramFn = async (
  program: Command,
  processDi: NodeJS.Process,
  loggerTool: Logger
) => {
  // Add help handler
  program.on('--help', () => {
    loggerTool.info('');
    loggerTool.info('Use "[command] --help" for more information on a command.');
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
