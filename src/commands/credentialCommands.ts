import { Command } from 'commander';
import { CredentialManager } from '../core/credentials';
import { CredentialIdentifier } from '../core/types';

export function registerCredentialCommands(program: Command): void {
  const credentialsCommand = program.command('credentials').description('Manage API keys and other secure credentials.');

  credentialsCommand
    .command('set <providerType> <accountName> <secret>')
    .description('Set a secret in the keychain for a specific provider and account.')
    .action(async (providerType: string, accountName: string, secret: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        await CredentialManager.setSecret(identifier, secret);
        // Message is logged by CredentialManager
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          console.error(`Failed to set secret: ${(error as { message: string }).message}`);
        } else {
          console.error('Failed to set secret:', error);
        }
      }
    });

  credentialsCommand
    .command('get <providerType> <accountName>')
    .description('Get a secret from the keychain for a specific provider and account.')
    .action(async (providerType: string, accountName: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        const secret = await CredentialManager.getSecret(identifier);
        if (secret) {
          console.log(`Secret for '${accountName}' under provider '${providerType}': ${secret}`);
        } else {
          console.log(`No secret found for '${accountName}' under provider '${providerType}'.`);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          console.error(`Failed to get secret: ${(error as { message: string }).message}`);
        } else {
          console.error('Failed to get secret:', error);
        }
      }
    });

  credentialsCommand
    .command('delete <providerType> <accountName>')
    .description('Delete a secret from the keychain for a specific provider and account.')
    .action(async (providerType: string, accountName: string) => {
      const identifier: CredentialIdentifier = { providerType, accountName };
      try {
        await CredentialManager.deleteSecret(identifier);
        // Message is logged by CredentialManager or it indicates if not found
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          console.error(`Failed to delete secret: ${(error as { message: string }).message}`);
        } else {
          console.error('Failed to delete secret:', error);
        }
      }
    });

  credentialsCommand
    .command('list <providerType>')
    .description('List all stored account names for a specific provider type.')
    .action(async (providerType: string) => {
      try {
        const credentials = await CredentialManager.findCredentialsByProvider(providerType);
        if (credentials.length > 0) {
          console.log(`Stored credentials for provider '${providerType}':`);
          for (const cred of credentials) {
            console.log(`  Account: ${cred.account}`); // We don't display the password itself
          }
        } else {
          console.log(`No credentials found for provider '${providerType}'.`);
        }
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          console.error(`Failed to list credentials: ${(error as { message: string }).message}`);
        } else {
          console.error('Failed to list credentials:', error);
        }
      }
    });
}
