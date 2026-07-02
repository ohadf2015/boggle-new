status: shipped
files_touched: docs/nightly/learnings.md (rewritten, 151 lines), docs/nightly/loop-improvements/2026-07-02.md (new), docs/nightly/reports/2026-07-02.md (Lane 7 section appended)
summary: |
  Rewrote learnings.md from 6 report nights (06-27..07-02). Window DEGRADED vs prior:
  3 consecutive docs-only gate-salvages (06-28/29/30) + a 07-01 preflight abort. Root =
  gate Vitest/next-build TS-phase wedge; fix c826e1924 landed 07-02 (verifying 07-03/04).
  0 pushed-code reverts held. Wins: word-tower 58->79%, 4 mode-polish ships, 3 autonomy
  RPC hardenings, posthog-coverage.sh extractor fix, Wiktionary+Russian push.
  #1 infra: Supabase MCP token staleness 6/6 nights (3 migrations unapplied).
next_steps: |
  - Verify gate wedge fix produced no salvage on 07-03/04; if it recurs, scope Vitest to
    changed files + per-suite hard kill (replace 5400s idle backstop).
  - Human/lane-02: mint never-expire Supabase PAT into nightly env (60s, unblocks 6-night DB backlog).
  - Lane-03: enforce flag-render-path check (3 dark flags this window).
  - Lane-09: mandate 1 reversible shipped slice/night (0 code 6/6).
  - Deferred 2 helper scripts (mcp-health-probe.sh, flag-render-path-check.sh) — need env/grep
    access lane 07 lacks; specced in loop-improvements.
