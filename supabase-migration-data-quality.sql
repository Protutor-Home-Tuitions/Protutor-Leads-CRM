-- ═══════════════════════════════════════════════════════════════════
-- ProTutor CRM — Migration: data_quality field
-- Run ONCE in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════
--
-- WHAT THIS DOES
-- Adds a data_quality column to track whether an incoming form lead had
-- all the essentials (parent name, mobile, class mode, city) — useful
-- when the API is in "save anything with a mobile" mode.
--
-- Values:
--   'complete' — every essential field present
--   'partial'  — mobile present but something else missing
--   NULL       — leads predating this column (existing rows)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS data_quality VARCHAR(20) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_data_quality
  ON leads (data_quality) WHERE data_quality IS NOT NULL;
