# Blast MP Audit + Fixes — 2026-06-11

Goal: audit MP blast mode for instability, fix flaws, improve MP UI, and make a new
host's first random game land on **blast** instead of classic.

## Audit verdict
Blast MP uses **per-player independent boards** cloned from one shared seeded template
(`getOrInitPlayerBoard` → `state.playerBoards[username]`). Two silent failure classes
(no Sentry events in 30d → swallowed, not crashed):

1. **Reconnect/late-join desync (HIGH).** `playerReconnectHandler.ts` and the late-join
   path send `blastModeState.grid/tileStates` — the *pristine template* — not the
   player's evolved `playerBoards[username]`. A reconnecting player snaps back to a
   fresh board; subsequent words resolve against tiles the server already cleared.
2. **Cascade error-swallow corruption (HIGH).** `wordValidationHandler.ts` cascades in
   place (`cascadeBlastWord`) inside a broad `try`; `blastBoardUpdate` is emitted
   *inside* the try while `addPlayerWord` runs unconditionally. A mid-cascade throw
   leaves the board half-mutated, never resynced, yet the word still scores → every
   later word compounds the corruption.

Deferred (advisor-endorsed satisfying-set): #3 Redis `new Map({})` on server-restart
(needs restore-path verification, restart-only), LOW defensive guards, dead code, the
4.2:1 cyan contrast nit, i18n fallback strings.

## Fixes (TDD)

### A. First random game = blast (feature)
`gameModeSelector.selectNextGameMode`: when `history.length === 0` and `blast` ∈ enabled,
return `'blast'`. Only reached on random rolls (explicit picks bypass the selector).
Game 2 onward keeps weighted no-repeat.

### B. Reconnect/late-join board fix
Read the player's real board via `getOrInitPlayerBoard(state, username)`; send
`board.grid / tileStates / overlay / seed`.

### C. Cascade integrity
Add pure `cloneBlastBoard(board)` + `safeCascadeBlastWord` (inject-testable). Cascade on
the clone; commit to `playerBoards[username]` only on success and emit the new board; on
throw emit the **untouched** authoritative board so the client always resyncs. Word
degrades to letter-bonus-only (computed outside the try).

### D. Mobile live placement + closest player (UI)
Extend the existing `MobileRankIndicator` (already shows "You're #N / total" + overtake
cue) with a closest-player chip: the single nearest rival (chased / chaser) + signed
score gap. Reuses pure `selectClosestRivals(n=1)`. i18n `multiplayer.rival.*` ×5, RTL,
neo black-on-bright contrast.

## Recovery note
First implementation pass (all 4 clauses, green) was wiped from disk by the autonomous
git daemon's reset/merge to origin/master mid-session (reflog: `2be4c54d8` → reset →
FF-merge `67662bf0c`). Re-applied against the new HEAD from in-context content.
