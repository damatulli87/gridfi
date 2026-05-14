-- GridFi ERCOT LMP Tracker — Supabase schema
-- Run this in the Supabase SQL Editor after creating your project.

-- ─────────────────────────────────────────────────────────────────────────────
-- cycles table
-- Intervals are stored as a JSONB array so the frontend can read/write them
-- in a single round-trip, matching the original Base44 entity structure.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  date        DATE,
  node        TEXT        NOT NULL,
  mode        TEXT        NOT NULL CHECK (mode IN ('charging', 'discharging')),
  power_mw    NUMERIC     NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'completed')),
  start_time  TIMESTAMPTZ,
  end_time    TIMESTAMPTZ,
  notes       TEXT,
  intervals   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update updated_at
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cycles_updated_at ON cycles;
CREATE TRIGGER cycles_updated_at
  BEFORE UPDATE ON cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Phase 1 (no auth): public read/write — any request can access all rows.
-- Phase 2 (auth enabled): uncomment the user-scoped policy and disable the
--   public one after wiring up Supabase Auth in AuthContext.jsx.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

-- PHASE 1 — open access (no login required)
CREATE POLICY "public_all" ON cycles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- PHASE 2 — uncomment when auth is required:
-- ALTER TABLE cycles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- DROP POLICY IF EXISTS "public_all" ON cycles;
-- CREATE POLICY "owner_only" ON cycles
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Useful indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cycles_status      ON cycles (status);
CREATE INDEX IF NOT EXISTS idx_cycles_created_at  ON cycles (created_at DESC);
