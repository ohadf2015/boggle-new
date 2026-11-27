status: shipped
files_touched:
  - fe-next/lib/experiments.ts
  - fe-next/components/education/live/LobbyWordStudy.tsx
  - fe-next/components/education/live/__tests__/LobbyWordStudy.test.tsx
  - docs/nightly/triage-queue.md
  - docs/nightly/reports/2026-11-27.md
  - docs/nightly/impact-ledger.ndjson
summary: >
  New experiment exp-edu-study-card-feedback-v1 (control/card-pulse, flag live in
  PostHog, id 383769) targeting tonight's #1 rage-click surface: traced via
  $rageclick $el_text breakdown to the Next/Back/"I know these" buttons on the
  classroom lobby word-study flashcard deck (LobbyWordStudy.tsx), which swapped
  cards with zero visual feedback. Added 2 new analytics events
  (edu_lobby_study_nav_clicked, edu_lobby_study_done_clicked) — this component had
  no instrumentation before tonight. Flag hygiene: no experiment hit the
  1000-uniq/arm decided-winner bar (max 132), so no removals; logged
  exp-edu-join-loading-feedback-v1 (0 exposures in 22d — screen rarely reached, not
  a flag bug) to triage-queue.md as inconclusive-after-14-days. Re-confirmed
  exp-practice-wheel-cta-v1 still unwired (0 call sites), did not ensure its flag.
verification: >
  Local toolchain was down this run (node_modules/.bin empty, no active npm
  install found — shared-checkout contention also hit by lane 05 tonight per its
  report entry). Test file (5 cases, TDD red-first against the pre-edit component)
  and implementation verified by manual read-through only; not executed locally.
next_steps: >
  Tomorrow's lane (or the gate) should run
  `vitest run fe-next/components/education/live/__tests__/LobbyWordStudy.test.tsx`
  to confirm GREEN once node_modules is healthy. After ~5 days, re-query the
  $rageclick breakdown in the impact ledger entry to see if card-pulse moved the
  rate; if conclusive, retire the losing arm. Separately: decide whether to retire
  exp-edu-join-loading-feedback-v1 (dead screen) or instrument the classroom-name
  branch render to confirm it's truly unreached.
