export interface KeytarCredential {
  account: string;
  password?: string | undefined; // Password can be undefined if not found or not applicable
}

/**
 * Defines the structure for identifying a credential in the keychain.
 */
export interface CredentialIdentifier {
  providerType: string; // e.g., 'openai', 'anthropic', 'mistral'
  accountName: string;  // e.g., 'apiKey', 'defaultUser'
}
