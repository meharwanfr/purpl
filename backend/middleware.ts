import type { NextFunction , Request, Response} from "express";
import { createSupabaseClient } from "./client";

const client = createSupabaseClient();

export default async function middleware(request: Request, response: Response,next: NextFunction){
    const token = request.headers.authorization;

    const data = await client.auth.getUser(token);
    const userId = data.data.user?.id;

    if (userId) {
        request.userID = userId;
        next();
    } else {
        response.status(403).json({
            message: "Not Logged In or Incorrect Credentials" 
        })
    }
}