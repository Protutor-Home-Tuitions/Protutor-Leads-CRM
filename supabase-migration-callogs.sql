-- ═══════════════════════════════════════════════════════════════════
-- ProTutor CRM — Migration: atomic call-log numbering
-- Run this ONCE in the Supabase SQL Editor, AFTER supabase-setup-FULL.sql
-- ═══════════════════════════════════════════════════════════════════
--
-- WHY THIS EXISTS
-- The old code computed the call sequence number (`n`) in JavaScript:
--   1. read the current highest n
--   2. add 1
--   3. insert
-- If two calls were logged at the same moment, both read the same highest
-- number and both wrote the same `n` — producing duplicates. (This is the
-- bug behind the repeated "fixed call logs" commits.)
--
-- The fix: let the DATABASE compute `n` and insert the row in a single
-- atomic operation, and add a UNIQUE rule so a duplicate can never be
-- stored even if something else goes wrong.
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Guarantee uniqueness of n within each parent.
-- Partial unique indexes: one for lead-attached logs, one for call_data.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_call_logs_lead_n
  ON call_logs (lead_id, n) WHERE lead_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_call_logs_calldata_n
  ON call_logs (calldata_id, n) WHERE calldata_id IS NOT NULL;

-- STEP 2: One function that inserts a call log with the next `n`,
-- computed atomically. Pass EITHER p_lead_id OR p_calldata_id (not both).
-- It also stores the user's UUID (p_user_id), not just their name, so
-- actions can be attributed reliably.
CREATE OR REPLACE FUNCTION add_call_log(
  p_lead_id        UUID,
  p_calldata_id    UUID,
  p_status         TEXT,
  p_notes          TEXT,
  p_user_id        UUID,
  p_user_name      TEXT,
  p_is_open        BOOLEAN,
  p_followup_date  TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  next_n INTEGER;
BEGIN
  -- Lock the relevant rows so concurrent inserts wait their turn, then
  -- compute the next number. COALESCE handles the "no logs yet" case.
  IF p_lead_id IS NOT NULL THEN
    SELECT COALESCE(MAX(n), 0) + 1 INTO next_n
      FROM call_logs WHERE lead_id = p_lead_id FOR UPDATE;
  ELSE
    SELECT COALESCE(MAX(n), 0) + 1 INTO next_n
      FROM call_logs WHERE calldata_id = p_calldata_id FOR UPDATE;
  END IF;

  INSERT INTO call_logs (
    lead_id, calldata_id, n, status, notes,
    called_by_id, called_by_name, is_open, followup_date
  ) VALUES (
    p_lead_id, p_calldata_id, next_n, p_status, COALESCE(p_notes, ''),
    p_user_id, COALESCE(p_user_name, ''), p_is_open, p_followup_date
  );

  -- Keep the parent record's status / followup in sync.
  IF p_lead_id IS NOT NULL THEN
    UPDATE leads
      SET status        = CASE WHEN p_is_open THEN 'open' ELSE 'closed' END,
          followup_date = p_followup_date
      WHERE id = p_lead_id;
  ELSE
    UPDATE call_data
      SET status        = CASE WHEN p_is_open THEN 'open' ELSE 'closed' END,
          followup_date = p_followup_date
      WHERE id = p_calldata_id;
  END IF;
END;
$$;
