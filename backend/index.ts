import express from "express";
import { tavily } from "@tavily/core";
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompts";
import { drizzle } from "drizzle-orm/node-postgres";
import { user, conversation, message } from "./src/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import middleware from "./middleware";
import { createSupabaseClient } from "./client";
import cors from "cors";

declare module "express-serve-static-core" {
  interface Request {
    userID?: string;
  }
}

const db = drizzle(process.env.DATABASE_URL!);
const supabaseAdmin = createSupabaseClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

const app = express();
app.use(express.json());
app.use(cors());

app.post("/users/sync", middleware, async (req, res) => {
  try {
    const supabaseId = req.userID!;

    const existing = await db.select().from(user).where(eq(user.supabaseID, supabaseId)).limit(1);
    if (existing.length > 0) {
      return res.json({ userId: existing[0]!.id });
    }

    const { data: { user: supabaseUser } } = await supabaseAdmin.auth.admin.getUserById(supabaseId);
    if (!supabaseUser?.email) {
      return res.status(400).json({ error: "User not found in Supabase" });
    }

    const newUser = await db.insert(user).values({
      email: supabaseUser.email,
      supabaseID: supabaseId,
      authProviders: "Github",
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0],
    }).returning({ id: user.id });

    res.json({ userId: newUser[0]?.id });
  } catch (error) {
    console.error("User sync error:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

app.get("/conversations", middleware, async (req, res) => {
  try {
    const supabaseId = req.userID!;
    const dbUser = await db.select().from(user).where(eq(user.supabaseID, supabaseId)).limit(1);
    if (dbUser.length === 0) return res.status(400).json({ error: "User not found" });

    const conversations = await db.select()
      .from(conversation)
      .where(eq(conversation.userId, dbUser[0]!.id))
      .orderBy(desc(conversation.id));

    res.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.post("/conversations", middleware, async (req, res) => {
  try {
    const supabaseId = req.userID!;
    const dbUser = await db.select().from(user).where(eq(user.supabaseID, supabaseId)).limit(1);
    if (dbUser.length === 0) return res.status(400).json({ error: "User not found" });

    const newConv = await db.insert(conversation).values({
      title: req.body.title || "New Conversation",
      userId: dbUser[0]!.id,
    }).returning();

    res.json({ conversation: newConv[0] });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.get("/conversations/:id", middleware, async (req, res) => {
  try {
    const supabaseId = req.userID!;
    const convId = parseInt(req.params.id as string);

    const dbUser = await db.select().from(user).where(eq(user.supabaseID, supabaseId)).limit(1);
    if (dbUser.length === 0) return res.status(400).json({ error: "User not found" });

    const convs = await db.select().from(conversation)
      .where(and(eq(conversation.id, convId), eq(conversation.userId, dbUser[0]!.id)))
      .limit(1);

    if (convs.length === 0) return res.status(404).json({ error: "Conversation not found" });

    const messages = await db.select()
      .from(message)
      .where(eq(message.conversationID, convId))
      .orderBy(asc(message.createdAt));

    res.json({ conversation: convs[0], messages });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

app.delete("/conversations/:id", middleware, async (req, res) => {
  try {
    const supabaseId = req.userID!;
    
    const convId = parseInt(req.params.id as string); 


    const dbUser = await db.select().from(user).where(eq(user.supabaseID, supabaseId)).limit(1);
    if (dbUser.length === 0) return res.status(400).json({ error: "User not found" });

    await db.delete(message).where(eq(message.conversationID, convId));
    await db.delete(conversation).where(
      and(eq(conversation.id, convId), eq(conversation.userId, dbUser[0]!.id))
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

app.post("/ask", middleware, async (req, res) => {
  try {
    const { query, conversationId } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    const supabaseId = req.userID!;
    const dbUser = await db.select().from(user).where(eq(user.supabaseID, supabaseId)).limit(1);
    if (dbUser.length === 0) return res.status(400).json({ error: "User not found" });

    let convId = conversationId;
    if (!convId) {
      const title = query.length > 80 ? query.slice(0, 80) + "..." : query;
      const newConv = await db.insert(conversation).values({
        title,
        userId: dbUser[0]!.id,
      }).returning({ id: conversation.id });
      convId = newConv[0]?.id;
    }

    await db.insert(message).values({
      content: query,
      role: "user",
      conversationID: convId,
    });

    const webSearchResponse = await tavilyClient.search(query, { searchDepth: "advanced" });
    const webSearchResults = webSearchResponse.results;

    const prompt = PROMPT_TEMPLATE
      .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResults))
      .replace("{{USER_QUERY}}", query);

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
    const followUps: string[] = [];
    const answerLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("FOLLOW_UP:")) {
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

    if (!conversationId) {
      const title = query.length > 80 ? query.slice(0, 80) + "..." : query;
      await db.update(conversation)
        .set({ title })
        .where(eq(conversation.id, convId));
    }

    const sources = webSearchResults.map(r => ({ title: r.title, url: r.url }));
    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "followUps", followUps })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done", conversationId: convId })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Ask error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process query" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Internal server error" })}\n\n`);
      res.end();
    }
  }
});

app.get("/", (req, res) => res.send("Purpl API"));

app.listen(3001, () => {
  console.log("Server started on port 3001");
  if (db) console.log("Database is connected successfully");
});
