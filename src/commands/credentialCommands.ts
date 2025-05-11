import { Command } from 'commander';
import { CredentialManager } from '../core/credentials/credentialManager';
import { CredentialIdentifier } from '../core/types/credentials.types';
import { logger } from '../core/utils/index';

export function registerCredentialCommands(program: Command): void {
  const credentialsCommand = program.command('credentials').description('Manage API keys and other secure credentials.');
  // CredentialManager methods are static, no instance needed for these calls.

  credentialsCommand
    .command('set <providerType> <accountName> <secret>')
    .description('Set a new secret for a specific provider and account.')
    .action(async (providerType: string, accountName: string, secret: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        await CredentialManager.setSecret(identifier, secret); // Use static method
        // Message is logged by CredentialManager
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          logger.error(`Failed to set secret: ${(error as Error).message}`);
        } else {
          logger.error('Failed to set secret due to an unknown error.');
        }
      }
    });

  credentialsCommand
    .command('get <providerType> <accountName>')
    .description('Retrieve a secret for a specific provider and account.')
    .action(async (providerType: string, accountName: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        const secret = await CredentialManager.getSecret(identifier); // Use static method
        if (secret) {
          // 'secret' is the password string itself
          logger.info(
            `Retrieved secret for provider '${identifier.providerType}', account '${identifier.accountName}'. Secret length: ${secret.length}`,
          );
        } else {
          logger.warn(
            `No secret found for provider '${identifier.providerType}', account '${identifier.accountName}'.`,
          );
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          logger.error(`Failed to retrieve secret: ${(error as Error).message}`);
        } else {
          logger.error('Failed to retrieve secret due to an unknown error.');
        }
      }
    });

  credentialsCommand
    .command('delete <providerType> <accountName>')
    .description('Delete a secret for a specific provider and account.')
    .action(async (providerType: string, accountName: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        await CredentialManager.deleteSecret(identifier); // Use static method
        logger.info(`Successfully deleted secret for ${identifier}`);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          logger.error(`Failed to delete secret for ${identifier}: ${(error as Error).message}`);
        } else {
          logger.error('Failed to delete secret due to an unknown error.');
        }
      }
    });

  credentialsCommand
    .command('list <providerType>')
    .description('List all stored account names for a specific provider type.')
    .action(async (providerType: string) => {
      try {
        const credentials = await CredentialManager.findCredentialsByProvider(providerType); // Use static method
        if (credentials.length > 0) {
          logger.info(`Found credentials for provider '${providerType}':`);
          // Comply with unicorn/no-array-for-each
          for (const cred of credentials) {
            // Use 'account' instead of 'accountName'
            logger.info(`  Account: ${cred.account}, Password Set: ${cred.password ? 'Yes' : 'No'}`);
          }
        } else {
          logger.warn(`No credentials found for provider '${providerType}'.`);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          logger.error(
            `Failed to list secrets for provider '${providerType}': ${(error as Error).message}`,
          );
        } else {
          logger.error(
            `Failed to list secrets for provider '${providerType}' due to an unknown error.`,
          );
        }
      }
    });

  program.addCommand(credentialsCommand);
}
