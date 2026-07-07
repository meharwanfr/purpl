import type { db } from "../src/db/index";

export async function createData(dbInstance: typeof db) {
    console.log('func ran!')

    // const user1: typeof user.$inferInsert = {
    //     name: "mehar",
    //     email: "kida@fer.ji",
    //     authProviders: "Google"
    // }

    // await db.insert(user).values(user1);
    console.log('New user created!')
}