import express from "express";
import { tavily } from "@tavily/core";
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompts.js";
import { db, checkDbConnection } from "./src/db/index.js";
import { user, conversation, message } from "./src/db/schema.js";
import { eq, desc, asc, and } from "drizzle-orm";
import middleware from "./middleware.js";
import { createSupabaseClient } from "./client.js";
import cors from "cors";


declare module "express-serve-static-core" {
  interface Request {
    userID?: string;
  }
}

const supabaseAdmin = createSupabaseClient();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function resolveUserId(supabaseId?: string): Promise<string | null> {
  const id = supabaseId || 'guest';
  console.log(`[resolveUserId] Resolving DB user ID for Supabase ID: "${id}"`);
  
  try {
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.supabaseID, id))
      .limit(1);
    if (existing.length > 0) {
      console.log(`[resolveUserId] Found existing DB user ID: "${existing[0]!.id}" for Supabase ID: "${id}"`);
      return existing[0]!.id;
    }
    if (!supabaseId) {
      console.log(`[resolveUserId] No Supabase ID provided. Provisioning new Guest user in DB.`);
      const newUser = await db
        .insert(user)
        .values({
          email: 'guest@purpl.ai',
          supabaseID: 'guest',
          authProviders: 'Github',
          name: 'Guest',
        })
        .returning({ id: user.id });
      console.log(`[resolveUserId] Provisioned Guest user with DB user ID: "${newUser[0]?.id}"`);
      return newUser[0]?.id ?? null;
    }
    console.log(`[resolveUserId] No existing DB user found for Supabase ID: "${id}" and it's not a guest. Must sync.`);
    return null;
  } catch (error) {
    console.error(`[resolveUserId] Error resolving user:`, error);
    return null;
  }
}

const app = express();
app.use(express.json());
// const allowedOrigins = [
//   process.env.FRONTEND_URL,
//   'http://localhost:3000',
//   'https://purpl-h4oy.vercel.app',
// ].filter(Boolean) as string[];

app.use(cors());

/**
 * @openapi
 * /users/sync:
 * post:
 * summary: Synchronize Supabase authentication identity with local database.
 * description: Checks if a user profile exists locally; if not, fetches the account profile from Supabase and provisions a database record.
 * security:
 * - BearerAuth: []
 */
app.post("/users/sync", middleware, async (req, res) => {
  console.log(`[users/sync] Starting sync. req.userID from token: "${req.userID}"`);
  try {
    const userId = await resolveUserId(req.userID);
    if (userId) {
      console.log(`[users/sync] User already exists in DB with ID: "${userId}". Sync complete.`);
      return res.json({ userId });
    }

    const supabaseId = req.userID;
    if (!supabaseId) {
      console.log(`[users/sync] No Supabase ID present. Returning userId: null`);
      return res.json({ userId: null });
    }

    console.log(`[users/sync] Fetching user metadata from Supabase Admin API for ID: "${supabaseId}"`);
    const {
      data: { user: supabaseUser },
      error: adminError
    } = await supabaseAdmin.auth.admin.getUserById(supabaseId);

    if (adminError) {
      console.error(`[users/sync] Supabase Admin getUserById error:`, adminError);
      return res.status(400).json({ error: "Failed to fetch user from Supabase Admin" });
    }

    if (!supabaseUser?.email) {
      console.error(`[users/sync] User not found or has no email in Supabase:`, supabaseUser);
      return res.status(400).json({ error: "User not found in Supabase" });
    }

    console.log(`[users/sync] Inserting new user record into DB for email: "${supabaseUser.email}"`);
    const newUser = await db
      .insert(user)
      .values({
        email: supabaseUser.email,
        supabaseID: supabaseId,
        authProviders: "Github",
        name:
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split("@")[0],
      })
      .returning({ id: user.id });

    console.log(`[users/sync] Successfully created user in DB with ID: "${newUser[0]?.id}"`);
    res.json({ userId: newUser[0]?.id });
  } catch (error) {
    console.error("[users/sync] User sync error:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

/**
 * @openapi
 * /conversations:
 * get:
 * summary: Fetch all conversations belonging to the authenticated user.
 * description: Retrieves the list of user conversations ordered by newest first.
 * security:
 * - BearerAuth: []
 */
app.get("/conversations", middleware, async (req, res) => {
  console.log(`[conversations] GET request. req.userID: "${req.userID}"`);
  try {
    const userId = await resolveUserId(req.userID);
    if (!userId) {
      console.log(`[conversations] No DB user resolved. Returning empty conversations list.`);
      return res.json({ conversations: [] });
    }

    const conversations = await db
      .select()
      .from(conversation)
      .where(eq(conversation.userId, userId))
      .orderBy(desc(conversation.id));

    console.log(`[conversations] Fetched ${conversations.length} conversations for user: "${userId}"`);
    res.json({ conversations });
  } catch (error) {
    console.error("[conversations] Get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/**
 * @openapi
 * /conversations:
 * post:
 * summary: Initialize a new thread conversation.
 * body:
 * title: Optional title string for the conversation thread.
 * security:
 * - BearerAuth: []
 */
app.post("/conversations", middleware, async (req, res) => {
  try {
    const userId = await resolveUserId(req.userID);
    if (!userId) return res.status(400).json({ error: "User not found" });

    const newConv = await db
      .insert(conversation)
      .values({
        title: req.body.title || "New Conversation",
        userId,
      })
      .returning();

    res.json({ conversation: newConv[0] });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/**
 * @openapi
 * /conversations/:id:
 * get:
 * summary: Get specific conversation thread details along with its messages.
 * pathParameters:
 * id: The target conversation primary key ID.
 * security:
 * - BearerAuth: []
 */
app.get("/conversations/:id", middleware, async (req, res) => {
  try {
    const convId = parseInt(req.params.id as string);
    const userId = await resolveUserId(req.userID);
    if (!userId) return res.status(400).json({ error: "User not found" });

    const convs = await db
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.id, convId),
          eq(conversation.userId, userId),
        ),
      )
      .limit(1);

    if (convs.length === 0)
      return res.status(404).json({ error: "Conversation not found" });

    const messages = await db
      .select()
      .from(message)
      .where(eq(message.conversationID, convId))
      .orderBy(asc(message.createdAt));

    res.json({ conversation: convs[0], messages });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

/**
 * @openapi
 * /conversations/:id:
 * delete:
 * summary: Delete a conversation thread and all corresponding messages.
 * pathParameters:
 * id: The ID of the conversation to delete.
 * security:
 * - BearerAuth: []
 */
app.delete("/conversations/:id", middleware, async (req, res) => {
  try {
    const convId = parseInt(req.params.id as string);
    const userId = await resolveUserId(req.userID);
    if (!userId) return res.status(400).json({ error: "User not found" });

    await db.delete(message).where(eq(message.conversationID, convId));
    await db
      .delete(conversation)
      .where(
        and(
          eq(conversation.id, convId),
          eq(conversation.userId, userId),
        ),
      );

    res.json({ success: true });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

/**
 * @openapi
 * /ask:
 * post:
 * summary: Processes user queries using dynamic search indexing and streams AI synthesis.
 * description: This endpoint executes Web Search Integration via Tavily, packages findings with prompts,
 * initializes Gemini's content stream generation, and responses utilizing Server-Sent Events (SSE).
 * body:
 * query: The user inquiry prompt.
 * conversationId: Optional parameter; links to an existing conversation identifier or triggers creation of a new thread if omitted.
 * security:
 * - BearerAuth: []
 */
app.post("/ask", middleware, async (req, res) => {
  const { query, conversationId } = req.body;
  console.log(`[ask] POST request. req.userID: "${req.userID}", conversationId: "${conversationId}", query length: ${query?.length ?? 0}`);

  try {
    if (!query) {
      console.warn("[ask] Rejected request: Query is missing");
      return res.status(400).json({ error: "Query is required" });
    }

    const userId = await resolveUserId(req.userID);
    if (!userId) {
      console.error(`[ask] User not resolved in DB for Supabase ID: "${req.userID}"`);
      return res.status(400).json({ error: "User not found", msg: req.userID });
    }

    let convId = conversationId;
    if (!convId) {
      const title = query.length > 80 ? query.slice(0, 80) + "..." : query;
      console.log(`[ask] No conversationId provided. Creating new conversation thread: "${title}"`);
      const newConv = await db
        .insert(conversation)
        .values({
          title,
          userId,
        })
        .returning({ id: conversation.id });
      convId = newConv[0]?.id;
      console.log(`[ask] Created new conversation ID: ${convId}`);
    }

    console.log(`[ask] Inserting user query into message table for conversation ID: ${convId}`);
    await db.insert(message).values({
      content: query,
      role: "user",
      conversationID: convId,
    });

    console.log(`[ask] Executing Tavily web search for query: "${query}"`);
    const webSearchResponse = await tavilyClient.search(query, {
      searchDepth: "advanced",
    });
    const webSearchResults = webSearchResponse.results;
    console.log(`[ask] Tavily search retrieved ${webSearchResults.length} results`);

    const prompt = PROMPT_TEMPLATE.replace(
      "{{WEB_SEARCH_RESULTS}}",
      JSON.stringify(webSearchResults),
    ).replace("{{USER_QUERY}}", query);

    console.log(`[ask] Initializing Gemini stream generateContentStream`);
    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text || "";
      fullText += text;
      res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
    }
    console.log(`[ask] Gemini response stream finished. Total response length: ${fullText.length}`);

    const lines = fullText.split("\n");
    let convTitle = "";
    const followUps: string[] = [];
    const answerLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("TITLE:")) {
        convTitle = line.replace("TITLE:", "").trim();
      } else if (line.startsWith("FOLLOW_UP:")) {
        followUps.push(line.replace("FOLLOW_UP:", "").trim());
      } else {
        answerLines.push(line);
      }
    }
    const answer = answerLines.join("\n").trim();

    console.log(`[ask] Inserting assistant response into message table`);
    await db.insert(message).values({
      content: answer,
      role: "assistant",
      conversationID: convId,
    });

    const finalTitle = convTitle || (query.length > 80 ? query.slice(0, 80) + "..." : query);
    console.log(`[ask] Setting conversation title to: "${finalTitle}"`);
    await db
      .update(conversation)
      .set({ title: finalTitle })
      .where(eq(conversation.id, convId));

    const sources = webSearchResults.map((r) => ({
      title: r.title,
      url: r.url,
    }));
    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "title", title: finalTitle, conversationId: convId })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "followUps", followUps })}\n\n`);
    res.write(
      `data: ${JSON.stringify({ type: "done", conversationId: convId })}\n\n`,
    );
    res.end();
  } catch (error) {
    console.error("[ask] Exception in ask handler:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: (error as Error).message || error });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: "error", error: "Internal server error during streaming" })}\n\n`,
      );
      res.end();
    }
  }
});

app.get("/auth/me", middleware, async (req, res) => {
  try {
    const userId = await resolveUserId(req.userID);
    if (!userId) {
      return res.status(200).json({
        authenticated: false,
        userID: null,
      });
    }
    
    return res.status(200).json({
      authenticated: true,
      userID: req.userID,
    });
  } catch (error) {
    return res.status(500).json({
      authenticated: false,
      message: "user not authorized",
    });
  }
});

// Debug endpoints to assist with testing in production environments

const redactSecret = (val?: string) => {
  if (!val) return "NOT_SET";
  if (val.length <= 8) return "SET_BUT_SHORT";
  return val.substring(0, 8) + "..." + val.substring(val.length - 4);
};

app.get("/debug/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV
  });
});

app.get("/debug/env", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    PORT: 3001,
    DATABASE_URL: redactSecret(process.env.DATABASE_URL),
    SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL,
    SUPABASE_API_SECRET_KEY: redactSecret(process.env.SUPABASE_API_SECRET_KEY),
    FRONTEND_URL: process.env.FRONTEND_URL,
    FRONTEND_LOCAL_URL: process.env.FRONTEND_LOCAL_URL,
    TAVILY_API_KEY: redactSecret(process.env.TAVILY_API_KEY),
    GEMINI_API_KEY: redactSecret(process.env.GEMINI_API_KEY),
  });
});

app.get("/debug/db", async (req, res) => {
  const start = Date.now();
  try {
    const queryResult = await checkDbConnection();
    const duration = Date.now() - start;

    const userCountResult = await db.select({ count: user.id }).from(user).limit(5);

    res.json({
      status: "healthy",
      durationMs: duration,
      queryResult,
      sampleUsersCount: userCountResult.length,
      error: null
    });
  } catch (err) {
    console.error("[DEBUG_API] DB health check failed:", err);
    res.status(500).json({
      status: "unhealthy",
      error: (err as Error).message,
      stack: (err as Error).stack
    });
  }
});

app.get("/debug/auth", async (req, res) => {
  const authHeader = req.headers.authorization;
  const result: Record<string, any> = {
    authHeaderPresent: !!authHeader,
    authHeaderType: authHeader ? (authHeader.startsWith("Bearer ") ? "Bearer" : "Unknown") : null,
    parsedUserID: req.userID || null,
  };

  if (authHeader) {
    try {
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      result.tokenPrefix = token.substring(0, Math.min(10, token.length)) + "...";
      
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      result.supabaseGetUser = {
        success: !error && !!data?.user,
        user: data?.user ? {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
        } : null,
        error: error || null
      };
      
      if (data?.user?.id) {
        const dbUser = await db
          .select()
          .from(user)
          .where(eq(user.supabaseID, data.user.id))
          .limit(1);
        result.localDbUser = dbUser.length > 0 ? dbUser[0] : "Not in DB (Requires Sync)";
      }
    } catch (err) {
      result.supabaseGetUserError = (err as Error).message;
    }
  }
  
  res.json(result);
});

app.get("/debug/test-ai", async (req, res) => {
  try {
    const start = Date.now();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Respond with the word 'SUCCESS' if you can read this.",
    });
    const duration = Date.now() - start;
    res.json({
      status: "connected",
      durationMs: duration,
      response: response.text?.trim(),
      error: null
    });
  } catch (err) {
    console.error("[DEBUG_API] AI test failed:", err);
    res.status(500).json({
      status: "failed",
      error: (err as Error).message,
      stack: (err as Error).stack
    });
  }
});

app.get("/debug/test-search", async (req, res) => {
  try {
    const start = Date.now();
    const searchRes = await tavilyClient.search("test", { maxResults: 1 });
    const duration = Date.now() - start;
    res.json({
      status: "connected",
      durationMs: duration,
      resultsCount: searchRes.results?.length ?? 0,
      sampleTitle: searchRes.results?.[0]?.title ?? "none",
      error: null
    });
  } catch (err) {
    console.error("[DEBUG_API] Search test failed:", err);
    res.status(500).json({
      status: "failed",
      error: (err as Error).message,
      stack: (err as Error).stack
    });
  }
});


app.get("/", (req, res) => res.send("Purpl API"));

app.listen(3001, async () => {
  console.log("Server started on port 3001");
  try {
    await checkDbConnection();
    console.log("Database is connected successfully");
  } catch (err) {
    console.error("Database connection failed:", (err as Error).message);
    console.error("Verify DATABASE_URL is set to your Supabase direct connection string.");
  }
});

export default app;