# Purpl

An AI-powered chat app with web search integration.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS (shadcn/ui)
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL (Supabase)
- **Auth**: Supabase Auth (GitHub OAuth)
- **AI**: Google Gemini + Tavily web search

## Getting Started

### 1. Environment Variables

**Frontend** (`frontend/.env`):
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
NEXT_PUBLIC_BACKEND_API=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Backend** (`backend/.env`):
```
DATABASE_URL=<your-database-url>
SUPABASE_PROJECT_URL=<your-supabase-project-url>
SUPABASE_API_SECRET_KEY=<your-supabase-service-role-key>
GITHUB_OAUTH_CLIENT_ID=<your-github-oauth-client-id>
GITHUB_OAUTH_SECRET=<your-github-oauth-secret>
FRONTEND_URL=http://localhost:3000
TAVILY_API_KEY=<your-tavily-key>
GEMINI_API_KEY=<your-gemini-key>
```

### 2. Supabase Auth Configuration

This is the most common source of OAuth redirect issues. In your **Supabase Dashboard → Authentication → Settings**:

| Setting | Value |
|---|---|
| **Site URL** | `https://<your-production-domain>` (e.g. `https://purpl-h4oy.vercel.app`) |
| **Redirect URLs** | `https://<your-production-domain>/auth/callback`, `http://localhost:3000/auth/callback` |

Also enable **GitHub** as a provider in **Authentication → Providers** and configure your GitHub OAuth App with the Supabase callback URL:
```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

### 3. Local Development

```bash
# Terminal 1 — backend
cd backend
bun install
bun run index.ts

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:3001`.

### 4. Deployment (Vercel)

#### Frontend
- Connect your repo to Vercel, set the root directory to `frontend`
- Add these environment variables in the Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_BACKEND_API` — your deployed backend URL (e.g. `https://purpl-68iu.vercel.app`)
  - `NEXT_PUBLIC_SITE_URL` — your deployed frontend URL (e.g. `https://purpl-h4oy.vercel.app`)

**Do not rely on `VERCEL_URL` alone** — set `NEXT_PUBLIC_SITE_URL` explicitly in the production environment.

#### Backend
- Connect your repo to Vercel, set the root directory to `backend`
- Framework preset: **Other**
- Build command: `bun run build` (if you have one) or leave blank
- Output directory: leave blank
- Add all backend environment variables in the Vercel dashboard
- Ensure `FRONTEND_URL` points to your production frontend URL (no trailing slash)
