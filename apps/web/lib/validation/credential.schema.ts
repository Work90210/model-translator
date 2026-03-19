import { z } from 'zod';

export const createCredentialSchema = z.object({
  label: z.string().min(1).max(200).trim(),
  plaintextKey: z.string().min(1).max(10000),
  authType: z.enum(['api_key', 'bearer']),
  expiresAt: z.coerce.date().optional(),
});

export type CreateCredentialSchemaInput = z.infer<typeof createCredentialSchema>;
