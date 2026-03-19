import { encrypt as rawEncrypt } from './encrypt.js';
import { decrypt as rawDecrypt } from './decrypt.js';
import { validateVaultSecret, validateVaultSalt } from './validate.js';

export { clearKeyCache } from './derive-key.js';
export { validateVaultSecret, validateVaultSalt } from './validate.js';

function getSecret(): string {
  return validateVaultSecret(process.env['VAULT_SECRET']);
}

function getSalt(): string {
  return validateVaultSalt(process.env['VAULT_SALT']);
}

export function encryptCredential(plaintext: string): string {
  return rawEncrypt(plaintext, getSecret(), getSalt());
}

export function decryptCredential(ciphertext: string): string {
  return rawDecrypt(ciphertext, getSecret(), getSalt());
}
