-- GridFi ERCOT LMP Tracker — Supabase schema
-- Reference only — database is already fully migrated to Phase 2.
-- Do NOT re-run this file against the live database.

-- ─────────────────────────────────────────────────────────────────────────────
-- cycles table
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
  user_id     UUID        REFERENCES auth.users(id),
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
-- Row Level Security — Phase 2 (owner-only, auth required)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON cycles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Useful indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cycles_status      ON cycles (status);
CREATE INDEX IF NOT EXISTS idx_cycles_created_at  ON cycles (created_at DESC);
