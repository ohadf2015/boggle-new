# MP Hardening — Word-Hunt NULL-state self-heal

**Date:** 2026-06-04
**Scope:** Multiplayer stability / edge-case recovery (backend, single deliverable)
**Status:** spec → TDD

## Why this, and not the rest

Triangulated 2 codebase maps + council (gemini + grok, grok read the live repo) + advisor + ground-truth verification + PostHog telemetry. Findings that **scoped this down**:

- **Single Railway instance** (`sleep-when-inactive: true`, no replica config) → all distributed-mutex races (in-memory `gamesStarting`, `waveAdvancing`, createGame TOCTOU) are **non-issues**. Out of scope.
- **`logger.error` already auto-captures to Sentry in prod** (logger.ts:52,94) → "scoring failure isn't escalated" was false; it already pages. The real gap in the canaries is *recovery*, not observability.
- Today's commits already shipped the client-visible recovery cluster: empty-results supersede (`bdec6a01b`), reconnect resumes silently (`27a9413c6`), word-hunt late-join board sync (`6f0b9dab6`), results race recovery (`38b124497`), timer/bot resume after restart (`8e40d6be6`/`3944970da`). A `ConnectionBanner` ("Reconnecting…" + attempt count) already shows on drop. So the "silent frozen board" the report rated High is largely closed.
- **PostHog (30d):** MP = 51 sessions / 15 users, healthy completion, ~0 abandonment. Low volume → the right move is **eliminating rare-but-fatal edge cases**, not a distributed-systems overhaul (that would be over-engineering for 51 sessions).

## The one real, in-scope, fatal edge case

`backend/services/gameLifecycle/gameTimer.ts:88-96` — the word-hunt life-drain canary.

When `gameMode === 'word-hunt'` but `wordHuntState` is NULL (a round-start path that forgot to init the state — the comment says this "hid a real production freeze for a long time"), the per-tick drain branch is skipped: **no life drain, no elimination, no round-end → the board freezes forever.** Players can still submit words (event-driven) but the game never concludes. They quit.

Two problems compound:
1. **No recovery** — the round is permanently stuck.
2. **Per-tick Sentry spam** — `logger.error` fires every second (→ Sentry every second) for the life of the frozen game.

## Fix — self-heal, mirroring the all-eliminated early-end

Word scores live in `game.users[].score`, **independent of `wordHuntState`**. So ending the round yields each player's real accumulated score — strictly better than a freeze.

Mirror the existing all-players-eliminated path (gameTimer.ts:123-129): `clearGameTimer` → idempotent `endGame` → `return`.

- Count **consecutive** NULL-state ticks. Reset to 0 on any healthy (state-present) tick — so a late `initWordHuntState` cancels recovery (no false-positive end on a transient init race).
- After `NULL_STATE_RECOVERY_TICKS = 3` (~3s) of confirmed NULL state, `endGame` to recover.
- Log **once** on first NULL tick + once on recovery (not per-tick) → kills the Sentry spam; the recovery log still pages with a clear "force-ending round to recover" message.

`endGame` is idempotent (state-machine guard) and has its own scoring try/catch + fallback broadcast, so calling it here is safe even if scoring is degraded.

## Tests (TDD, mirror `gameTimer.wordHuntDrain.test.ts` harness)

New `gameTimer.wordHuntNullStateRecovery.test.ts`:
1. Does **not** end the game on a single NULL-state tick (transient guard).
2. Force-ends (`clearGameTimer` + `endGame`) after 3 consecutive NULL-state ticks.
3. NULL state that **resolves** before the threshold (state appears on tick 2) → never ends, drain proceeds.
4. Non-word-hunt game with no `wordHuntState` is unaffected (no end).

## Verification of the recovery outcome (the check the unit test's mocked endGame can't make)

`calculateGameScores` (gameScores.ts:112) builds each player's score from `game.playerWords`, **not** from `wordHuntState`. `wordHuntState` is read only defensively: `game.wordHuntState?.targetFoundBy` (gameScores.ts:139, winner sort) and a null-guarded `huntState ? {...} : undefined` summary (gameScores.ts:176-185). So with NULL `wordHuntState`, scoring **does not throw and does not zero out** — it broadcasts the real accumulated word scores. Confirmed: freeze → **usable results screen**, not an empty one. Fix is complete end-to-end, and `gameEnd.ts`'s try/catch still backstops any unrelated throw with a raw-`playerScores` fallback.

## Out of scope (documented, not done)

- Distributed mutexes (`gamesStarting`, `waveAdvancing`, createGame TOCTOU) — single instance, non-issues.
- Bot-restore auto-repair — already logs→Sentry; bots-at-0 is a weak opponent, not a fatal freeze.
- Fallback-results payload enrichment — client `ResultsPage` already backfills.
- **Waiting-room "X of Y ready" — verified WORTHWHILE, deferred.** `playersReadyUpdate` IS backed by real, changing data (readyStateManager.getPlayersReadyCount; emitted gameLifecycleHandler.ts:556/630/706), and the client receives-then-discards it (`usePlayerLobby.handleLobbyReadyUpdate`). BUT that payload drives the **between-rounds "ready for next game"** phase, a different surface from the initial waiting lobby (`PlayerWaitingView` "Host will start"). Wiring it needs a which-phase UX decision (where the count renders, i18n×5, RTL) — a clean follow-up slice, not bundled here to avoid half-wiring the wrong screen.
