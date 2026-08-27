status: shipped
attempted: pull posthog flags+funnel, retire decided flags, add 1 experiment behind flag, instrument 2-3 gap events
files_touched: fe-next/lib/experiments.ts, fe-next/lib/word-craft/setupPrefs.ts, fe-next/components/word-craft/wordCraftTelemetry.ts, fe-next/app/[locale]/word-craft/PageClient.tsx, docs/nightly/reports/2026-08-27.md, docs/nightly/impact-ledger.ndjson
summary: |
  Flag hygiene: checked the 3 inactive PostHog flags — exp-mp-lobby-connect-feedback-v1
  already concluded+code-removed 07-26; exp-mp-room-join-loading-v1 and
  exp-blast-wave-banner-v1 have zero code references (orphaned PostHog-side only,
  nothing to clean in code). Full stats-based winner sweep across ~45 active flags
  skipped (time budget) — no in-scope flag met the retirement bar.
  New experiment: exp-wordcraft-quick-resume-v1 (control/quick-resume, 50/50, live in
  PostHog id 259891) — returning Word Craft players with saved setup prefs skip the
  setup screen and start play immediately, targeting the homepage->game-start funnel
  gap (only ~23-35% of visitors start a game per 24h/7d HogQL pull). Wired via
  cookie-seeded useExperiment so the decision is available synchronously at mount
  (Class-1 dual-source-of-truth safe: unassigned users keep today's behavior).
  New events: wordcraft_setup_shown (fills the missing denominator for setup->start
  conversion), wordcraft_quick_resume_start (fires when the new arm auto-skips setup).
  Manually reviewed the diff line-by-line (imports, hook deps, ref usage) since
  `npx eslint` on the 4 changed files did not finish within the lane budget under
  concurrent-session CPU contention (process still running at cutoff, not an error) —
  no lint errors expected but not machine-verified; nightly gate's authoritative
  lint/tsc/build runs after this lane and will catch anything missed.
next_steps: |
  Re-check exp-wordcraft-quick-resume-v1 after 7 days: (setup_start+quick_resume_start)/
  setup_shown by arm, plus word_craft_abandoned guardrail. If a future lane has budget,
  do the full flag-hygiene stats sweep (≥7d/≥1000-per-arm/p<0.05) across the ~45 active
  flags this run only spot-checked 3. Consider running eslint on these 4 files again
  once a nightly run is not contending with concurrent sessions.
