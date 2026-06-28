import express from "express";
import { tavily } from "@tavily/core";
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompts.js";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { user, conversation, message } from "./src/db/schema.js";
import { eq, desc, asc, and } from "drizzle-orm";
import middleware from "./middleware.js";
import { createSupabaseClient } from "./client.js";
import cors from "cors";

/**
 * Extends the Express Request interface to include custom properties
 * injected by authentication middleware.
 */
declare module "express-serve-static-core" {
  interface Request {
    /** The authenticated user's unique identity token from Supabase */
    userID?: string;
  }
}

/** * Database connection client powered by Drizzle ORM.
 * @type {import("drizzle-orm/node-postgres").NodePgDatabase}
 */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

/** Supabase Administration Client for server-side management tasks. */
const supabaseAdmin = createSupabaseClient();

/** Google GenAI Client instance utilizing the Gemini API. */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/** Tavily Client instance used for fetching advanced web search results. */
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function resolveUserId(supabaseId?: string): Promise<string | null> {
  const id = supabaseId || 'guest';
  try {
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.supabaseID, id))
      .limit(1);
    if (existing.length > 0) {
      return existing[0]!.id;
    }
    if (!supabaseId) {
      const newUser = await db
        .insert(user)
        .values({
          email: 'guest@purpl.ai',
          supabaseID: 'guest',
          authProviders: 'Github',
          name: 'Guest',
        })
        .returning({ id: user.id });
      return newUser[0]?.id ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

const app = express();
app.use(express.json());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://purpl-h4oy.vercel.app',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, allowedOrigins[0]);
    }
  },
  credentials: true,
}));

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
  try {
    const userId = await resolveUserId(req.userID);
    if (userId) {
      return res.json({ userId });
    }

    const supabaseId = req.userID;
    if (!supabaseId) {
      return res.json({ userId: null });
    }

    const {
      data: { user: supabaseUser },
    } = await supabaseAdmin.auth.admin.getUserById(supabaseId);
    if (!supabaseUser?.email) {
      return res.status(400).json({ error: "User not found in Supabase" });
    }

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

    res.json({ userId: newUser[0]?.id });
  } catch (error) {
    console.error("User sync error:", error);
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
  try {
    const userId = await resolveUserId(req.userID);
    if (!userId) return res.json({ conversations: [] });

    const conversations = await db
      .select()
      .from(conversation)
      .where(eq(conversation.userId, userId))
      .orderBy(desc(conversation.id));

    res.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
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
  try {
    const { query, conversationId } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    const userId = await resolveUserId(req.userID);
    if (!userId) return res.status(400).json({ error: "User not found" });

    let convId = conversationId;
    if (!convId) {
      const title = query.length > 80 ? query.slice(0, 80) + "..." : query;
      const newConv = await db
        .insert(conversation)
        .values({
          title,
          userId,
        })
        .returning({ id: conversation.id });
      convId = newConv[0]?.id;
    }

    await db.insert(message).values({
      content: query,
      role: "user",
      conversationID: convId,
    });

    const webSearchResponse = await tavilyClient.search(query, {
      searchDepth: "advanced",
    });
    const webSearchResults = webSearchResponse.results;

    const prompt = PROMPT_TEMPLATE.replace(
      "{{WEB_SEARCH_RESULTS}}",
      JSON.stringify(webSearchResults),
    ).replace("{{USER_QUERY}}", query);

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

    await db.insert(message).values({
      content: answer,
      role: "assistant",
      conversationID: convId,
    });

    const finalTitle = convTitle || (query.length > 80 ? query.slice(0, 80) + "..." : query);
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
    console.error("Ask error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process query" });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: "error", error: "Internal server error" })}\n\n`,
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

/**
 * Health check / Base root route endpoint.
 */
app.get("/", (req, res) => res.send("Purpl API"));

/** Bind application server on specific networking interface port. */
app.listen(3001, async () => {
  console.log("Server started on port 3001");
  try {
    await pool.query("SELECT 1");
    console.log("Database is connected successfully");
  } catch (err) {
    console.error("Database connection failed:", (err as Error).message);
    console.error("Verify DATABASE_URL is set correctly. For Vercel deployment, use the Supabase transaction pooler connection string (port 6543).");
  }
});


export default app;