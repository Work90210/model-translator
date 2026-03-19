import type { AuthMode } from './server.js';

export type CredentialAuthType = Exclude<AuthMode, 'none'>;

declare const PlaintextKeyBrand: unique symbol;
export type PlaintextKey = string & { readonly [PlaintextKeyBrand]: never };

export function createPlaintextKey(value: string): PlaintextKey {
  if (value.length === 0) {
    throw new Error('Plaintext key must not be empty');
  }
  return value as PlaintextKey;
}

export interface SafeCredential {
  readonly id: string;
  readonly serverId: string;
  readonly userId: string;
  readonly label: string;
  readonly authType: CredentialAuthType;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Credential extends SafeCredential {
  readonly encryptedKey: string;
}

export interface CreateCredentialInput {
  readonly serverId: string;
  readonly label: string;
  readonly plaintextKey: PlaintextKey;
  readonly authType: CredentialAuthType;
  readonly expiresAt?: Date | null;
}

export interface UpdateCredentialInput {
  readonly label?: string;
  readonly plaintextKey?: PlaintextKey;
  readonly authType?: CredentialAuthType;
  readonly expiresAt?: Date | null;
}

export interface CredentialFilters {
  readonly serverId?: string;
  readonly authType?: CredentialAuthType;
}
