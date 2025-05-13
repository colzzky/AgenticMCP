import { Command } from 'commander';
import { CredentialManager } from '../core/credentials/credentialManager';
import { CredentialIdentifier } from '../core/types/credentials.types';
import { Logger } from '../core/types/logger.types';

export function registerCredentialCommands(
  program: Command, 
  credentialManager: typeof CredentialManager,
  loggerTool: Logger
): void {
  const credentialsCommand = program.command('credentials').description('Manage API keys and other secure credentials.');
  // CredentialManager methods are static, no instance needed for these calls.

  credentialsCommand
    .command('set <providerType> <accountName> <secret>')
    .description('Set a new secret for a specific provider and account.')
    .action(async (providerType: string, accountName: string, secret: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        await credentialManager.setSecret(identifier, secret); // Use static method
        // Message is logged by CredentialManager
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          loggerTool.error(`Failed to set secret: ${(error as Error).message}`);
        } else {
          loggerTool.error('Failed to set secret due to an unknown error.');
        }
      }
    });

  credentialsCommand
    .command('get <providerType> <accountName>')
    .description('Retrieve a secret for a specific provider and account.')
    .action(async (providerType: string, accountName: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        const secret = await credentialManager.getSecret(identifier); // Use static method
        if (secret) {
          // 'secret' is the password string itself
          loggerTool.info(
            `Retrieved secret for provider '${identifier.providerType}', account '${identifier.accountName}'. Secret length: ${secret.length}`,
          );
        } else {
          loggerTool.warn(
            `No secret found for provider '${identifier.providerType}', account '${identifier.accountName}'.`,
          );
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          loggerTool.error(`Failed to retrieve secret: ${(error as Error).message}`);
        } else {
          loggerTool.error('Failed to retrieve secret due to an unknown error.');
        }
      }
    });

  credentialsCommand
    .command('delete <providerType> <accountName>')
    .description('Delete a secret for a specific provider and account.')
    .action(async (providerType: string, accountName: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        await credentialManager.deleteSecret(identifier); // Use static method
        loggerTool.info(`Successfully deleted secret for ${identifier}`);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          loggerTool.error(`Failed to delete secret for ${identifier}: ${(error as Error).message}`);
        } else {
          loggerTool.error('Failed to delete secret due to an unknown error.');
        }
      }
    });

  credentialsCommand
    .command('list <providerType>')
    .description('List all stored account names for a specific provider type.')
    .action(async (providerType: string) => {
      try {
        const credentials = await credentialManager.findCredentialsByProvider(providerType); // Use static method
        if (credentials.length > 0) {
          loggerTool.info(`Found credentials for provider '${providerType}':`);
          // Comply with unicorn/no-array-for-each
          for (const cred of credentials) {
            // Use 'account' instead of 'accountName'
            loggerTool.info(`  Account: ${cred.account}, Password Set: ${cred.password ? 'Yes' : 'No'}`);
          }
        } else {
          loggerTool.warn(`No credentials found for provider '${providerType}'.`);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          loggerTool.error(
            `Failed to list secrets for provider '${providerType}': ${(error as Error).message}`,
          );
        } else {
          loggerTool.error(
            `Failed to list secrets for provider '${providerType}' due to an unknown error.`,
          );
        }
      }
    });

  program.addCommand(credentialsCommand);
}
