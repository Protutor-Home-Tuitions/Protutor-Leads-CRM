-- ═══════════════════════════════════════════════════════════════════
-- ProTutor CRM — Migration: Form Integration Columns
-- Run ONCE in the Supabase SQL Editor, AFTER supabase-setup-FULL.sql
-- ═══════════════════════════════════════════════════════════════════
--
-- WHAT THIS DOES
-- Adds the columns needed to store everything the client intake form
-- (findtutor.protutor.in) collects, plus two auto-generated columns that
-- show the lead's creation date and time in IST for easy analysis.
--
-- SAFETY
-- Every new column is nullable or has a default, so existing rows are
-- completely unaffected. This migration only ADDS columns; it never
-- changes or removes existing data.
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Columns to capture form data that has no home today.
-- "IF NOT EXISTS" makes this safe to re-run without error.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS country             VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS latitude            VARCHAR(32)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude           VARCHAR(32)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location_address    TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS maps_link           TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS days_per_week       VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hours_per_session   VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hourly_fee          VARCHAR(60)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_estimate    VARCHAR(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quote_accepted      VARCHAR(10)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expected_quote      VARCHAR(60)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS request_id          VARCHAR(64)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_action VARCHAR(20)  DEFAULT NULL;

-- STEP 2: Unique index on request_id.
-- The form sends data twice (initial save, then quote update) using the
-- SAME request_id. This unique rule lets us match the second call to the
-- first row, and guarantees one form session = exactly one lead.
-- Partial index (WHERE request_id IS NOT NULL) so the thousands of
-- existing manual/website leads with no request_id are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_leads_request_id
  ON leads (request_id) WHERE request_id IS NOT NULL;

-- STEP 3: Auto-generated IST date and time columns (read-only).
-- These are computed by the database from created_at. They can never go
-- out of sync because they are not directly editable. Shown in IST
-- (Asia/Kolkata) so they are human-readable at a glance for analysis.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS created_date_ist DATE
    GENERATED ALWAYS AS ((created_at AT TIME ZONE 'Asia/Kolkata')::DATE) STORED,
  ADD COLUMN IF NOT EXISTS created_time_ist TIME
    GENERATED ALWAYS AS ((created_at AT TIME ZONE 'Asia/Kolkata')::TIME) STORED;

-- STEP 4: Helpful index for filtering form leads in the CRM.
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source);
