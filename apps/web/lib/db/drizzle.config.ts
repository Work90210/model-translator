import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: (() => {
      const url = process.env['DATABASE_URL'];
      if (!url) throw new Error('DATABASE_URL environment variable is required');
      return url;
    })(),
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
});
