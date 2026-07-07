import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client.js";

const client = createSupabaseClient();

export default async function middleware(request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;
  console.log(`[Middleware] [${request.method}] ${request.path} - Authorization header: ${authHeader ? "Present" : "Missing"}`);

  try {
    if (authHeader) {
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      console.log(`[Middleware] Verifying token (prefix: ${token.substring(0, 10)}...)`);
      
      const { data, error } = await client.auth.getUser(token);
      
      if (error) {
        console.error("[Middleware] Supabase auth error:", error);
      } else if (data?.user) {
        request.userID = data.user.id;
        console.log(`[Middleware] Successfully authenticated user: ${data.user.email} (Supabase ID: ${data.user.id})`);
      } else {
        console.warn("[Middleware] No error returned, but user object is empty");
      }
    }
  } catch (error) {
    console.error("[Middleware] Exception during token verification:", error);
  }

  next();
}