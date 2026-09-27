# Row Level Security (RLS) Patterns and Best Practices

## Core Principles

1. **Enable RLS on ALL public tables** - Tables without RLS are a critical security vulnerability
2. **Deny by default** - RLS policies should explicitly grant access, not restrict it
3. **Use security definer functions sparingly** - They bypass RLS and can create vulnerabilities
4. **Test policies thoroughly** - Always verify policies work as expected for different user roles

## Common RLS Patterns

### Pattern 1: User Owns Row (Most Common)

For tables where each row belongs to a specific user.

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view own data"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "Users can insert own data"
  ON table_name
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
  ON table_name
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own data
CREATE POLICY "Users can delete own data"
  ON table_name
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Pattern 2: Public Read, Authenticated Write

For tables that anyone can read but only authenticated users can modify.

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Public read access"
  ON table_name
  FOR SELECT
  USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can insert"
  ON table_name
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### Pattern 3: Admin Only Access

For sensitive tables that only admins should access.

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Only admins can do anything
CREATE POLICY "Admin full access"
  ON table_name
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

### Pattern 4: Guest and Authenticated Access

For tables that support both guest tokens and authenticated users.

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view their own data
CREATE POLICY "Users can view own data"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);

-- Guest users can view data associated with their guest token
CREATE POLICY "Guests can view own data via token"
  ON table_name
  FOR SELECT
  USING (
    guest_fingerprint IS NOT NULL
    AND guest_fingerprint = current_setting('request.headers', true)::json->>'x-guest-fingerprint'
  );
```

### Pattern 5: Read All, Write Own

For leaderboards and similar data where everyone can see all rows but only modify their own.

```sql
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Anyone can read all leaderboard entries
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard
  FOR SELECT
  USING (true);

-- Users can only update their own entry
CREATE POLICY "Users can update own entry"
  ON leaderboard
  FOR UPDATE
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);
```

### Pattern 6: Foreign Key Based Access

For tables with data related to user-owned resources.

```sql
-- Example: game_results table related to profiles table
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game results"
  ON game_results
  FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own game results"
  ON game_results
  FOR INSERT
  WITH CHECK (auth.uid() = player_id);
```

## Security Definer Views

**⚠️ CRITICAL: Avoid security definer views when possible**

Security definer views execute with the permissions of the view creator, bypassing RLS. This can create security vulnerabilities.

### When to Use

Only use security definer views when:
1. You need to aggregate data across multiple users for analytics
2. The view doesn't expose sensitive individual user data
3. There's no way to achieve the same result with RLS policies

### Safer Alternative

Instead of security definer views, prefer:
1. **Computed columns** - Use generated columns for simple aggregations
2. **Functions with SECURITY INVOKER** - Functions that run with caller's permissions
3. **Materialized views with RLS** - Pre-compute data but still apply RLS

### If You Must Use Security Definer

```sql
-- ONLY use for non-sensitive aggregated data
CREATE VIEW daily_puzzle_leaderboard
WITH (security_invoker = false) -- Makes it security definer
AS
SELECT
  puzzle_date,
  COUNT(*) as total_attempts,
  AVG(score) as average_score
FROM daily_puzzle_attempts
GROUP BY puzzle_date;

-- Document why security definer is needed
COMMENT ON VIEW daily_puzzle_leaderboard IS
  'Security definer required for cross-user aggregation. View only exposes non-sensitive aggregate statistics.';
```

## Function Security

### Set search_path for All Functions

**⚠️ CRITICAL: Always set search_path for security**

Functions without an explicit search_path are vulnerable to search path injection attacks.

```sql
-- GOOD: Explicit search_path
CREATE OR REPLACE FUNCTION update_profile_stats(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Function logic
END;
$$;

-- BAD: No search_path (vulnerable)
CREATE OR REPLACE FUNCTION update_profile_stats(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Function logic
END;
$$;
```

### Security Definer Functions

Use `SECURITY DEFINER` sparingly and carefully:

```sql
CREATE OR REPLACE FUNCTION privileged_operation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator's permissions
SET search_path = public, pg_temp -- Required for security
AS $$
BEGIN
  -- Validate caller has permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Perform privileged operation
END;
$$;
```

## Testing RLS Policies

Always test RLS policies from the perspective of different users:

```sql
-- Test as a specific user
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Try to access data
SELECT * FROM table_name;

-- Reset
RESET role;
```

## Common Mistakes to Avoid

1. **Forgetting to enable RLS** - Always run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. **Using SELECT in WITH CHECK** - WITH CHECK only applies to the row being inserted/updated, not related rows
3. **Overly complex policies** - Keep policies simple and performant
4. **Not testing with real user JWTs** - Always test policies from the application
5. **Leaking data through errors** - Avoid error messages that reveal data existence
6. **Security definer without validation** - Always validate caller permissions in SECURITY DEFINER functions

## Migration Checklist for New Tables

When creating a new table:

- [ ] Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- [ ] Create SELECT policy
- [ ] Create INSERT policy
- [ ] Create UPDATE policy
- [ ] Create DELETE policy
- [ ] Test policies with different users
- [ ] Add table comment documenting access patterns
- [ ] Run security advisors to verify
