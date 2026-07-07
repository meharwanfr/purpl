import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(connectionString, {
  ssl: "require",
});

export const db = drizzle(sql);

export async function checkDbConnection() {
  const [row] = await sql`SELECT 1 as val`;
  return row;
}
