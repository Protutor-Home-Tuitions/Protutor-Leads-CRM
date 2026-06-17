-- ═══════════════════════════════════════════════════════════════════
-- ProTutor CRM — Migration: online_location field
-- Run ONCE in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════
--
-- WHAT THIS DOES
-- Adds an `online_location` column. For online leads, the `city` column
-- stores the literal value 'Online' (so coordinator filters work), and
-- the parent's typed location (Dubai, Pune, London, etc.) lives in this
-- new column for the team's reference.
--
-- For offline leads, this column stays NULL.
--
-- SAFETY
-- Purely additive. Existing rows get NULL in this column — no other
-- data is modified.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS online_location VARCHAR(200) DEFAULT NULL;

-- Optional but useful for "show me online leads from this region" queries.
CREATE INDEX IF NOT EXISTS idx_leads_online_location
  ON leads (online_location) WHERE online_location IS NOT NULL;
