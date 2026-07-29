/**
 * Drizzle ORM client singleton.
 * Runs alongside the existing Supabase client for gradual migration.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let db: DrizzleClient | null = null;

export function getDrizzleClient(): DrizzleClient {
  if (db) return db;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_POOLED_URL ||
    '';

  if (!connectionString) {
    throw new Error(
      'No database connection string configured. Set DATABASE_URL or SUPABASE_POOLED_URL.'
    );
  }

  const client = postgres(connectionString, { max: 10 });
  db = drizzle(client, { schema });
  return db;
}

/** Reset singleton — useful for testing. */
export function resetDrizzleClient(): void {
  db = null;
}
