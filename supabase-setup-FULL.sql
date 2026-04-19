-- ═══════════════════════════════════════════════════════════════════
-- ProTutor CRM — FULL DATABASE SETUP
-- Run this ENTIRE script in Supabase SQL Editor (in one go)
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 2: ENUMs (ignore errors if already exist)
DO $$ BEGIN
  CREATE TYPE user_role    AS ENUM ('manager','coordinator','support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE user_status  AS ENUM ('Active','Inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE lead_status  AS ENUM ('open','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE class_mode   AS ENUM ('Any','Online','Offline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE tutor_gender AS ENUM ('Any','Male','Female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE importance   AS ENUM ('Immediately','This month','Next month');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE cd_category  AS ENUM ('Client','Tutor','Unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- STEP 3: USERS table
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  fname         VARCHAR(100) NOT NULL,
  lname         VARCHAR(100) NOT NULL DEFAULT '',
  email         VARCHAR(255) NOT NULL UNIQUE,
  mobile        VARCHAR(20)  NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'coordinator',
  status        user_status  NOT NULL DEFAULT 'Active',
  cities        TEXT[]       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- STEP 4: LEADS table
CREATE TABLE IF NOT EXISTS leads (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_name      VARCHAR(200) NOT NULL DEFAULT '',
  student_name     VARCHAR(200) NOT NULL DEFAULT '',
  country_code     VARCHAR(5)   NOT NULL DEFAULT '91',
  mobile           VARCHAR(20)  NOT NULL,
  city             VARCHAR(50)  NOT NULL DEFAULT '',
  locality         VARCHAR(200) NOT NULL DEFAULT '',
  standard         VARCHAR(100) NOT NULL DEFAULT '',
  subjects         TEXT         NOT NULL DEFAULT '',
  source           VARCHAR(50)  NOT NULL DEFAULT '',
  entry_date       DATE         NOT NULL DEFAULT CURRENT_DATE,
  status           lead_status  NOT NULL DEFAULT 'open',
  starred          BOOLEAN      NOT NULL DEFAULT FALSE,
  email            VARCHAR(255) NOT NULL DEFAULT '',
  tutor_gender     tutor_gender DEFAULT NULL,
  importance_level importance   DEFAULT NULL,
  class_mode       class_mode   DEFAULT NULL,
  notes            TEXT         NOT NULL DEFAULT '',
  added_by         UUID         REFERENCES users(id) ON DELETE SET NULL,
  added_by_name    VARCHAR(100) NOT NULL DEFAULT '',
  followup_date    TIMESTAMPTZ  DEFAULT NULL,
  msg_count        INTEGER      NOT NULL DEFAULT 0,
  moved_to_support BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- STEP 5: CALL_DATA table
CREATE TABLE IF NOT EXISTS call_data (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code  VARCHAR(5)   NOT NULL DEFAULT '91',
  phone         VARCHAR(20)  NOT NULL,
  name          VARCHAR(200) NOT NULL DEFAULT '',
  city          VARCHAR(50)  DEFAULT NULL,
  category      cd_category  DEFAULT NULL,
  source        VARCHAR(50)  DEFAULT NULL,
  entry_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
  status        lead_status  NOT NULL DEFAULT 'open',
  followup_date TIMESTAMPTZ  DEFAULT NULL,
  msg_count     INTEGER      NOT NULL DEFAULT 0,
  added_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
  added_by_name VARCHAR(100) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- STEP 6: CALL_LOGS table
CREATE TABLE IF NOT EXISTS call_logs (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id        UUID         REFERENCES leads(id) ON DELETE CASCADE,
  calldata_id    UUID         REFERENCES call_data(id) ON DELETE CASCADE,
  n              INTEGER      NOT NULL,
  status         VARCHAR(100) NOT NULL,
  notes          TEXT         NOT NULL DEFAULT '',
  logged_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  called_by_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
  called_by_name VARCHAR(100) NOT NULL DEFAULT '',
  is_open        BOOLEAN      NOT NULL DEFAULT TRUE,
  followup_date  TIMESTAMPTZ  DEFAULT NULL,
  CONSTRAINT one_parent CHECK (
    (lead_id IS NOT NULL)::int + (calldata_id IS NOT NULL)::int = 1
  )
);

-- STEP 7: Indexes
CREATE INDEX IF NOT EXISTS idx_leads_city      ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_mobile    ON leads(mobile);
CREATE INDEX IF NOT EXISTS idx_leads_followup  ON leads(followup_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_call_logs_lead  ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_cd    ON call_logs(calldata_id);
CREATE INDEX IF NOT EXISTS idx_call_data_phone ON call_data(phone);
CREATE INDEX IF NOT EXISTS idx_call_data_status ON call_data(status);

-- STEP 8: Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated ON leads;
CREATE TRIGGER trg_leads_updated
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_call_data_updated ON call_data;
CREATE TRIGGER trg_call_data_updated
  BEFORE UPDATE ON call_data
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- STEP 9: Auth functions
CREATE OR REPLACE FUNCTION verify_user_password(p_email TEXT, p_password TEXT)
RETURNS TABLE(
  id UUID, fname TEXT, lname TEXT, email TEXT,
  role TEXT, cities TEXT[], status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.fname::TEXT, u.lname::TEXT, u.email::TEXT,
         u.role::TEXT, u.cities, u.status::TEXT
  FROM users u
  WHERE u.email = lower(trim(p_email))
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.status = 'Active';
END;
$$;

CREATE OR REPLACE FUNCTION hash_password(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf', 10));
END;
$$;

-- STEP 10: Seed users (Vignesh = manager, Suvija = coordinator)
-- Change the passwords below before running if needed
INSERT INTO users (fname, lname, email, mobile, password_hash, role, status, cities)
VALUES
  (
    'Vignesh', '',
    'admin@protutor.in',
    '9042120201',
    crypt('password', gen_salt('bf', 10)),
    'manager',
    'Active',
    ARRAY['Bangalore','Chennai','Hyderabad','Mumbai','Pune','Kolkata']
  ),
  (
    'Suvija', '',
    'protutorbangalore@gmail.com',
    '6379320270',
    crypt('password', gen_salt('bf', 10)),
    'coordinator',
    'Active',
    ARRAY['Bangalore']
  )
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT 'users' as table_name, COUNT(*) as rows FROM users
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'call_data', COUNT(*) FROM call_data
UNION ALL
SELECT 'call_logs', COUNT(*) FROM call_logs;
