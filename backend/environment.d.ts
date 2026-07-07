declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GEMINI_API_KEY: string;
      TAVILY_API_KEY: string;
      DATABASE_URL: string;
      FRONTEND_URL: string;
      SUPABASE_PROJECT_URL: string;
      SUPABASE_API_SECRET_KEY: string;
      FRONTEND_LOCAL_URL: string;
      NODE_ENV: string;
      PORT?: string;
      RENDER?: string;
      // You can add other env variables here as well
    }
  }
}

// If this file doesn't have any imports/exports, 
// make it a module by adding an empty export:
export {};