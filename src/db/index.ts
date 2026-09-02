import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL (definila en .env.local)");
}

// Supabase: usar el connection pooler. `prepare: false` es necesario en modo
// transaction (puerto 6543) y es inofensivo en modo session (5432).
const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });

export * as schema from "./schema";
