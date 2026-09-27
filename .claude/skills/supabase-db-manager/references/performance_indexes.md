# Performance Optimization and Indexes

## When to Create Indexes

### Always Index

1. **Foreign Keys** - Almost always need indexes for join performance
   ```sql
   CREATE INDEX game_results_player_id_idx ON game_results(player_id);
   ```

2. **Columns in WHERE clauses** - Frequently filtered columns
   ```sql
   CREATE INDEX profiles_username_idx ON profiles(username);
   ```

3. **Columns in ORDER BY** - Sorting columns
   ```sql
   CREATE INDEX game_results_created_at_idx ON game_results(created_at DESC);
   ```

4. **Columns in GROUP BY** - Aggregation columns
   ```sql
   CREATE INDEX analytics_events_event_type_idx ON analytics_events(event_type);
   ```

### Index Types

#### B-tree Index (Default)

Best for equality and range queries.

```sql
-- Simple index
CREATE INDEX profiles_created_at_idx ON profiles(created_at);

-- Composite index (order matters!)
CREATE INDEX game_results_player_date_idx
  ON game_results(player_id, created_at DESC);

-- Use composite when filtering on multiple columns
-- Good for: WHERE player_id = X ORDER BY created_at DESC
```

#### GIN Index (for JSONB, Arrays, Text Search)

Best for containment operations.

```sql
-- JSONB index
CREATE INDEX profiles_achievement_counts_idx
  ON profiles USING gin (achievement_counts);

-- Array index
CREATE INDEX player_engagement_calendar_days_idx
  ON player_engagement USING gin (calendar_days_claimed);

-- Text search (with pg_trgm extension)
CREATE INDEX community_words_word_trgm_idx
  ON community_words USING gin (word gin_trgm_ops);
```

#### Partial Index

Best for sparse data or specific conditions.

```sql
-- Index only admin users
CREATE INDEX profiles_admins_idx
  ON profiles(id)
  WHERE is_admin = true;

-- Index only promoted words
CREATE INDEX community_words_promoted_idx
  ON community_words(word, language)
  WHERE promoted_to_dictionary = true;

-- Index only recent records
CREATE INDEX game_results_recent_idx
  ON game_results(created_at)
  WHERE created_at > now() - interval '30 days';
```

#### Expression Index

Best for computed values.

```sql
-- Index on lowercase username for case-insensitive search
CREATE INDEX profiles_username_lower_idx
  ON profiles(LOWER(username));

-- Index on extracted JSONB value
CREATE INDEX analytics_metadata_game_code_idx
  ON analytics_events((metadata->>'game_code'));
```

#### Unique Index

Enforce uniqueness and create index simultaneously.

```sql
-- Unique username
CREATE UNIQUE INDEX profiles_username_unique_idx ON profiles(username);

-- Composite unique constraint
CREATE UNIQUE INDEX daily_puzzles_date_lang_unique_idx
  ON daily_puzzles(puzzle_date, language);

-- Unique with WHERE clause (partial unique)
CREATE UNIQUE INDEX guest_tokens_token_unclaimed_idx
  ON guest_tokens(token_hash)
  WHERE claimed_by IS NULL;
```

## Index Optimization Patterns

### Composite Index Column Order

**Rule: Most selective column first, then secondary filters, then sort columns**

```sql
-- Good: player_id is selective, then sort by date
CREATE INDEX game_results_player_date_idx
  ON game_results(player_id, created_at DESC);

-- Query that uses this index efficiently:
SELECT * FROM game_results
WHERE player_id = 'xyz'
ORDER BY created_at DESC;

-- Bad: less selective column first
CREATE INDEX game_results_date_player_idx
  ON game_results(created_at DESC, player_id);
```

### Covering Indexes

Include frequently accessed columns in index to avoid table lookup.

```sql
-- Include commonly selected columns
CREATE INDEX game_results_player_idx
  ON game_results(player_id)
  INCLUDE (score, word_count, created_at);

-- Query can be satisfied entirely from index:
SELECT score, word_count, created_at
FROM game_results
WHERE player_id = 'xyz';
```

### Index Maintenance

```sql
-- Rebuild index if it becomes bloated
REINDEX INDEX index_name;

-- Rebuild all indexes on a table
REINDEX TABLE table_name;

-- Check index size
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Query Performance Patterns

### Avoid N+1 Queries

```sql
-- Bad: N+1 queries
-- Frontend loops and makes multiple requests

-- Good: Single query with JOIN
SELECT
  p.username,
  COUNT(gr.id) as game_count,
  AVG(gr.score) as avg_score
FROM profiles p
LEFT JOIN game_results gr ON gr.player_id = p.id
GROUP BY p.id, p.username;
```

### Use Materialized Views for Expensive Queries

```sql
-- Create materialized view for expensive aggregation
CREATE MATERIALIZED VIEW leaderboard_summary AS
SELECT
  player_id,
  COUNT(*) as total_games,
  SUM(score) as total_score,
  AVG(score) as avg_score,
  MAX(score) as best_score
FROM game_results
GROUP BY player_id;

-- Create index on materialized view
CREATE INDEX leaderboard_summary_player_idx
  ON leaderboard_summary(player_id);

-- Refresh periodically (can use cron job)
REFRESH MATERIALIZED VIEW leaderboard_summary;

-- Or concurrent refresh (doesn't lock reads)
REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_summary;
```

### Use EXPLAIN ANALYZE

Always check query plans for slow queries:

```sql
EXPLAIN ANALYZE
SELECT *
FROM game_results
WHERE player_id = 'xyz'
ORDER BY created_at DESC
LIMIT 10;
```

Look for:
- **Seq Scan** - Bad for large tables, need index
- **Index Scan** - Good
- **Index Only Scan** - Best
- **High cost numbers** - Expensive operations
- **Slow execution time** - Needs optimization

### Optimize JSONB Queries

```sql
-- Create GIN index for JSONB
CREATE INDEX profiles_achievement_counts_idx
  ON profiles USING gin (achievement_counts);

-- Efficient JSONB queries
-- Check if key exists
SELECT * FROM profiles WHERE achievement_counts ? 'first_win';

-- Check if contains value
SELECT * FROM profiles
WHERE achievement_counts @> '{"first_win": 1}';

-- Extract and filter
SELECT * FROM profiles
WHERE (achievement_counts->>'total_games')::int > 100;

-- Index extracted values
CREATE INDEX profiles_total_games_idx
  ON profiles(((achievement_counts->>'total_games')::int));
```

### Optimize Text Search

```sql
-- Install pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index
CREATE INDEX community_words_word_trgm_idx
  ON community_words USING gin (word gin_trgm_ops);

-- Efficient similarity search
SELECT word, similarity(word, 'search_term') as sim
FROM community_words
WHERE word % 'search_term'  -- % operator uses index
ORDER BY sim DESC
LIMIT 10;

-- Case-insensitive search
CREATE INDEX profiles_username_trgm_idx
  ON profiles USING gin (LOWER(username) gin_trgm_ops);

SELECT * FROM profiles
WHERE LOWER(username) LIKE LOWER('%search%');
```

## Common Performance Anti-Patterns

### 1. Missing Foreign Key Indexes

```sql
-- Bad: No index on foreign key
ALTER TABLE game_results
  ADD CONSTRAINT game_results_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES profiles(id);

-- Good: Index on foreign key
CREATE INDEX game_results_player_id_idx ON game_results(player_id);

ALTER TABLE game_results
  ADD CONSTRAINT game_results_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES profiles(id);
```

### 2. Too Many Indexes

Each index slows down writes. Only create indexes that are actually used.

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- Drop unused indexes
-- If idx_scan is 0 or very low, consider dropping
DROP INDEX IF EXISTS unused_index_name;
```

### 3. Using SELECT *

```sql
-- Bad: Fetches all columns
SELECT * FROM profiles WHERE id = 'xyz';

-- Good: Only fetch needed columns
SELECT id, username, avatar_emoji FROM profiles WHERE id = 'xyz';
```

### 4. Unbounded Queries

```sql
-- Bad: No LIMIT, could return millions of rows
SELECT * FROM game_results ORDER BY created_at DESC;

-- Good: Always LIMIT
SELECT * FROM game_results
ORDER BY created_at DESC
LIMIT 100;
```

### 5. Inefficient Counts

```sql
-- Bad: Slow on large tables
SELECT COUNT(*) FROM game_results;

-- Good: Use approximate count for large tables
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'game_results';

-- Or use specific filters
SELECT COUNT(*) FROM game_results
WHERE player_id = 'xyz'
AND created_at > now() - interval '30 days';
```

## Monitoring Performance

### Check Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Slow Queries

Enable and check pg_stat_statements:

```sql
-- View slowest queries
SELECT
  calls,
  total_exec_time,
  mean_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Check Missing Indexes

```sql
-- Tables with high seq scans and no index scans
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND schemaname = 'public'
ORDER BY seq_tup_read DESC;
```

## Performance Checklist

When optimizing a table:

- [ ] Foreign keys have indexes
- [ ] Frequently filtered columns have indexes
- [ ] Sort columns have indexes (with DESC if needed)
- [ ] Composite indexes have correct column order
- [ ] JSONB columns used in queries have GIN indexes
- [ ] Text search columns have trigram indexes
- [ ] No unused indexes (check pg_stat_user_indexes)
- [ ] Queries use LIMIT when appropriate
- [ ] Expensive queries use materialized views
- [ ] No SELECT * in application code
- [ ] No N+1 query patterns
- [ ] EXPLAIN ANALYZE shows index scans, not seq scans
