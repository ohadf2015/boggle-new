# React Doctor Audit — 2026-07-20

Focus: multiplayer modes, daily challenge, word tower. Scope: `fe-next/` (8161 source files).
Tool: `react-doctor@0.8.1`. Stack detected: React 19.2.1, Next 16.2, Tailwind 4, React Compiler ON.

## Headline

Two-part result:

1. **Whole-project `--json` run silently skipped the lint + dead-code passes** (Class-4 no-op:
   this environment has no `node_modules/.bin`; the lint toolchain degraded and returned 0 findings
   without erroring — byte-identical 63→63 with `--lint`, same 313s elapsed). Do NOT trust a
   whole-repo react-doctor lint total in this env — **scope it per directory**, which works.
2. **Scoped lint runs DO execute** and surface real volume: wordTower **166**, daily **366**,
   multiplayer **100** diagnostics. Most are Performance/Maintainability (React-Compiler-handled
   or style → low signal). The bug-shaped rules are the signal.

The whole-project run's only real output = **63 Security findings**, all DB/infra heuristics (below).

## Security findings triage (63) — verified against LIVE DB, all non-actionable

| Rule | Count | Verdict |
|---|---|---|
| `supabase-rls-policy-risk` | 32 | Migration-file heuristic on permissive policies. Supabase's own linter flags only **6** `rls_policy_always_true` (WARN) — intentional public-read (leaderboards/word-banks). |
| `supabase-table-missing-rls` | 15 | **FALSE POSITIVE.** Heuristic reads only the creating migration. Live check `SELECT relname FROM pg_class WHERE relrowsecurity=false` → **0 rows**. Every flagged table has RLS enabled in a later migration. |
| `artifact-baas-authority-surface` | 11 | Findings in `.next/static/chunks/*.js` build artifacts, not source. Public Supabase anon config — RLS-enforced. Noise. |
| `supabase-client-owned-authz-field` | 2 | `utils/friendMessages.ts:89`, `utils/friendsHeadToHead.ts:231` — write `challenger_id: user.id` from `auth.getUser()`. RLS enforces `auth.uid()=challenger_id`. Advisory, not a bug. |
| `require-pnpm-hardening` / `plugin-update-trust-risk` | 3 | pnpm-workspace / Dockerfile supply-chain advisories. Out of scope. |

Cross-check — Supabase authoritative security advisor (`get_advisors security`): **0 ERROR-level**, 75 `authenticated_security_definer_function_executable` (WARN, intentional RPCs), 6 `rls_policy_always_true` (WARN, public reads), 4 `rls_enabled_no_policy` (INFO, deny-all = safe).

**Conclusion:** no fixable react-doctor issue. Re-running does not change the result. The React-quality work
the tool cannot see (React Compiler masks its lint) was done as a manual review of the three focus modes — see below.

## Manual React-quality review of focus modes

Method: scoped react-doctor `--lint` per area (hypotheses) cross-referenced with 3 independent
review agents reading the actual code, then each candidate re-verified by hand. Most react-doctor
lint volume is false-positive here: `no-ref-current-in-render` (31 in wordTower) is compiler-safe,
and `effect-needs-cleanup` fires on timers that ARE cleaned via closure/ref patterns the tool
can't trace (verified `WordWheelGame` interval, `useLiveScoreTracker`, `useDailyConfetti` rAF).

### Confirmed + FIXED

| # | File:line | Bug | Impact | Fix |
|---|---|---|---|---|
| A | `components/daily/WordWheelGame.tsx:1025` | Flying "+score" keyed on `Date.now()`, recomputed every render → element remounts and restarts its 1.2s animation whenever anything re-renders mid-flight (e.g. player builds next word). | **User-visible jank** on daily Word Wheel. | Monotonic `scoreFlyId` counter, bumped when a score is shown; key = `score-${scoreFlyId}`. |
| B | `components/multiplayer/WheelRushView.tsx:234,253` | Word-builder shake timer (bare `setTimeout`) + `fbTimer` had no unmount cleanup → setState-after-unmount. | Low (React 19 no-ops post-unmount setState) — hygiene. | Captured shake timer in a ref; both cleared in the existing unmount cleanup effect. |

### Reviewed, NOT fixed (verified low-impact / working-as-designed)

- `WordWheelGame.tsx:256` pass-toast `setTimeout`s: `passedNamesRef`-guarded fire-once; React 19 no-op post-unmount. Leaving.
- `DailyChallengeLanding.tsx:87–145` split visibility/popstate listeners: the two handlers update *different* mode statuses (Word Tower vs Word Wheel/Hunt) — not a double-fire bug; consolidation is maintainability, deferred.
- `useSabotage.ts:148` timer-dep race: **debug-only** (`?sim_sabotage=1`), never fires in prod.
- `WordFeedbackToast.tsx:118` / `WordWheelResults.tsx:122` `typeof window` in render: toasts/results mount client-side only (no SSR render) → no real hydration mismatch.
- Word Tower, `useMultiplayerSocket`, reconnect/round-reset across sealedBid/crossword/shiritori: all verified clean (listeners named + unregistered, round state reset via `resetForNewRound()`).

### Bugs/error rules verified as non-defects (looked at every one)

- `no-impure-state-updater` (6): `WordWheelGame.tsx:362` + `HostLeftGraceModal.tsx:63` are the countdown pattern (side effects in a `setState(prev=>…)` updater) — prod-safe (updater runs once outside StrictMode dev), pervasive repo-wide, not piecemeal-refactored. `useSurvivalClues.ts:151` is a pure Map-builder (FP); `:283` mutates `pendingCluesRef` (intentional coin-reveal batching, idempotent). `WordTowerParallaxProps.tsx:225` / `WordTowerSighting.tsx:45` read a ref in the updater — benign.
- `no-effect-with-fresh-deps` (4): `DailyChallenge.tsx:292` is `useInterval` (ref-based, fresh callback is by design — FP). `DailyChallengeBanner.tsx:112` same class. `DailyWordHuntResults.tsx:198/202` → `useResultSubmission`, guarded by `hasSubmittedRef` (idempotent; effect re-run is harmless — no re-submit/re-fetch storm).

### Overall

The three focus modes are **React-sound**. No leak, stale-closure, asymmetric-path, or cross-round
state bug survived verification. One genuine user-visible defect (A) and one hygiene gap (B) fixed.
The apparent react-doctor "volume" (166/366/100) is dominated by compiler-handled perf rules and
untraceable-cleanup false positives.
