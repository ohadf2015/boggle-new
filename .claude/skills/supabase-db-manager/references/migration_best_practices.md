# Supabase Migration Best Practices

## Migration Naming Convention

Based on the project's existing migrations, follow this pattern:

```
{timestamp}_{descriptive_name}.sql
```

Examples from this project:
- `20251228084415_create_daily_puzzle_leaderboard_view`
- `20251228085128_drop_unused_weekly_quests_table`

**Rules:**
- Use snake_case for migration names
- Be descriptive and specific
- Use verbs that describe the action: `create`, `add`, `update`, `drop`, `alter`, `fix`, etc.
- Keep names concise but informative

## Database Design Patterns

### Standard Column Patterns

Based on existing tables, follow these conventions:

#### Primary Keys
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
```

#### Timestamps
```sql
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

Add update trigger:
```sql
CREATE TRIGGER update_{table_name}_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### User References
```sql
-- For authenticated users
player_id uuid REFERENCES profiles(id)

-- For nullable user references (guest or user)
player_id uuid REFERENCES profiles(id),
guest_fingerprint text
```

#### Common Defaults
```sql
-- Counters
total_games integer DEFAULT 0
total_score integer DEFAULT 0

-- Booleans
is_active boolean DEFAULT true
is_admin boolean DEFAULT false

-- Arrays
tags text[] DEFAULT '{}'

-- JSONB
metadata jsonb DEFAULT '{}'
achievement_counts jsonb DEFAULT '{}'
```

### Foreign Key Patterns

Always name foreign keys explicitly for better error messages:

```sql
ALTER TABLE game_results
  ADD CONSTRAINT game_results_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE; -- or SET NULL, or RESTRICT depending on requirements
```

**Cascade Rules:**
- `ON DELETE CASCADE` - When parent is deleted, delete children (e.g., user deletes account)
- `ON DELETE SET NULL` - When parent is deleted, set FK to NULL (e.g., optional references)
- `ON DELETE RESTRICT` - Prevent deletion if children exist (default, safest)

### Indexes

Create indexes for:
1. **Foreign keys** - Almost always need indexes
2. **Frequent WHERE clauses** - Columns used in filtering
3. **ORDER BY columns** - Columns used for sorting
4. **Unique constraints** - Enforce data integrity

```sql
-- Foreign key index
CREATE INDEX game_results_player_id_idx ON game_results(player_id);

-- Composite index for common queries
CREATE INDEX game_results_player_date_idx ON game_results(player_id, created_at DESC);

-- Unique index
CREATE UNIQUE INDEX profiles_username_idx ON profiles(username);

-- Partial index (for sparse data)
CREATE INDEX profiles_admins_idx ON profiles(id) WHERE is_admin = true;

-- Text search index
CREATE INDEX community_words_word_trgm_idx ON community_words USING gin (word gin_trgm_ops);
```

### Comments

Always add comments to tables and complex columns:

```sql
COMMENT ON TABLE game_results IS
  'Historical game results for analytics';

COMMENT ON COLUMN profiles.total_xp IS
  'Total experience points earned by the player';

COMMENT ON COLUMN community_words.promoted_to_dictionary IS
  'True when word has reached approval threshold and been added to dictionary file';
```

## Migration Structure

### Safe Migration Template

```sql
-- Migration: {descriptive_name}
-- Created: {date}
-- Purpose: {what this migration does and why}

-- ============================================================================
-- STEP 1: Schema Changes
-- ============================================================================

-- Create tables
CREATE TABLE IF NOT EXISTS table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to existing tables
ALTER TABLE existing_table
  ADD COLUMN IF NOT EXISTS new_column text;

-- ============================================================================
-- STEP 2: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS table_name_column_idx ON table_name(column);

-- ============================================================================
-- STEP 3: Foreign Keys and Constraints
-- ============================================================================

ALTER TABLE table_name
  ADD CONSTRAINT table_name_fkey
  FOREIGN KEY (column)
  REFERENCES other_table(id)
  ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE table_name
  ADD CONSTRAINT table_name_check
  CHECK (column IN ('value1', 'value2'));

-- ============================================================================
-- STEP 4: Functions and Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION function_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Function logic
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_name
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION function_name();

-- ============================================================================
-- STEP 5: RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "policy_name"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: Comments
-- ============================================================================

COMMENT ON TABLE table_name IS 'Table purpose and description';
COMMENT ON COLUMN table_name.column IS 'Column purpose and description';

-- ============================================================================
-- STEP 7: Grants (if needed)
-- ============================================================================

GRANT SELECT ON table_name TO authenticated;
GRANT ALL ON table_name TO service_role;
```

### Migration Safety Rules

1. **Use IF NOT EXISTS / IF EXISTS**
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   DROP TABLE IF EXISTS ...
   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
   ```

2. **Make changes additive when possible**
   - Add new columns as nullable first
   - Backfill data in separate migration
   - Make NOT NULL in third migration

3. **Never hardcode UUIDs or generated IDs in migrations**
   ```sql
   -- BAD: Hardcoding UUIDs
   INSERT INTO profiles (id, username) VALUES
     ('123e4567-e89b-12d3-a456-426614174000', 'admin');

   -- GOOD: Let database generate IDs
   INSERT INTO profiles (username) VALUES ('admin')
   RETURNING id;
   ```

4. **Test migrations locally first**
   - Create a branch database
   - Apply migration to branch
   - Verify with advisors
   - Test application functionality
   - Merge to production

5. **Order matters**
   - Create tables before creating indexes on them
   - Create tables before creating foreign keys to them
   - Drop foreign keys before dropping tables
   - Drop triggers before dropping functions

## Common Migration Tasks

### Adding a New Table

```sql
-- Create table with standard structure
CREATE TABLE IF NOT EXISTS new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  value integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX new_table_player_id_idx ON new_table(player_id);
CREATE INDEX new_table_created_at_idx ON new_table(created_at DESC);

-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own records"
  ON new_table FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own records"
  ON new_table FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Add update trigger
CREATE TRIGGER update_new_table_updated_at
  BEFORE UPDATE ON new_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE new_table IS 'Description of what this table stores';
```

### Adding Columns Safely

```sql
-- Step 1: Add as nullable
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS new_field text;

-- Step 2: Backfill (if needed, in separate migration)
UPDATE profiles
SET new_field = 'default_value'
WHERE new_field IS NULL;

-- Step 3: Add constraint (if needed, in third migration)
ALTER TABLE profiles
  ALTER COLUMN new_field SET NOT NULL;
```

### Dropping Columns Safely

```sql
-- Option 1: Rename to deprecated (safer, allows rollback)
ALTER TABLE profiles
  RENAME COLUMN old_field TO old_field_deprecated;

-- Option 2: Drop (only if sure)
ALTER TABLE profiles
  DROP COLUMN IF EXISTS old_field;
```

### Renaming Tables/Columns

```sql
-- Rename table
ALTER TABLE old_name RENAME TO new_name;

-- Rename column
ALTER TABLE table_name
  RENAME COLUMN old_name TO new_name;

-- Note: This won't break foreign keys or indexes
```

## Data Migrations

When migrating data:

```sql
-- Use transactions for safety
BEGIN;

-- Update data
UPDATE table_name
SET column = new_value
WHERE condition;

-- Verify results
SELECT COUNT(*) FROM table_name WHERE condition;

-- If verification passes, commit
COMMIT;

-- If something is wrong, rollback
-- ROLLBACK;
```

## Rollback Strategy

Always consider how to rollback a migration:

```sql
-- In migration: add column
ALTER TABLE profiles ADD COLUMN new_field text;

-- To rollback: drop column
-- ALTER TABLE profiles DROP COLUMN new_field;
```

Keep rollback commands in comments at the top of migration files:

```sql
-- Migration: add_new_field
-- Rollback: ALTER TABLE profiles DROP COLUMN new_field;

ALTER TABLE profiles ADD COLUMN new_field text;
```

## Performance Considerations

1. **Creating indexes on large tables**
   ```sql
   -- Use CONCURRENTLY to avoid locking (slower but safer)
   CREATE INDEX CONCURRENTLY idx_name ON table_name(column);
   ```

2. **Batch updates on large tables**
   ```sql
   -- Update in batches
   UPDATE table_name
   SET column = new_value
   WHERE id IN (
     SELECT id FROM table_name
     WHERE condition
     LIMIT 1000
   );
   ```

3. **Avoid full table scans**
   - Create indexes before adding foreign keys
   - Use WHERE clauses in updates
   - Consider partial indexes for sparse data

## Verification After Migration

Always verify after applying a migration:

```bash
# Run security advisors
Check for missing RLS policies

# Run performance advisors
Check for missing indexes

# Test application
Verify functionality works as expected
```
