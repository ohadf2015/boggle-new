# MP Mode — react-doctor + performance-audit (2026-06-05)

Scope: **multiplayer only**. react-doctor v-latest, full `fe-next/` scan, findings filtered to MP files
(Explore-located: `components/multiplayer/*`, MP hooks, `backend/services/gameLifecycle/*`).

**Overall: 93/100 ("Great"). 3 errors, 27 warnings repo-wide.**
Every MP finding lands in **one file**: `components/multiplayer/WheelRushView.tsx` (798 L).
All other MP surfaces — `MultiplayerInGameView.tsx` (717 L), `MultiplayerFlow.tsx`, `RoomListView.tsx`,
`useMultiplayerSocket.ts` (667 L), `SocketContext.tsx` (690 L), backend gameLifecycle — are **clean per the tool.**

Environment that changes the verdicts:
- **React Compiler ENABLED** — `next.config.mjs:83 reactCompiler:true`, React 19.2.1, `babel-plugin-react-compiler ^1.0.0`.
- **react-scan installed** — `app/providers.tsx:40-56` (runtime re-render profiler, dev-gated).

---

## The headline: DO NOT delete the 15 manual-memoization findings

react-doctor flags 15 `react-compiler-no-manual-memoization` in WheelRushView (L117,140,199,218,223,254,
379,395,417,425,429,442,447,454,459): *"useMemo/useCallback is dead weight, React Compiler caches it — delete it."*

This is **wrong in this file**, by asymmetry:
- If the compiler optimizes WheelRushView → manual memo is redundant; deleting it changes nothing at runtime (pure LOC churn, zero perf gain).
- If the compiler **bails** → manual memo is the *only* memoization; deleting it **regresses** re-renders.
- The tool's own L166/L169 `refs` errors assert *"React Compiler can't optimize this component."* → we are in the **bail** case.

Either branch, deletion is not a perf win. **Action: skip all 15.** (This is the opposite of the tool's auto-advice.)

---

## The 3 errors = the real (and only) MP perf lever

| Line | Rule | What |
|---|---|---|
| 166 | `refs` | `latestRef.current = { t, puzzle, username, …sounds }` — **ref write during render** |
| 169 | `refs` | `onFogProgressRef.current = onFogProgressChange` — **ref write during render** |
| 174 | `set-state-in-effect` | `setFogActive(false)` synchronous in the fog effect |

These ref writes are the **bailout cause**. Fix them → compiler optimizes the whole 692-L component →
the memoization question dissolves. **This is the actual MP perf win** (un-bail = leaderboard ticks stop
re-rendering the entire wheel board).

**But the refs are load-bearing.** `latestRef`/`onFogProgressRef` exist so the once-bound socket
`onResult`/`onInit` closures read latest props *without re-registering the listener* (re-registration
storms are a documented footgun in this repo's MP history). Naively removing them re-introduces that bug.

**Blessed fix:** `useEffectEvent` (React 19, available).
- `onFogProgressRef` (L168-169): clean single-callback case → wrap `onFogProgressChange` as an effect event.
- `latestRef` (L165-166): harder value-bag case → expose latest reads as effect events called inside the socket handlers.

**TDD gate (mandatory before shipping):** the discriminating test is *not* "renders without crashing".
It is: **socket listeners register exactly once across re-renders/prop changes, AND the once-bound handler
reads the latest prop values.** That is the exact behavior the bailout pattern protects.

**Risk:** this rewires the most race-prone path in a live scoring game. Recommend it be done on a branch,
gated on the test above + a live 2-player verification (see Profiling). Not blind-shipped.

---

## False positives — documented, no action

| Line | Rule | Why it's a FP |
|---|---|---|
| 276 | `no-cascading-set-state` ("9 setState") | The 9 setStates live inside `onInit` — an **async socket callback**, not the sync effect body. setState in an event callback is correct React; no cascade. Lexical counter can't tell callback-body from effect-body. |
| 173 | `no-cascading-set-state` ("4 setState") | The four `setFogActive` calls are **mutually-exclusive branches**; at most one fires synchronously per run. No cascade. |
| 366 | `prefer-use-effect-event` (`flash`) | Same family as the L166 lever — only worth touching as part of the un-bail refactor, not standalone. |

---

## Maintainability — note only (out of scope for a perf pass)

- **L105 `no-giant-component`** (692 L) + **`prefer-useReducer`** (10 useState): real, but refactoring a live
  game component blind is riskier than the debt. Defer; pairs naturally with the un-bail refactor if/when taken.
- **L157 `rerender-lazy-ref-init`** — `useRef(new Set())` re-allocs + discards a Set each render.
  True positive but **near-zero impact**: the ref is overwritten by the L204 effect before any read, so the
  initial value is dead. The recommended lazy-init (`if (ref.current === null) …`) would itself be a
  conditional ref-write-during-render (same class as L166). Net value ≈ 0. **Left as-is deliberately.**
- **button-has-type ×3** — `ScientificTipsCarousel.tsx` = brain, **not MP**. Excluded from scope.

---

## performance-audit (11-point) — MP findings

react-doctor is *static*; performance-audit asks for *runtime* evidence. MP-relevant points:

1. **Stack** — Next 16.2.6 / React 19.2.1 / React Compiler ON / TS / Socket.IO 4.8 / Express 5.1 / Redis / Supabase. Sentry + PostHog web-vitals wired. Healthy.
2. **Code (re-renders)** — single hotspot = WheelRushView compiler bailout (above). No O(n²) / leak patterns found in MP files.
4. **Frontend / re-renders** — **react-scan is the empirical test.** The open question: *does every leaderboard
   tick re-render the full 692-L wheel board?* Un-bailing the compiler is exactly what would fix it — and
   react-scan is how you'd measure before/after. Needs a **live 2-player session** (playwriter, dev :3005).
6. **Async / race** — socket listener-registration discipline is the live risk; it's the same code as the
   un-bail lever. Any refactor MUST preserve register-once semantics (TDD gate above).
7. **Memory** — timers (`fbTimer`, `autoResetTimerRef`, `celebrationTimerRef`, fog interval) all have cleanup
   returns (L192-195, L214-216, L271-273). No leak found.
- DB / Network / Build / Monitoring — no MP-specific regressions surfaced by this pass.

**Recommended next step (empirical):** run react-scan in a live 2-player Wheel Rush match to confirm/quantify
the leaderboard-tick re-render cost. If it re-renders the whole board per tick → schedule the `useEffectEvent`
un-bail (TDD-gated). If react-scan shows it's already cheap (manual memo holding) → close as "no action, 93/100 is honest."

---

## Bottom line

- **Apply now:** nothing. The score is 93/100 and the one safe micro-fix (L157) nets ≈0 and risks a new flag.
- **Do NOT:** delete the 15 memoizations (regression trap under compiler bailout).
- **Schedule (branch + TDD + live verify):** `useEffectEvent` un-bail of WheelRushView L166/L169/L174 — the only
  finding with a real MP perf payoff. Gate on register-once + reads-latest test; measure with react-scan.
- **Negative scope is itself a result:** every other MP component/hook/backend service is clean per the tool.
