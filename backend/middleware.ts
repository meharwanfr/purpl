import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client.js";

const client = createSupabaseClient();

export default async function middleware(request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (authHeader) {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const data = await client.auth.getUser(token);
    const userId = data.data.user?.id;
    if (userId) {
      request.userID = userId;
    }
  }

  next();
}