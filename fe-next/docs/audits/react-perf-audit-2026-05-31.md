# React Best-Practices Audit — MP + Daily Challenge (2026-05-31)

Scope: hot paths in multiplayer game loop + daily challenge. Reviewed against Vercel
react-best-practices rules (waterfalls, bundle, re-render, rendering). 4 parallel sonnet
reviewers, each loaded the actual rule files. Findings verified before any fix; speculative
memoization dropped.

Legend: ✅ applied · 📋 documented (needs profiling/TDD before changing) · ❌ dropped (not actually hot / false positive)

---

## TIER 1 — High confidence, safe, measurable → APPLY

### ✅ T1.1 `bundle-conditional` — dailyShareImage loaded eagerly on results screen
`utils/dailyShareImage.ts` (620 LOC + canvas/data-URI rendering) is statically imported by:
- `components/daily/DailyChallengeResults.tsx:38`
- `components/daily/results/useShareHandlers.ts:13`

Only ever runs on share-button tap; both call sites already `await generateDailyShareImage(...)`.
→ Convert to dynamic `import()` inside the share handlers. Removes the share-image module from
the results-screen chunk. Behavior-preserving (call sites already async). **APPLIED this pass.**

---

## TIER 2 — Real, but need profiling + TDD before changing (higher risk / daemon-clobber exposure)

### 📋 T2.1 `rerender-defer-reads` — updateUsers → full game-shell re-render  ✓ VERIFIED (code-traced 2026-05-31)
`app/[locale]/multiplayer/PageClient.tsx:245` `onUpdateUsers: (users) => setPlayersInRoom(users)`
runs ~2–5/sec (per-player score updates). `playersInRoom` (state declared L99) is passed into the
views as `initialPlayers` at L478 (HostView) and L493 (PlayerView), so each score tick re-renders
the whole game shell + leaderboard subtree.
Fix: extract leaderboard to a memoized child that subscribes to `playersInRoom` directly, so score
ticks don't re-render the board/shell. **Still profile a 4-player round to quantify cost** before
the refactor, then TDD the extraction. This is the highest-leverage open item.

### 📋 T2.2 `rerender-transitions` — timeUpdate (~1/sec) re-renders all timer consumers
`player/hooks/socket/usePlayerGameEvents.ts` `setRemainingTime(data.remainingTime)` on each
`timeUpdate`. Wrap the *display* tick in `useTransition` / isolate to a leaf timer component;
keep the `0 remaining` end-of-round signal as urgent state. Confirm consumer tree depth first.

### 📋 T2.3 `rerender-split-combined-hooks` — useSurvivalGameLogic mega-reducer
`components/daily/survival/useSurvivalGameLogic.ts` combines lives/words/score/hints/notifications
in one reducer; any single update re-renders every consumer. Candidate split: gameState /
wordDiscovery / hints / notifications. **High-risk refactor** — needs full survival test coverage
green before + after. Defer to a dedicated task.

### 📋 T2.4 `rerender-dependencies` — WordWheel handleSubmit 14-dep closure
`components/daily/WordWheelGame.tsx` `handleSubmit` closes over ~14 values incl. mutate-every-submit
combo/wordsFound → ref updates every render, retriggering keyed effects. Narrow to primitive deps
(combo level, word count) + derive `builtWord` at render. Verify the effect-retrigger claim.

### 📋 T2.5 `rerender-no-inline-components` — WordWheel letter handlers recreated per render
`components/daily/WordWheelGame.tsx` outer-letter map passes fresh handler fns each render →
WheelLetter children re-render. Wrap handlers in `useCallback` (stable). Low-risk but verify the
child isn't already memoized.

### 📋 T2.6 `rendering-content-visibility` — DiscoveredWordsList re-sorts on every add
`components/daily/DiscoveredWordsList.tsx` sorts the full word array on each render inside a
72px scroll box. Add `content-visibility:auto` and/or memoize the sorted list; virtualize only if
counts realistically exceed ~50.

---

## TIER 3 — Waterfalls in daily load path (verify line numbers, then fix)

### 📋 T3.1 `async-parallel` — handleStartGame sequential checks
`components/daily/DailyChallenge.tsx` `handleStartGame()` runs guest-fingerprint + server
check-played sequentially before `startPlaying()`. Parallelize via `Promise.all`. ~100–400ms on
slow networks. Verify exact lines (reviewer cited ~376–402).

### 📋 T3.2 `async-defer-await` — getGuestFingerprint blocks puzzle fetch
`components/daily/DailyChallenge.tsx` awaits fingerprint before puzzle load even for authed users.
Defer fingerprint into the check-played call; start puzzle fetch in parallel.

### 📋 T3.3 `async-parallel` — geolocation fetch gated too late
`components/daily/results/useDailyResultSubmission.ts` geolocation fetch sits inside the submission
effect after the country-code gate. Start on mount, track promise separately.

Note: daily/wheel leaderboard fetches already correctly use `Promise.all` — clean.

---

## DROPPED / NO ACTION

- ❌ `getCurrentFlag` inline in DailyChallenge.tsx:88 — tiny arrow called **once** per render; not hot.
- ❌ confettiUtils `canvas-confetti` "30KB" — lib is ~6KB gzip and canvas/instance already lazy-created
  in `getConfettiCanvas()` (first fire). Inflated estimate; not worth a dynamic-import refactor.
- ✅ already correct: WordWheelPixiRing is `next/dynamic({ssr:false})` in both consumers; lucide-react +
  framer-motion already in `optimizePackageImports`; OpponentWordFeed already isolated + drag-suppressed;
  InGameScreen uses `useFrozenWhileSelecting`.

---

## Highest-leverage next steps (for a follow-up profiling session)
1. React Profiler a 4-player MP round → confirm/quantify T2.1 (shell re-render on score tick).
2. T2.2 timer transition (cheap, broad win if shell is deep).
3. T3.1/T3.2 daily start parallelization (latency on mobile).
T2.3 mega-hook split last — biggest risk, needs its own TDD pass.
