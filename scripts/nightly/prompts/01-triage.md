You are running the nightly triage lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new. Be terse.

═══ LEARNINGS FROM PRIOR RUNS (preamble) ═══
__LEARNINGS__

═══ GOAL ═══
Fix real bugs surfaced by Sentry, Supabase advisor, and PostHog `$exception` events in the last 24h. ROOT-CAUSE fixes only.

═══ HARD RULES (read first) ═══
- **NEVER demote `logger.warn → debug`**, raise Sentry thresholds, or add allowlist entries to make errors disappear. Root-cause or queue — never silence. (Memory: feedback-no-symptom-silencing.)
- **NEVER add a table to `supabase_realtime` publication without a consumer.** (Memory: 50-supabase-perf — one such add ate 94% DB CPU.)
- **NEVER touch auth-adjacent code** (login, OAuth, session, RLS policies, service-role key handling, password resets) — flag in the report for morning human review instead. Auto-shipping security-adjacent fixes at 03:00 with no human in the loop = blast radius too large.
- **Build/lint/test runs in shell after this lane**; your claim "tsc clean" is ignored. (Memory: feedback-subagent-verify-claims.)

═══ STEP 1 — Pull error inventory ═══
Use the **sentry** MCP server (tools include `search_issues`, `get_issue`):
  • Filter: project lexiclash, lastSeen within 24h, level≥error
  • Skip allowlisted Socket errors (see `SocketContext.tsx:311-318`) and frame-ancestor CSP noise
  • Pick top 3 by `count` × `userCount`

Use the **supabase** MCP server (`get_advisors` with `type: 'performance'` and `type: 'security'`):
  • New advisor warnings since last night
  • Skip the 217 unused_index + 69 authd-secdef intentionally kept (see memory `supabase-advisor-cleanup-2026-04-29`)

Use the **posthog** MCP server (or POSTHOG_PERSONAL_API_KEY direct query):
  • `$exception` events last 24h grouped by `$exception_type` / `$exception_message`
  • Top 3 by occurrence

═══ STEP 2 — Diagnose ═══
For each candidate (max 5 total across the three sources):
  • Read the stack trace / file:line
  • Read the implicated code (use `Read`, not `Agent` unless >500 lines)
  • Identify root cause — a buggy condition, a missing null guard, a race, a stale env
  • If root cause is auth/RLS/security/payments: STOP — write to queue (step 4) and move on.

═══ STEP 3 — Fix (each cost-effective + safe) ═══
Apply minimal fixes. NO refactors, NO renames, NO sweeping changes. Each fix:
  • TDD if a unit test layer exists — write failing test first, then fix
  • Plain `Edit` if no test layer exists (e.g., one-line null guard)
  • If a fix requires a Supabase migration: use the supabase MCP `apply_migration` tool, NEVER raw SQL files alone. (Memory: feedback-supabase-mcp-for-migrations.)

═══ STEP 4 — Queue what you didn't fix ═══
Anything you skipped (auth-adjacent, ambiguous root cause, refactor needed, >8 files): write to `docs/nightly/triage-queue.md` (APPEND, do not replace):

```
## __TODAY__
- [Sentry|Supabase|PostHog] <title>
  - first/last seen, count, userCount
  - link to issue
  - why deferred: <auth-adjacent | ambiguous | needs design | etc>
  - recommended owner: <self|backend|design>
```

═══ STEP 5 — Cap + finish ═══
PER-LANE CAP: __PER_LANE_CAP__ files. If exceeded, revert lowest-priority edits.

DO NOT COMMIT. DO NOT PUSH. Orchestrator does it.

═══ STEP 6 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 1 — Triage
- Fixed: <bullet list with file:line + Sentry/Supabase/PostHog source>
- Queued for human review: <count> (see docs/nightly/triage-queue.md)
- Skipped (security-adjacent): <count + categories>
```
