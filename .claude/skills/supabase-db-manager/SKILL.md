---
name: supabase-db-manager
description: Comprehensive Supabase database management skill for creating migrations, managing RLS policies, optimizing performance, and maintaining database security. Use when creating/modifying database schema, auditing security, fixing RLS issues, adding indexes, or performing any Supabase database operations. Automatically applies project conventions and best practices.
---

# Supabase Database Manager

## Overview

Manage Supabase databases with best practices for migrations, Row Level Security (RLS), performance optimization, and security auditing. This skill ensures all database operations follow the project's conventions and Supabase best practices.

## When to Use This Skill

Use this skill for ANY Supabase database operations, including:

- **Creating migrations** - New tables, columns, indexes, or schema changes
- **Managing RLS policies** - Creating, updating, or auditing Row Level Security
- **Security auditing** - Finding and fixing security vulnerabilities
- **Performance optimization** - Adding indexes, optimizing queries
- **Database maintenance** - Triggers, functions, constraints, foreign keys
- **Security fixes** - Fixing function search_path, security definer issues
- **Table modifications** - Adding/removing columns, changing constraints

The skill automatically:
- ✅ Uses MCP tools to explore current database state
- ✅ Applies project migration naming conventions
- ✅ Enables RLS on all new tables
- ✅ Creates appropriate indexes
- ✅ Sets search_path on functions for security
- ✅ Adds proper comments and documentation
- ✅ Runs security advisors after changes
- ✅ Validates migrations before applying

## Core Capabilities

### 1. Migration Creation

Create migrations following the project's `{timestamp}_{descriptive_name}` convention.

**Common tasks:**
- "Create a migration for a new achievements table"
- "Add a premium_user column to profiles"
- "Create indexes for the game_results table"
- "Drop the unused legacy_stats table"

**Process:**
1. Analyze requirements and existing schema patterns
2. Generate migration name following project convention
3. Create migration with proper structure:
   - Schema changes
   - Indexes
   - Foreign keys
   - Functions and triggers
   - RLS policies
   - Comments
4. Validate migration syntax
5. Apply migration using `mcp__supabase__apply_migration`
6. Run security and performance advisors

**Reference:** See `references/migration_best_practices.md` for detailed patterns and examples.

### 2. Row Level Security (RLS) Management

Ensure all tables have proper RLS policies to protect data.

**Common tasks:**
- "Enable RLS on the player_engagement table"
- "Create RLS policies for the new table"
- "Audit all tables for missing RLS"
- "Fix security definer view issues"

**Process:**
1. Check current RLS status using `mcp__supabase__list_tables`
2. Identify tables without RLS or with security issues
3. Create appropriate policies based on data ownership:
   - User owns row pattern
   - Public read, authenticated write
   - Admin-only access
   - Guest + authenticated access
4. Apply policies via migration
5. Verify with security advisors

**Reference:** See `references/rls_patterns.md` for common RLS patterns and security best practices.

### 3. Security Auditing

Proactively identify and fix security vulnerabilities.

**Common tasks:**
- "Run a security audit on the database"
- "Fix all function search_path issues"
- "Find tables without RLS"
- "Review security definer views"

**Process:**
1. Run `mcp__supabase__get_advisors` for security
2. Categorize issues:
   - **CRITICAL**: Tables without RLS, security definer views
   - **HIGH**: Functions without search_path
   - **MEDIUM**: Extensions in public schema
3. Create migrations to fix issues
4. Verify fixes with advisors

**Current project issues detected:**
- ❌ 3 tables without RLS: `player_engagement`, `daily_challenges`, `mystery_rewards_log`
- ⚠️ 2 security definer views: `daily_puzzle_leaderboard`, `bot_words_for_review`
- ⚠️ 20+ functions without search_path set
- ⚠️ pg_trgm extension in public schema

### 4. Performance Optimization

Optimize database performance with proper indexes and query patterns.

**Common tasks:**
- "Add indexes to improve leaderboard query performance"
- "Optimize the daily puzzle queries"
- "Create a materialized view for statistics"
- "Find missing indexes"

**Process:**
1. Run `mcp__supabase__get_advisors` for performance
2. Analyze query patterns and table access
3. Create appropriate indexes:
   - B-tree for equality/range queries
   - GIN for JSONB/arrays/text search
   - Partial indexes for sparse data
   - Composite indexes for multi-column queries
4. Apply via migration
5. Verify with EXPLAIN ANALYZE

**Reference:** See `references/performance_indexes.md` for index patterns and optimization techniques.

### 5. Database Maintenance

Maintain database health and consistency.

**Common tasks:**
- "Add updated_at trigger to the new table"
- "Create a function to calculate player rank"
- "Add foreign key constraints"
- "Add comments to document the schema"

**Process:**
1. Identify maintenance needs
2. Apply project conventions:
   - Use `gen_random_uuid()` for UUIDs
   - Add `created_at`, `updated_at` timestamps
   - Create update triggers
   - Set up foreign keys with appropriate ON DELETE
   - Add descriptive comments
3. Create migration
4. Verify functionality

## Workflow

### Standard Migration Workflow

```
User Request
    ↓
1. Explore current state (list_tables, list_migrations, execute_sql)
    ↓
2. Design migration following project patterns
    ↓
3. Create migration with:
   - Schema changes
   - Indexes
   - RLS policies
   - Functions/triggers
   - Comments
    ↓
4. Apply migration (apply_migration)
    ↓
5. Run advisors (get_advisors for security & performance)
    ↓
6. Report results and any issues found
```

### Security Audit Workflow

```
User Request for Security Audit
    ↓
1. Run security advisors (get_advisors type=security)
    ↓
2. Categorize issues by severity
    ↓
3. Create migrations to fix each issue:
   - Enable RLS on tables
   - Add search_path to functions
   - Review security definer views
    ↓
4. Apply fixes
    ↓
5. Re-run advisors to verify
    ↓
6. Report results
```

### Performance Optimization Workflow

```
User Request for Performance Optimization
    ↓
1. Run performance advisors (get_advisors type=performance)
    ↓
2. Analyze recommendations
    ↓
3. Create migrations to add indexes:
   - Foreign key indexes
   - WHERE clause indexes
   - ORDER BY indexes
   - Composite indexes
    ↓
4. Apply migrations
    ↓
5. Re-run advisors to verify
    ↓
6. Report improvements
```

## Project-Specific Conventions

### Migration Naming
```
{timestamp}_{descriptive_name}.sql
```
Examples:
- `20251228084415_create_daily_puzzle_leaderboard_view`
- `20251228090000_enable_rls_on_player_engagement`
- `20251228091500_add_indexes_for_game_results`

### Standard Table Structure
```sql
CREATE TABLE table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  -- business columns
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Always add indexes for foreign keys
CREATE INDEX table_name_player_id_idx ON table_name(player_id);

-- Always enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Always add policies
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = player_id);

-- Always add update trigger
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Always add comments
COMMENT ON TABLE table_name IS 'Description of table purpose';
```

### Function Security
```sql
CREATE OR REPLACE FUNCTION function_name()
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER  -- Only if needed
SET search_path = public, pg_temp  -- ALWAYS set this
AS $$
BEGIN
  -- Function logic
END;
$$;
```

## MCP Tools Usage

Always use these MCP tools to understand current state before making changes:

- **`mcp__supabase__list_tables`** - View all tables and their RLS status
- **`mcp__supabase__list_migrations`** - See existing migrations for naming patterns
- **`mcp__supabase__execute_sql`** - Query database for current state
- **`mcp__supabase__apply_migration`** - Apply new migrations
- **`mcp__supabase__get_advisors`** - Run security and performance audits
- **`mcp__supabase__search_docs`** - Look up Supabase documentation when needed

## Best Practices Checklist

Before completing any database task, verify:

### Security
- [ ] RLS is enabled on all new tables
- [ ] Appropriate policies created for all operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] Functions have `SET search_path = public, pg_temp`
- [ ] Security definer functions are justified and secure
- [ ] No hardcoded UUIDs or sensitive data in migrations

### Performance
- [ ] Foreign keys have indexes
- [ ] Frequently filtered columns have indexes
- [ ] Sort columns have indexes (with DESC if needed)
- [ ] Composite indexes have correct column order (most selective first)
- [ ] No unnecessary indexes (each index slows writes)

### Maintainability
- [ ] Migration follows naming convention
- [ ] Tables have comments explaining their purpose
- [ ] Complex columns have comments
- [ ] Foreign keys have explicit constraint names
- [ ] Timestamps (created_at, updated_at) are present
- [ ] Update triggers are created

### Data Integrity
- [ ] Foreign key constraints with appropriate ON DELETE behavior
- [ ] NOT NULL constraints on required fields
- [ ] CHECK constraints for valid values
- [ ] Unique constraints where appropriate
- [ ] Default values for common fields

## Common Scenarios

### Scenario 1: Create New Table

Request: "Create a table to track player achievements"

1. Run `list_tables` to understand schema patterns
2. Create migration with:
   - Table structure following conventions
   - Indexes on foreign keys
   - RLS policies
   - Update trigger
   - Comments
3. Apply migration
4. Run advisors to verify

### Scenario 2: Fix Security Issues

Request: "Fix RLS on player_engagement table"

1. Run `get_advisors` for security
2. Create migration to:
   - Enable RLS
   - Create policies for different operations
3. Apply migration
4. Re-run advisors to confirm fix

### Scenario 3: Optimize Performance

Request: "Improve leaderboard query speed"

1. Run `get_advisors` for performance
2. Analyze query patterns
3. Create migration to add indexes:
   - Composite index on (player_id, score DESC)
   - Partial index for active players
4. Apply migration
5. Verify with EXPLAIN ANALYZE

### Scenario 4: Add Column Safely

Request: "Add premium_expires_at to profiles"

1. Create migration to add column as nullable
2. Optionally backfill data in separate migration
3. Optionally make NOT NULL in third migration
4. Add index if used in queries

### Scenario 5: Security Audit

Request: "Run full database security audit"

1. Run `get_advisors` for security
2. List all issues with severity levels
3. Create migration plan for each issue
4. Apply fixes in order of severity
5. Re-run advisors to verify all fixed
6. Provide summary report

## References

Detailed documentation is available in the `references/` directory:

- **`rls_patterns.md`** - Row Level Security patterns, common policies, security best practices
- **migration_best_practices.md`** - Migration structure, naming, safe practices, rollback strategies
- **`performance_indexes.md`** - Index types, optimization patterns, query tuning, performance monitoring

Load these references as needed for detailed guidance on specific topics.

## Proactive Best Practices

Always proactively:

1. **Run advisors after changes** - Catch issues immediately
2. **Enable RLS on new tables** - Security first
3. **Add indexes for foreign keys** - Performance by default
4. **Set search_path on functions** - Prevent injection attacks
5. **Add comments** - Document for future maintainers
6. **Follow naming conventions** - Consistency matters
7. **Test before applying** - Verify migrations work
8. **Consider rollback** - Plan for reverting changes

## Error Handling

If migrations fail:

1. Read error message carefully
2. Check syntax and references
3. Verify table/column names exist
4. Ensure proper ordering (create before reference)
5. Fix and re-apply
6. Never force through errors - understand and fix root cause

## Success Criteria

A successful database operation:

✅ Migration applied without errors
✅ Security advisors show no new issues (or issues are resolved)
✅ Performance advisors show no critical issues
✅ RLS is enabled and tested
✅ Indexes are created for foreign keys and common queries
✅ Functions have search_path set
✅ Comments document purpose
✅ Follows project conventions

This skill ensures your Supabase database remains secure, performant, and maintainable.
