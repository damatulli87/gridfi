# GridFi — Deployment Checklist

## One-Time Setup

- [ ] `npm install` — install all dependencies
- [ ] Copy `.env.example` to `.env` and fill in Supabase credentials

## GitHub

- [ ] `git init` in the GridFi folder
- [ ] `git add .` and `git commit -m "Initial commit"`
- [ ] Create repo on github.com and push (`git remote add origin ... && git push -u origin main`)

## Supabase

- [ ] Create Supabase project at supabase.com
- [ ] Run `supabase/schema.sql` in the Supabase SQL Editor
- [ ] Confirm `cycles` table exists in Table Editor
- [ ] Copy **Project URL** and **anon key** from Settings → API

## Vercel

- [ ] Go to vercel.com → Add New Project → Import GitHub repo
- [ ] Add env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy
- [ ] Visit `https://your-app.vercel.app/api/scrape-ercot` — confirm JSON response with nodes
- [ ] Open the app → confirm Dashboard loads and ERCOT data appears

## Optional

- [ ] Enable Supabase Auth and set `REQUIRE_AUTH = true` in `src/lib/AuthContext.jsx`
- [ ] Add RLS Phase 2 policies from `supabase/schema.sql` comments
- [ ] Set up a custom domain in Vercel
