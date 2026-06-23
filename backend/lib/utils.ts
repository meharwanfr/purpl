import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { user } from "../src/db/schema";
import type { Pool } from "pg";



export async function createData(db: NodePgDatabase<Record<string, never>> & { $client: Pool; }) {
    console.log('func ran!')

    const user1: typeof user.$inferInsert = {
        name: "mehar",
        email: "kida@fer.ji",
        authProviders: "Google"
    }

    await db.insert(user).values(user1);
    console.log('New user created!')
}