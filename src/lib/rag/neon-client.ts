import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add your Neon pooled connection string to .env.local."
  );
}

/**
 * Neon serverless SQL client.
 * Used as a tagged template: `await sql\`SELECT ...\``
 *
 * Works in both Node.js (ingestion scripts) and the Vercel Edge runtime
 * (API routes) — no connection pool management required.
 */
export const sql = neon(connectionString);

/**
 * Serialize a number[] embedding into the Postgres pgvector literal
 * format, e.g. '[0.01,0.23,...]'. The @neondatabase/serverless driver
 * does not auto-cast JS arrays to the VECTOR type, so we do it here.
 */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
