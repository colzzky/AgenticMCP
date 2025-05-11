export interface KeytarCredential {
  account: string;
  password?: string | null; // Password can be null if not found or not applicable
}

/**
 * Defines the structure for identifying a credential in the keychain.
 */
export interface CredentialIdentifier {
  providerType: string; // e.g., 'openai', 'anthropic', 'mistral'
  accountName: string;  // e.g., 'apiKey', 'defaultUser'
}
