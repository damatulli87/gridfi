# GridFi — Deployment Guide

## Prerequisites
- Node.js 18+
- A GitHub account
- A Supabase account (free tier works)
- A Vercel account (free tier works)

---

## Step 1 — Push to GitHub

```bash
# In the GridFi folder:
git init
git add .
git commit -m "Initial GridFi commit"
git branch -M main
# Create a new repo at github.com/new, then:
git remote add origin https://github.com/YOUR_USERNAME/gridfi.git
git push -u origin main
```

---

## Step 2 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Give it a name (e.g. `gridfi`) and choose a region close to you
3. Save the **database password** somewhere safe — you won't need it for the app, but you'll need it for direct DB access
4. Wait for the project to finish provisioning (~1 minute)

---

## Step 3 — Run the SQL Schema

1. In your Supabase project, go to **SQL Editor → New query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**
4. Confirm the `cycles` table appears in **Table Editor**

---

## Step 4 — Get Supabase Credentials

1. In your Supabase project, go to **Settings → API**
2. Copy:
   - **Project URL** → this is your `VITE_SUPABASE_URL`
   - **anon / public key** → this is your `VITE_SUPABASE_ANON_KEY`

---

## Step 5 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo (`gridfi`)
3. Vercel will auto-detect Vite — leave defaults as-is
4. Before clicking **Deploy**, go to **Environment Variables** and add:
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
5. Click **Deploy**

> Vercel will run `npm run build` and serve the `dist/` folder.  
> The `api/scrape-ercot.js` file is automatically deployed as a serverless function at `/api/scrape-ercot`.

---

## Step 6 — Test ERCOT Scraping

After deployment, open your Vercel URL and append `/api/scrape-ercot`:

```
https://your-app.vercel.app/api/scrape-ercot
```

You should get a JSON response like:
```json
{
  "lastUpdated": "05/14/2026 10:55:00",
  "nodeCount": 543,
  "nodes": [
    { "name": "HB_HOUSTON", "lmp": 24.53, "change5min": -0.12, "nodeType": "Hub" },
    ...
  ],
  "fetchedAt": "2026-05-14T16:00:01.000Z"
}
```

If you see `{ "error": "Failed to fetch ERCOT data..." }`, ERCOT's site may be temporarily down — retry in a few minutes.

---

## Local Development

```bash
# 1. Copy env file
cp .env.example .env
# 2. Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env

# 3. Install deps
npm install

# 4. Start dev server
npm run dev
```

> Note: The Vercel serverless function (`/api/scrape-ercot`) runs automatically in `vercel dev`. For plain `npm run dev`, the frontend will call `/api/scrape-ercot` which Vite will proxy to Vercel's local dev runtime if you run `vercel dev` instead.  
> **Quickest local test:** run `vercel dev` (install Vercel CLI: `npm i -g vercel`) instead of `npm run dev`.

---

## Enabling Auth (Phase 2)

When you're ready to require login:

1. In Supabase → **Authentication → Providers**, enable Email or OAuth providers
2. Open `src/lib/AuthContext.jsx` and set `REQUIRE_AUTH = true`, then uncomment the `useEffect` block
3. In `supabase/schema.sql`, run the Phase 2 RLS policy section (add `user_id` column, swap policies)
4. Redeploy

---

## Architecture Summary

```
src/
  api/
    supabaseClient.js   — Supabase JS client (env-driven)
    cycleService.js     — CRUD wrapper (Cycle.filter/create/update/delete)
  lib/
    AuthContext.jsx     — Optional auth (REQUIRE_AUTH flag)
  pages/
    Dashboard.jsx       — Calls /api/scrape-ercot + cycleService
    History.jsx         — Calls cycleService

api/
  scrape-ercot.js       — Vercel serverless: fetches & parses ERCOT NP6788

supabase/
  schema.sql            — cycles table + RLS policies
```
