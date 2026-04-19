-- ═══════════════════════════════════════════════════════════
-- Run BOTH of these in Supabase SQL Editor BEFORE deploying
-- ═══════════════════════════════════════════════════════════

-- 1. Verifies login password using pgcrypto
CREATE OR REPLACE FUNCTION verify_user_password(p_email TEXT, p_password TEXT)
RETURNS TABLE(
  id UUID, fname TEXT, lname TEXT, email TEXT,
  role TEXT, cities TEXT[], status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id, u.fname::TEXT, u.lname::TEXT, u.email::TEXT,
    u.role::TEXT, u.cities, u.status::TEXT
  FROM users u
  WHERE u.email = lower(trim(p_email))
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.status = 'Active';
END;
$$;

-- 2. Hashes a password for storage (used when creating new users)
CREATE OR REPLACE FUNCTION hash_password(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf', 10));
END;
$$;
