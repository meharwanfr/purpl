import express from "express";
import { tavily } from "@tavily/core"
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompts";
// import z from "zod";

import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!);


// gemini ai 
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// tavily client
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

const app = express();

app.use(express.json())

app.post("/ask", async (req, res) => {
    // user's query string
    const query = req.body.query;

    // getting web search response from tavily client
    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    });


    //extracting results(links, content, titles etc) from web search resp
    const webSearchResults = webSearchResponse.results;

    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResults))
        .replace("{{USER_QUERY}}", query);



    // const ingredientSchema = z.object({
    //     name: z.string().describe("Name of the ingredient."),
    //     quantity: z.string().describe("Quantity of the ingredient, including units."),
    // });

    // const recipeSchema = z.object({
    //     recipe_name: z.string().describe("The name of the recipe."),
    //     prep_time_minutes: z.number().optional().describe("Optional time in minutes to prepare the recipe."),
    //     ingredients: z.array(ingredientSchema),
    //     instructions: z.array(z.string()),
    // });


    // requesting gemini with web
    const response = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            // responseJsonSchema: z.toJSONSchema(z.object({
            //     followUps: z.array(z.string()),
            //     answer: z.string(),
            // })),
        }
    });

    res.header('Cache-Control', 'no-cache');
    res.header('Content-Type', 'text/event-stream');

    for await (const chunk of response) {
        res.write(chunk.text);
    };

    res.write("\n<SOURCES>\n");

    res.write(webSearchResults.forEach(result => ({ title: result.title, url: result.url, })));


    res.write("\n<SOURCES>\n");

    res.end("\n------------END-----------------\n");
})


app.get("/", (req, res) => [
    res.send("hellow ")
])

app.listen(3000);