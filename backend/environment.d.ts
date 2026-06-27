declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GEMINI_API_KEY: string;
      TAVILY_API_KEY: string;
      DATABASE_URL: string;
      FRONTEND_URL: string;
      // You can add other env variables here as well
    }
  }
}

// If this file doesn't have any imports/exports, 
// make it a module by adding an empty export:
export {};