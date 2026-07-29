# Living Avatars — Reactive Leaderboard (v1)

**Date:** 2026-06-08
**Status:** Implemented + verified (unit + visual). Uncommitted.

**Verification done:** 11 (pure) + 6 (hook, incl. the repeat-delta discriminator) + 3 (leaderboard integration) new tests; 1029 avatar/results/in-game tests green; lint 0, tsc 0, build OK. Cadence resolved by fact (server leading-edge throttle 500ms at `wordHandler.ts:416` + 150ms client + deferred-during-drag → ~2 updates/sec max, bursts collapse into bigger deltas that self-escalate to `streak`). Visual confirmed via throwaway harness screenshot: the four moods render distinct + legible (shock is the most dramatic/readable — good, since "overtaken" is the key beat); at 48px the face is the charm detail while existing row chrome carries the loud TV signal.
**Topic:** Make avatars feel alive by wiring the dormant reactive-mood engine into the live multiplayer leaderboard.

---

## Problem

The avatar system is deep on *customization* (layered SVG, 100+ parts, premium economy) but emotionally **inert during play**. A fully-built reactive "mood" engine exists — `lib/avatar/avatarMood.ts` (`applyMood`, `MOOD_EXPRESSIONS`, durations), `hooks/useAvatarMood.ts` (`{mood, trigger, reset}`), CSS keyframes with reduced-motion handling — but it has **zero consumers in gameplay**. Verified:

- `useAvatarMood` is imported nowhere except its own definition + a doc comment.
- **Zero** `trigger('correct'|'wrong'|'streak'|'win'|'lose')` calls exist.
- `mood=` is passed only for lobby emotes (manual) and a static `win` on the results podium.

So during a match, your avatar never reacts to anything. The hard part (the expression system) was built; the cheap last mile (wiring it to game events) was left "documented for future."

## Goal

Turn the multiplayer in-game leaderboard from a static score table into a **live spectator sport**: avatars react — celebrate, flinch, gloat — to scoring and rank changes, in real time, readable across a party room / TV. On-brand ("personality everywhere," "competitive clarity," party energy + surprising charm). No new art, no new sockets, one surface.

## Why this surface (not classic SP)

Verified: **classic single-player renders no own-avatar during active play** (only opponent/bot avatars in word-found toasts + a post-game results screen). Wiring moods there would show nothing without building a *new* render surface.

The **MP in-game leaderboard** (`components/game/in-game/components/GameLeaderboard.tsx`, the desktop/TV sidebar) is the opposite: every player's avatar is *already* on screen during play, and the component *already* computes per-player `rankChange` + `scoreChange` every tick. Strictly less work, richer payoff, and it targets the TV/party-screen brand surface directly. SP own-avatar reactions move to v2.

## Design

### Core: derive a transient mood per row from data the leaderboard already has

`GameLeaderboard` already computes, per tick, a `changes` map of `{ rankChange, scoreChange }` per player (lines 215–224) and passes both into each `LeaderboardRow` (lines 265–266). Each row also reads `player.comboLevel`. We derive a mood from these three signals — entirely client-side, no server changes.

**New pure function** `deriveLeaderboardMood(input) → AvatarMood | null` in `lib/avatar/leaderboardMood.ts`:

| Condition (this tick) | Mood | Brand reading |
|---|---|---|
| `rankChange > 0` (just overtook someone) | `correct` (happy + pop) | smug celebration — "I passed you" |
| `rankChange < 0` (just got overtaken) | `emoteShock` (wide eyes + pop) | flinch — "they passed me" |
| `scoreChange >= BIG_WORD_THRESHOLD` | `streak` (flame eyes + pulse) | big-word hype |
| `scoreChange > 0` (ordinary gain) | `correct` | scored |
| `comboLevel >= 10` (sustained, no other event) | `streak` | on fire |
| otherwise | `null` (→ idle) | — |

**Priority** (a single tick can satisfy several): `rankChange < 0` (overtaken) > `rankChange > 0` (overtook) > big-word > ordinary gain > sustained combo. Rationale: the *overtaken* flinch is the most dramatic and most easily lost, so it wins; rank movement beats raw score because it's the competitive story. The function returns one mood (the winner) so callers stay trivial.

`BIG_WORD_THRESHOLD` is a named constant (start ~18 pts ≈ a strong word) exported for tuning + tests. It is a *flavor heuristic*, not exact — `scoreChange` is a total-score delta, so it can't perfectly isolate one big word, and that's acceptable.

### Hook: own the trigger + timer per row

**New hook** `useReactiveAvatarMood({ score, rank, scoreChange, rankChange, comboLevel })` in `hooks/useReactiveAvatarMood.ts`:

- Wraps `useAvatarMood`.
- **Keys its effect on absolute `[score, rank]`, NOT on the deltas.** This is load-bearing. `scoreChange`/`rankChange` are *diffed values*, not events: two consecutive equal deltas (e.g. score 10→20→30, both `scoreChange=10`) are `Object.is`-equal, so a delta-keyed effect would be skipped by React and the second word would drop its reaction — intermittently, invisibly, and *passing* unit tests that use distinct values. Absolute `score`/`rank` change on every real scoring/movement event, so the effect fires every time; the deltas are read in that same render for the *derivation*.
- Inside the effect: call `deriveLeaderboardMood({ scoreChange, rankChange, comboLevel })`; if non-null, `trigger(mood)`.
- First render is a no-op (mount: no prior event; deltas are 0 → derivation null).
- Returns `mood` to feed into `<Avatar mood={...} />`.

**Discriminating test (write first, RED):** two back-to-back renders with the *same* `scoreChange` but advancing `score` must `trigger` twice. This is the assertion that separates correct-from-broken; a delta-keyed implementation fails it.

This keeps `useAvatarMood` (generic) untouched and isolates the *leaderboard policy* in one testable unit.

### Wiring: one prop on the existing row

In `LeaderboardRow` (already receives `scoreChange`, `rankChange`, reads `player.comboLevel`):

```tsx
const mood = useReactiveAvatarMood({
  score: player.score,
  rank: player.index,
  scoreChange,
  rankChange,
  comboLevel: player.comboLevel ?? 0,
});
// ...
<Avatar customAvatar={...} avatarImage={...} size="lg" disableEffects mood={mood} />
```

> Note: confirm `player.comboLevel` is populated for *remote* players in the leaderboard payload (not just the local player). If absent it defaults to 0 and the sustained-combo branch silently never fires — degrades gracefully but worth knowing it's live.

`disableEffects` is verified safe — it gates tier glow/blink only; `applyMood` runs before that early return, so the face-swap renders regardless (confirmed in `AvatarRenderer.tsx`).

### TV readability — reuse existing row chrome

The row already renders TV-readable signals: green/red rank-change arrows (lines 90–96) and a floating `+score` delta (lines 169–173). The avatar face-swap layers *on top* of these as the charm detail; we do **not** add a new in-SVG overlay layer in v1 (deferred to v2 — see roadmap). This keeps the change contained to wiring + two new small files.

### Results podium — DROPPED (respecting an existing decision)

Original plan was to extend the podium/hero non-winner branch to `'lose'`. **Cut after reading the tests:** both surfaces already *deliberately* keep non-winners neutral — `ResultsPodiumMood.test.tsx` ("not demoralised on a top-3 podium") and `PlacementHero.test.tsx` ("no demoralising face vs upbeat copy"; the off-podium copy is the upbeat *"better luck next time"*). The loser-pout was already considered and rejected for sound UX reasons. v1 leaves results surfaces untouched and is purely the leaderboard reactive-mood layer.

## Components / data flow

```
GameLeaderboard (computes changes: rankChange, scoreChange)  ── unchanged
   └─ LeaderboardRow (scoreChange, rankChange, player.comboLevel)
        └─ useReactiveAvatarMood({scoreChange, rankChange, comboLevel})   ← NEW hook
             └─ deriveLeaderboardMood(...) : AvatarMood | null            ← NEW pure fn
             └─ useAvatarMood().trigger(mood)                             ── existing engine
        └─ <Avatar mood={mood} />                                         ── existing render
ResultsPodium / PlacementHero: mood = isFirst ? 'win' : 'lose'           ← tweak
```

## Files

**New**
- `lib/avatar/leaderboardMood.ts` — `deriveLeaderboardMood`, `BIG_WORD_THRESHOLD`. Pure, no React, no mocks.
- `lib/avatar/__tests__/leaderboardMood.test.ts` — truth table for every branch + priority ordering.
- `hooks/useReactiveAvatarMood.ts` — derivation→trigger glue over `useAvatarMood`.
- `hooks/__tests__/useReactiveAvatarMood.test.tsx` — fires on overtake/score/combo; no-fire on idle tick; clears to idle.

**Modified**
- `components/game/in-game/components/GameLeaderboard.tsx` — `LeaderboardRow` calls the hook, passes `mood` to `<Avatar>`. (No change to `GameLeaderboard`'s delta logic.)
- `components/results/ResultsPodium.tsx` + `components/results/PlacementHero.tsx` — `'win' : 'lose'`.
- `components/game/in-game/components/__tests__/GameLeaderboard.*.test.tsx` — assert avatar receives a mood when scoreChange/rankChange fire.

## Error handling / edge cases

- **Missing avatar config** → `<Avatar>` already falls back to seeded/generated; `mood` is additive and never throws.
- **First tick** (no `prev`): `rankChange`/`scoreChange` are 0 → derivation returns null → idle. No spurious reactions on mount.
- **Many simultaneous reactions** (big tick): each row's mood is a cheap part-swap; wrapper animations are GPU CSS transforms on ≤~12 small avatars. No concurrency cap in v1; if profiling shows jank, add the sprite-cache (roadmap v2 perf).
- **Reduced motion**: already handled — `avatar-mood-animations.css` drops the wrapper transform under `prefers-reduced-motion` but keeps the face-swap. Nothing to add.
- **RTL**: face-swap is direction-agnostic; row chrome already flips. No RTL-specific work.
- **No i18n impact**: no new user-facing strings (expressions are visual).

## Testing

TDD, RED→GREEN per unit:
1. `deriveLeaderboardMood` truth table (pure) — every row of the table above + priority collisions (overtake+score, overtaken+combo, etc.).
2. `useReactiveAvatarMood` — triggers correct mood on each signal; **two back-to-back equal deltas with advancing absolute score fire twice** (the discriminating test); does not fire on mount / no-op tick; auto-clears via the underlying timer.
3. `GameLeaderboard` integration — render with a score/rank change and assert the `Avatar` mock receives the expected `mood`.
4. Podium — existing tests extended for the `lose` branch.

Gates: `npm run lint` + `npm run test:frontend` (scoped to touched files) + `npm run build`.

**Done gate is the live match, not the unit suite.** This is a visual/feel feature; mock-prop assertions prove wiring, not behavior (cf. crossword/word-tower/blast "shipped blind → bounced"). Before declaring done, drive it live: `PORT=3001 npm run dev`, MP on desktop viewport, watch a real tick sequence. That session is what catches (a) the repeat-delta bug in the wild and (b) the frequency question — ordinary-gain→`correct` (900ms) is the highest-frequency, lowest-information trigger; in a busy game the avatar may never settle to neutral and rank-swap drama could drown. Tune thresholds / consider suppressing ordinary-gain in favor of rank-swap-only if it reads as noise.

## Scope guard / non-goals (v2+ roadmap)

Deliberately **out of v1** (documented so the work doesn't drift), drawn from the council pass:

- **In-game player-initiated emotes** (tap a rival row → trash-talk emote, broadcast) — needs a socket event; highest *social* ceiling, next after v1.
- **SP own-avatar "corner reactor"** — a small bottom-corner avatar in classic SP that reacts to local submit/combo events (huge volume, but needs a new render surface + visual verification).
- **In-SVG overlay layer** (`overlay?: 'crown'|'sweat'|'exclaim'`) for cross-room readability beyond row chrome.
- **Seeded personality traits** (`hash(username+config)` → chaotic/smug/hype reaction style) — emergent identity, pure client.
- **Server mood broadcast on milestones** so host/spectator views show the same reactions (client-only inference can't see subtle remote moments).
- **Post-game "signature moment" montage** card.
- **Perf sprite-cache** — only if profiling demands it.

## Success criteria

- During an MP match on the desktop/TV leaderboard, scoring/rank changes visibly animate each player's avatar face within the same tick as the score update.
- Overtaking shows a smug celebration; being overtaken shows a flinch; sustained combos show flame eyes.
- Zero server changes, zero new sockets, no regression to existing leaderboard delta/combo behavior.
- All touched files pass lint + tests + build.
