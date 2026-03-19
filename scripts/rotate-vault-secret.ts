/**
 * Vault Secret Rotation Script
 *
 * Usage:
 *   OLD_VAULT_SECRET=<old> OLD_VAULT_SALT=<old_salt> \
 *   NEW_VAULT_SECRET=<new> NEW_VAULT_SALT=<new_salt> \
 *   DATABASE_URL=<url> npx tsx scripts/rotate-vault-secret.ts
 *
 * Re-encrypts all credentials in batched transactions.
 */

import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { credentials } from '../apps/web/lib/db/schema/credentials.js';
import { validateVaultSecret, validateVaultSalt } from '../apps/web/lib/vault/validate.js';
import {
  PBKDF2_ITERATIONS,
  KEY_LENGTH,
  PBKDF2_DIGEST,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  ALGORITHM,
  CIPHERTEXT_VERSION,
} from '../apps/web/lib/vault/constants.js';
import { eq, gt, sql } from 'drizzle-orm';

const BATCH_SIZE = 50;

function deriveKeyDirect(secret: string, salt: string): Buffer {
  return pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

function decryptDirect(ciphertext: string, key: Buffer): string {
  const combined = Buffer.from(ciphertext, 'base64');
  if (combined.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Decryption failed');
  }
  if (combined[0] !== CIPHERTEXT_VERSION) {
    throw new Error('Decryption failed');
  }
  const iv = combined.subarray(1, 1 + IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(1 + IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  try {
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Decryption failed');
  }
}

function encryptDirect(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([CIPHERTEXT_VERSION]), iv, encrypted, authTag]).toString('base64');
}

async function rotateVaultSecret(): Promise<void> {
  const oldSecret = validateVaultSecret(process.env['OLD_VAULT_SECRET']);
  const oldSalt = validateVaultSalt(process.env['OLD_VAULT_SALT']);
  const newSecret = validateVaultSecret(process.env['NEW_VAULT_SECRET']);
  const newSalt = validateVaultSalt(process.env['NEW_VAULT_SALT']);
  const databaseUrl = process.env['DATABASE_URL'];

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (oldSecret === newSecret && oldSalt === newSalt) {
    throw new Error('Old and new secret/salt combinations must differ');
  }

  console.log('Deriving encryption keys...');
  const oldKey = deriveKeyDirect(oldSecret, oldSalt);
  const newKey = deriveKeyDirect(newSecret, newSalt);

  const sqlClient = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(sqlClient);

  try {
    const countRows = await db.select({ total: sql<number>`count(*)` }).from(credentials);
    const totalCount = Number(countRows[0]?.total ?? 0);

    console.log(`Found ${totalCount} credentials to rotate`);

    if (totalCount === 0) {
      console.log('No credentials to rotate. Done.');
      return;
    }

    let processed = 0;
    let lastId = '00000000-0000-0000-0000-000000000000';

    while (processed < totalCount) {
      const batch = await db
        .select({ id: credentials.id, encryptedKey: credentials.encryptedKey })
        .from(credentials)
        .where(gt(credentials.id, lastId))
        .orderBy(credentials.id)
        .limit(BATCH_SIZE);

      if (batch.length === 0) break;

      await db.transaction(async (tx) => {
        for (const cred of batch) {
          let plaintext: string;
          try {
            plaintext = decryptDirect(cred.encryptedKey, oldKey);
          } catch {
            throw new Error(`Decryption failed for credential ${cred.id}`);
          }

          const reEncrypted = encryptDirect(plaintext, newKey);

          // Verify round-trip before committing
          const verified = decryptDirect(reEncrypted, newKey);
          if (verified !== plaintext) {
            throw new Error(`Round-trip verification failed for credential ${cred.id}`);
          }

          await tx
            .update(credentials)
            .set({ encryptedKey: reEncrypted })
            .where(eq(credentials.id, cred.id));
        }
      });

      lastId = batch[batch.length - 1]!.id;
      processed += batch.length;
      console.log(`Rotated ${processed}/${totalCount} credentials`);
    }

    console.log(`Successfully rotated ${totalCount} credentials`);
    console.log('IMPORTANT: Update VAULT_SECRET and VAULT_SALT in your environment to the new values');
  } finally {
    oldKey.fill(0);
    newKey.fill(0);
    await sqlClient.end();
  }
}

rotateVaultSecret().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Rotation failed: ${message}`);
  process.exit(1);
});
