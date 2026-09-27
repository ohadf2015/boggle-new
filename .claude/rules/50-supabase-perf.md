# Supabase Performance Rules

## Realtime publication discipline

**NEVER add a table to `supabase_realtime` publication without a matching consumer.**

A consumer is a `supabase.channel(...).on('postgres_changes', ...)` subscription wired in code (browser, server, or edge function).

### Why
Postgres serializes the WAL→JSON parser query for every published table on every write — even with zero subscribers. On 2026-05-06 we discovered `leaderboard` (95k+ updates) and `user_notifications` had been in the publication with no consumer, consuming **94.82% of total DB execution time** (5.58 hours of CPU over 165 days). Symptom was app-wide slowness that worsened during admin sessions.

### When adding a Realtime feature
1. **First** write the consumer: `supabase.channel(...).on('postgres_changes', ...).subscribe()`
2. **Then** the migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.<tablename>;`
3. **Never** the reverse order.

### When removing a Realtime feature
Drop the table from the publication in the same PR that removes the consumer:
```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.<tablename>;
```

### Allowlist for legitimate exceptions
If a publication entry must precede its consumer (e.g., subscriber ships next sprint), opt out of auto-remediation explicitly:
```sql
INSERT INTO public.realtime_auto_remediation_allowlist (schemaname, tablename, reason)
VALUES ('public', '<tablename>', 'subscriber ships sprint X — owner: <name>');
```

## Active DB guardrails (Supabase pg_cron)

| Job | Cadence | Purpose |
|---|---|---|
| `realtime-publication-audit` (jobid 22) | Daily 03:17 UTC | Snapshot publication membership + write counts + sub counts → `realtime_publication_audit` (90d TTL) |
| `db-perf-top-query-audit` (jobid 23) | Weekly Mon 04:13 UTC | Snapshot top-15 pg_stat_statements; flag any >40% CPU → `db_perf_top_query_audit` (1y TTL) |
| `realtime-auto-remediation` (jobid 24) | Daily 03:30 UTC | Auto-DROP tables flagged HIGH for 3+ consecutive audits (unless allowlisted). Logs to `realtime_auto_remediation_log` |

## Operator triage

```sql
-- Right-now state
SELECT * FROM public.v_suspicious_realtime_publications;

-- Audit history
SELECT * FROM public.realtime_publication_audit ORDER BY audited_at DESC LIMIT 30;
SELECT * FROM public.db_perf_top_query_audit WHERE verdict <> 'ok' ORDER BY audited_at DESC;

-- Auto-action audit trail
SELECT * FROM public.realtime_auto_remediation_log ORDER BY acted_at DESC;

-- Reverse an auto-action
ALTER PUBLICATION supabase_realtime ADD TABLE public.<tablename>;
```

## auth.getUser network round-trip

Every `auth.getUser()` call costs 50–200 ms (network round-trip to Supabase Auth). Currently 88 sites in `app/api/**/route.ts` — known optimization debt, see memory `auth-getuser-refactor-playbook` for the migration recipe (replace with local JWT verify on read-only paths).
