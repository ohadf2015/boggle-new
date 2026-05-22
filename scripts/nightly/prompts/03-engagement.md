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
Use **posthog** MCP (or POSTHOG_PERSONAL_API_KEY direct):
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

═══ STEP 4 — Instrument gaps ═══
For 2-3 events PostHog showed as missing/inferred (e.g., funnel steps with no direct event), add a fire site at the relevant React/server boundary. Use existing `track()` / `posthog.capture()` API. Names = `<noun>_<verb>` lowercase.

═══ STEP 5 — Cap + finish ═══
PER-LANE CAP: __PER_LANE_CAP__ files. If exceeded, drop the new instrumentation first (lowest priority), keep the experiment + flag cleanup.

DO NOT COMMIT. DO NOT PUSH.

═══ STEP 6 — Append to nightly report ═══
Append to `docs/nightly/reports/__TODAY__.md`:

```
### Lane 2 — Engagement A/B + flag hygiene
- Flags retired: <list> (with winners)
- New experiment: `<flag_name>` — hypothesis: <H>
- New events instrumented: <list>
- Largest funnel drop targeted: <step> (<prior%> → <today%>)
```
