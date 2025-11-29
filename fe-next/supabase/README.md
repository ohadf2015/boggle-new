# Supabase Database Setup

This directory contains SQL migrations for the Boggle game's Supabase backend.

## Quick Start

### Option 1: Run migrations via Supabase Dashboard (Manual)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:
   - `001_initial_schema.sql` - Creates tables, indexes, and triggers
   - `002_row_level_security.sql` - Enables RLS and creates policies
   - `003_database_functions.sql` - Creates stored procedures and functions

### Option 2: Using Supabase CLI (Recommended for CI/CD)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (run from fe-next/supabase directory)
cd fe-next/supabase
supabase link --project-ref hdtmpkicuxvtmvrmtybx

# Push migrations to production
supabase db push
```

### Option 3: Automated Deployment (CI/CD)

Add to your CI/CD pipeline (GitHub Actions, Railway, Vercel, etc.):

#### GitHub Actions Example

Create `.github/workflows/migrate.yml`:

```yaml
name: Database Migrations

on:
  push:
    branches: [main, master]
    paths:
      - 'fe-next/supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link Supabase Project
        run: |
          cd fe-next/supabase
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Run Migrations
        run: |
          cd fe-next/supabase
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

#### Railway Deployment

Add to your `railway.toml` or build command:

```toml
[build]
  builder = "nixpacks"
  buildCommand = "npm install && npm run build && npx supabase db push"

[deploy]
  startCommand = "npm start"
```

#### Vercel Deployment

Add a custom build script in `vercel.json`:

```json
{
  "buildCommand": "npm run build && npx supabase link --project-ref $SUPABASE_PROJECT_REF && npx supabase db push",
  "env": {
    "SUPABASE_ACCESS_TOKEN": "@supabase-access-token",
    "SUPABASE_PROJECT_REF": "@supabase-project-ref"
  }
}
```

## Required Secrets/Environment Variables

For automated deployments, set these secrets:

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token | [Supabase Dashboard > Account > Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Project reference ID | `hdtmpkicuxvtmvrmtybx` (from your project URL) |
| `SUPABASE_DB_PASSWORD` | Database password | Project Settings > Database > Connection string |

## NPM Scripts

```bash
# Run migrations manually
npm run db:migrate

# Migrations run automatically after build (if service key is set)
npm run build  # includes postbuild hook
```

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles linked to Supabase Auth |
| `leaderboard` | Denormalized leaderboard for fast queries |
| `game_results` | Historical game results |
| `guest_tokens` | Guest player tracking |
| `ranked_progress` | Track casual games toward ranked unlock |

### Key Features

#### Row-Level Security (RLS)
- Profiles: Public read, owner-only write
- Leaderboard: Public read-only
- Game Results: Owner-only read, server-managed insert
- Guest Tokens: Public for unclaimed tokens

#### Automatic Triggers
- `update_updated_at_column()` - Auto-updates timestamps
- `update_leaderboard_ranks()` - Recalculates ranks on score change
- `sync_profile_to_leaderboard()` - Syncs profile changes to leaderboard

#### Database Functions
- `get_leaderboard(limit, offset, order_by)` - Paginated leaderboard
- `get_user_rank(user_id)` - Get user's rank position
- `update_profile_stats(...)` - Atomic stats update
- `update_ranked_mmr(...)` - Calculate MMR changes
- `claim_guest_stats(...)` - Merge guest stats to profile
- `search_players(query, limit)` - Fuzzy player search

## Real-time Subscriptions

The integration supports real-time updates for:
- Leaderboard changes (all players)
- Profile updates (own profile)
- Game results (own results)
- Game room presence & broadcast

### Usage in React

```jsx
import { useLeaderboard, useUserRank, useProfile } from '@/hooks/useSupabaseRealtime';

// Live leaderboard
const { data, loading, subscriptionStatus } = useLeaderboard();

// Live user rank
const { rank } = useUserRank(userId);

// Live profile with update function
const { profile, updateProfile } = useProfile(userId);
```

## Enhanced Client Features

### Retry Logic

```javascript
import { withRetry, profileOperations } from '@/lib/supabaseEnhanced';

// Automatic retry with exponential backoff
const result = await withRetry(
  () => supabase.from('profiles').select('*'),
  { maxRetries: 3, context: 'fetchProfiles' }
);
```

### Batch Queries

```javascript
import { batchQueries } from '@/lib/supabaseEnhanced';

const results = await batchQueries([
  { table: 'profiles', method: 'select', eq: { id: userId } },
  { table: 'leaderboard', method: 'select', limit: 10 }
]);
```

### Connection Health

```javascript
import { connectionMonitor } from '@/lib/supabaseEnhanced';

const health = await connectionMonitor.checkHealth();
// { healthy: true, latency: 45 }
```

## Storage Bucket Setup

Create a `profile_pictures` bucket:

1. Go to **Storage** in Supabase dashboard
2. Create bucket named `profile_pictures`
3. Set as **Public** bucket
4. Add policy for authenticated uploads:

```sql
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile_pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_pictures');

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile_pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile_pictures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Performance Considerations

### Indexes
- Username search: Trigram index for fuzzy matching
- Leaderboard: Score and MMR indexes for fast sorting
- Game results: Player ID and date indexes

### Caching
- Profile pictures: 1-hour cache control
- Leaderboard: Real-time updates reduce need for polling

### Rate Limiting
- Built-in request queue prevents rate limit errors
- Exponential backoff on retryable errors

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure user is authenticated for write operations
   - Check policy conditions match your use case

2. **Real-time Not Working**
   - Verify Realtime is enabled for your tables
   - Check browser WebSocket connection

3. **Migration Failures**
   - Run migrations in order (001, 002, 003)
   - Check for existing objects before CREATE

### Debug Logging

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('supabase.debug', 'true');
```
