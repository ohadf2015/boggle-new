You are running the nightly engagement A/B + flag hygiene lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ PLAYER FEEDBACK (recent) ═══
__FEEDBACK_SUMMARY__

Let this steer your work: a low-avg or bad-heavy surface (mp_round / singleplayer
/ daily) is the strongest hint for WHERE to target your new experiment or the
2-3 instrumentation events. A free-text complaint about a specific flow is a
candidate hypothesis. If it says "No player feedback in the window", fall back to
the PostHog funnel-gap analysis below.

═══ Tonight's intelligence brief — ACT ON THIS FIRST ═══

Phase 0 already queried every data source over REST and ranked the highest-leverage opportunities for THIS lane. Your targets (PostHog funnel drops + rage clicks + feature flag status + instrumentation gaps):

__BRIEF__

**Brief-first contract:** Pick the top funnel gap and the flagged experiments (won or stalled) from the brief above and act on them this run. The data was already collected — do NOT re-run broad funnel queries or flag-list enumeration. ONLY if the brief slice above is empty or marked STALE may you do ONE quick targeted query (e.g., last 24h funnel vs 7d baseline), then act. Use code changes and flag management (delete winning variants, implement new experiments) to fix, not to re-explore.

═══ SKILLS TO USE ═══
From the **Specialized Skills** table above, invoke the skills listed for **lane 03 engagement** unless they conflict with this lane's hard rules. Skip "none yet" rows.

═══ GOALS (in order) ═══
1. **Clean up decided flags** — any typed experiment with ≥7 days running AND ≥1000 users per arm AND statistically significant winner (p<0.05) gets unwired: keep the winning code path, delete the flag + losing branch.
2. **Add ONE new typed experiment** behind a flag — targets a real funnel gap from last-24h PostHog data.
3. **Add 2-3 analytics events** that fill instrumentation gaps surfacing in today's PostHog query — improves next-day signal.

═══ HARD RULES ═══
- **NO new realtime tables** (`supabase_realtime` publication). One such add ate 94% DB CPU. If your experiment "needs" realtime, redesign with polling or skip the experiment.
- **NO new `auth.getUser()` calls** in API routes — 88 already; use local JWT verify pattern (see memory `auth-getuser-refactor-playbook`).
- **NO event renaming** — emit a new event name, never reshape an existing one (poisons historical funnels). If deduping, fix the emitter, don't break existing dashboards.
- **All new strings** in 5 locales (en/he/sv/ja/es). Hebrew RTL-safe.
- **All new events** must be added to typed event registry if one exists (grep `analytics/events.ts` or similar).

═══ STEP 1 — Pull data ═══
Use the Bash helper for ALL PostHog data: `scripts/nightly/lib/posthog-query.sh hogql "<HogQL>"` for funnels, `scripts/nightly/lib/posthog-query.sh flags` for the flag list. DO NOT call the posthog MCP tools — it flaps and HANGS the lane to a timeout (this lane exit-124'd that way twice). The helper is the ONLY PostHog path.
  • Funnel: homepage → game-start → game-complete → return-day-2, last 24h vs prior-7d-baseline
  • Largest drop per step
  • Flag list: query `GET /api/projects/{PROJECT_ID}/feature_flags/` to enumerate active flags + their experiment-result link

═══ STEP 2 — Flag hygiene ═══
For each active flag:
  • If experiment is decided (variant winner clear, p<0.05, n≥1000/arm) → REMOVE flag + losing branch in code. Keep winning variant.
  • If experiment is inconclusive after 14 days → flag for human review in `docs/nightly/triage-queue.md`.
  • Use grep to find all `useFeatureFlag('flag_name')` / `posthog.isFeatureEnabled('flag_name')` call sites. Delete the conditional, keep the winning side.

═══ STEP 3 — Propose ONE new experiment ═══
Pick the biggest funnel-drop step. Write the hypothesis: "Changing X will lift conversion by Y%."
Implement variant-B behind a typed flag `exp_<area>_<v>` using the existing typed-experiments pattern (grep `getTypedExperiment` or `experiments/` for examples).
Both variants must be live by end of lane. Default = control.

**STEP 3b — CREATE the PostHog flag LIVE (autonomous — never leave it for a human).**
A typed experiment is INERT until a matching PostHog feature flag exists. The repo's
`fe-next/lib/experiments.ts` defines each experiment's variant keys; the flag must mirror
them. Create flags with the idempotent WRITE helper (REST API, NOT the flapping MCP):

```
scripts/nightly/lib/posthog-experiment.sh ensure <flag-key> <variantA> <variantB> "<short desc>"
```
- `<variantA> <variantB>` = the EXACT two variant keys from that experiment's `variants:` array
  in `lib/experiments.ts` (e.g. `control match-seeking`). Creates a multivariate 50/50 flag,
  rolled out to 100%, sticky-bucketed (`ensure_experience_continuity`).
- Idempotent: a `"status":"exists"` or `"created"` result means the experiment is LIVE.
  ONLY if it returns `{"error":...}` may you note that one line in the report — NEVER
  pre-emptively write "human must create in PostHog" / a dark-experiment flag.
- **Sweep prior experiments, but ONLY wired ones (HARD PRECONDITION):** grep every `'exp-…'`
  key in `lib/experiments.ts`. For each, FIRST confirm variant-B is actually WIRED — a real
  non-test call site exists:
  ```
  grep -rl "<exp-key>" fe-next --include='*.ts' --include='*.tsx' | grep -vE 'experiments\.ts|\.test\.|node_modules'
  ```
  - **≥1 call site → run `ensure`** (idempotent; back-fills the flag so the live experiment serves).
  - **0 call sites → do NOT create the flag.** An unwired experiment serves a variant that
    changes nothing — a fake "running" test that can't move its metric. Instead WIRE variant-B
    this run if it's in scope, THEN `ensure`; otherwise leave it and note `<key>=unwired` in the
    report (a real to-do, not a PostHog gap). Verified 2026-06-16: `exp-practice-wheel-cta-v1`
    and `exp-game-abandon-confirm-v1` were defined but NEVER wired — they must be wired before
    their flags go live, not flipped blind.

═══ STEP 4 — Instrument gaps ═══
For 2-3 events PostHog showed as missing/inferred (e.g., funnel steps with no direct event), add a fire site at the relevant React/server boundary. Use existing `track()` / `posthog.capture()` API. Names = `<noun>_<verb>` lowercase.

═══ STEP 5 — Cap + finish ═══
NO FILE-COUNT CAP — ship everything the work genuinely needs. The lint/test/build gate validates correctness and changes are encapsulated (only your own files are touched), so never drop real edits to hit a number; just keep the change focused + coherent.

DO NOT COMMIT. DO NOT PUSH.

═══ STEP 6 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 2 — Engagement A/B + flag hygiene
- Flags retired: <list> (with winners)
- New experiment: `<flag_name>` — hypothesis: <H>
- PostHog flags ensured live: <key=created|exists per experiments.ts sweep; any error=key>
- New events instrumented: <list>
- Largest funnel drop targeted: <step> (<prior%> → <today%>)
```
