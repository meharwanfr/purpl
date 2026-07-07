import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const isTransactionPooler =
  connectionString.includes("pgbouncer=true") ||
  connectionString.includes(":6543/");
const isSupabasePooler = connectionString.includes("pooler.supabase.com");
const isSupabaseDirect =
  connectionString.includes(".supabase.co") && !isSupabasePooler;
const isCloudHost = !!(process.env.RENDER || process.env.VERCEL);

if (isCloudHost && isSupabaseDirect) {
  console.error(
    "[db] DATABASE_URL uses Supabase direct connection (IPv6-only). " +
      "Render cannot reach it — use the Session pooler string from " +
      "Supabase Dashboard → Connect (host: *.pooler.supabase.com, port 5432).",
  );
}

const sql = postgres(connectionString, {
  ssl: "require",
  // Transaction pooler (port 6543) does not support prepared statements.
  prepare: !isTransactionPooler,
  max: process.env.VERCEL ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql);

export async function checkDbConnection() {
  const [row] = await sql`SELECT 1 as val`;
  return row;
}
