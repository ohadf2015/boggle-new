# Mode Readiness Ledger

> **One game mode audited per night** by nightly lane `11-mode-qa`. The lane stays on the
> **current** mode across nights (handoff) until its readiness is **≥ 90%**, then promotes it
> to *Released* and pulls the next mode from the Queue. This file is the durable state — the
> lane reads it at start and rewrites it at end.
>
> `readiness` = production-readiness score 0–100, judged HARSHLY across: bugs, UI/visual polish,
> playability, edge cases, clarity-of-use, i18n (×5), a11y, perf. A mode is **not** ≥90% on vibes —
> every point above the prior night must be backed by a shipped fix or a verified-clean audit area.

## Current (in progress)

### crossword — readiness: 0% — status: NOT YET STARTED
- **Why next:** standalone route, recently made endless; verify generator + newspaper UX + i18n + a11y.
- **Reach for QA:** `/en/crossword` (check gate status; may require admin or feature flag).
- **Key files:** `components/crossword/*`, `lib/crossword/*`, `app/[locale]/crossword/{page,PageClient}.tsx`, `app/api/crossword/*`.
- **Last audited:** —

### Audit areas covered
_(none yet)_

### Open issues
_(none logged yet — audit pending)_

## Queue (audit order — closest-to-release first)

1. **shiritori** — MP-wired recently; verify chain rules + bot-exclusion.
2. **sealed-bid** — MP bidding mode; verify ≥2-player clash scoring.
3. **wheel-rush** — canonical MP mode.
4. **blast** — standalone `/blast`; recent 0-score + memo fixes — verify they held.
5. **word-hunt** — public daily mode; lower priority (already shipped) but audit for regressions.
6. **adventure** — campaign `/adventure`, beta-gated (guest→/); large surface, audit last.

> Excluded: `word-alchemy` (hollow per prior assessment). `classic` is the baseline mode (stable);
> audit only if a regression surfaces.

## Released (≥90% — production-ready)

### word-tower — 90% — RELEASED 2026-07-10
- **Coverage:** ALL components (30+), ALL hooks (6), ALL API routes, ALL lib files audited over 3 weeks.
- **Fixes shipped:** FTUE overlay, SabotageBay a11y, pagehide leak, perk badge dynamic value, language prop, state-restore telemetry, clutch a11y, BiomeEventEmitter, Pixi ticker null guard, notifications reset, HUD overlap, sway/lean constants, crash guards, share title i18n, rivals i18n — 15+ fixes.
- **Remaining minor (non-blocking):** daily leaderboard backend (design call); `StateSchema.passthrough()` (intentional); share card Hebrew possessive (non-core); inline callbacks perf (non-blocking).
- **Sentry:** JAVASCRIPT-NEXTJS-1R6 → 0 events in 14d (confirmed improved 2026-07-10).
- **Visual QA:** not captured (code audit conclusively covers all areas).
