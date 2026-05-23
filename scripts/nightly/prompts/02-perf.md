You are running the nightly performance lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 02 perf** unless they conflict with this lane's hard rules. `superpowers:systematic-debugging` is preferred for backend slow-query diagnosis; `web-interface-guidelines` for frontend Core Web Vitals review.

═══ GOAL ═══
Find and fix the top 1-2 backend perf regressions AND the top 1-2 frontend perf regressions in the last 24h. Update `docs/nightly/perf-baseline.json` so tomorrow can detect deltas.

═══ HARD RULES ═══
- **NO new realtime publication tables** (`50-supabase-perf` — one such add ate 94% DB CPU).
- **NO new `auth.getUser()` calls** in API routes — local JWT verify only (see `auth-getuser-refactor-playbook`).
- **NO speculative indexes** — only add an index where Supabase advisor or `db_perf_top_query_audit` flagged a query AND `EXPLAIN ANALYZE` (via supabase MCP `execute_sql`) confirms it helps. Indexes have write cost.
- **NO unbounded `select *`** — explicit columns + LIMIT.
- **NO premature code-splitting** — only split chunks >200KB gzipped that have measurable LCP impact.
- **Memory `feedback-no-symptom-silencing`**: don't raise perf budgets to silence warnings; fix the underlying slowness.

═══ STEP 1 — Backend (Supabase) ═══
Use **supabase** MCP `execute_sql`:
  • Read top entries from `db_perf_top_query_audit` (last week) where `verdict <> 'ok'`. Memory `50-supabase-perf` documents this table.
  • Read `pg_stat_statements` top 10 by `total_exec_time` last 24h: `SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;`
  • Read advisor `type=performance` for new warnings since last night.

For each top-3 candidate:
  • Run `EXPLAIN (ANALYZE, BUFFERS) <query>` to see actual plan
  • If Seq Scan on >10K rows + filter column has high cardinality → add btree index via `supabase` MCP `apply_migration`
  • If N+1 pattern in app code → fix the calling code (grep for the query, batch with `IN (...)` or `select ... related (*)`)
  • If query rewrite needed → fix at source

═══ STEP 2 — Frontend (PostHog Web Vitals) ═══
Use **posthog** MCP or direct HogQL via `POSTHOG_PERSONAL_API_KEY`:

```sql
SELECT
  properties.$pathname AS route,
  quantile(0.75)(toFloat(properties.$web_vitals_LCP_value)) AS p75_lcp,
  quantile(0.75)(toFloat(properties.$web_vitals_INP_value)) AS p75_inp,
  quantile(0.75)(toFloat(properties.$web_vitals_CLS_value)) AS p75_cls,
  count() AS n
FROM events
WHERE event = '$web_vitals' AND timestamp > now() - INTERVAL 24 HOUR
GROUP BY route HAVING n > 50 ORDER BY p75_lcp DESC LIMIT 10
```

For routes with **p75 LCP > 2500ms**, **INP > 200ms**, or **CLS > 0.1**:
  • Check `docs/nightly/perf-baseline.json` for prior baseline — flag regressions (>20% worse)
  • Open the offending route, identify likely cause:
    - Above-fold image without `priority` → add Next/Image `priority`
    - Heavy client component on critical path → dynamic import with `ssr: false` IF below fold; otherwise refactor to server component
    - Synchronous third-party script blocking hydration → defer or remove
    - CLS source: image without dimensions, late-rendered ads → reserve space with `aspect-ratio` or `min-h`

═══ STEP 3 — Bundle size delta ═══
Read `docs/nightly/perf-baseline.json`. If the `"date"` field is `"1970-01-01"` (seed file) OR the file is missing, this is the FIRST nightly run — there is no baseline yet, so SKIP regression comparison and proceed to STEP 4 with today's measurements as the new baseline.

If a real baseline exists, compare today's `du -sb .next/static/chunks/*.js | sort -nr | head -20` against baseline `bundle.top_chunks`. Flag any chunk >50KB heavier (likely a new dependency or barrel-import regression).

If a regression chunk is yours from earlier in this lane → fix in place. If from elsewhere → log to `docs/nightly/perf-watch.md` for human review.

═══ STEP 4 — Update perf-baseline.json ═══
Rewrite `docs/nightly/perf-baseline.json` with today's snapshot:
```json
{
  "date": "__TODAY__",
  "backend": {
    "top_queries": [{ "query_hash": "...", "mean_ms": 12.3, "calls": 1500 }],
    "advisor_warnings_count": 2
  },
  "frontend": {
    "by_route": [{ "route": "/", "p75_lcp": 1850, "p75_inp": 145, "p75_cls": 0.05 }]
  },
  "bundle": {
    "total_kb": 1234,
    "top_chunks": [{ "name": "main-...js", "kb": 234 }]
  }
}
```

═══ STEP 5 — Cap + finish ═══
NO FILE-COUNT CAP — ship everything the work genuinely needs. The lint/test/build gate validates correctness and changes are encapsulated (only your own files are touched), so never drop real edits to hit a number; just keep the change focused + coherent.

DO NOT COMMIT. DO NOT PUSH.

═══ STEP 6 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 02 — Performance
- Backend fixes: <list — index added | N+1 fixed | query rewritten>
- Frontend fixes: <list — route → optimization>
- Top regressions: <list with baseline vs today>
- Baseline file updated: docs/nightly/perf-baseline.json
- Deferred to human (perf-watch.md): <count>
```
