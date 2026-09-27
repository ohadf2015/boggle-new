# Quick Play — Design Spec (2026-07-06)

Beta-only solo arcade hub: pick a mode on a draggable wheel, play a short round with no bots, get scored against the perfect score, earn coins/XP, see how you rank, challenge friends on the same board.

## Goals

- One clean screen, zero decision overload: wheel + PLAY. Default = Random.
- Rounds feel like a slot-machine loop: spin → play (60s) → results → spin again.
- Score is always framed vs **perfect** (solver max), never vs bots.
- Viral loop = seeded challenge links (friend plays the SAME board), not emoji grids.
- Track mode choice + funnel in PostHog so we learn what players actually pick.
- Beta users only (`is_beta_tester || is_admin`).

## Modes (4 + Random)

| Mode | Color family | Embedded component | Result callback |
|---|---|---|---|
| `classic` | lime | `SinglePlayerGame` (`components/singleplayer/SinglePlayerGame.tsx`) | `onGameEnd(SinglePlayerResultsData)` |
| `blast` (LEGACY v1) | pink | `BlastGame`/`BlastView` (`components/blast/legacy/`) | timer expiry → state; adapter wraps |
| `word-hunt` | cyan | `DailyWordHuntSurvival` (`components/daily/DailyWordHuntSurvival.tsx`) | `onComplete(SurvivalGameResult)` |
| `wheel-rush` (Word Wheel) | purple | `WordWheelGame` (`components/daily/WordWheelGame.tsx`) | `onComplete(WordWheelGameResult)` |

Random (default knob rest state) picks uniformly among the 4 client-side at PLAY press. No bots anywhere: daily/blast/wheel have none; classic adapter never instantiates `botManager`.

## Distinct from MP (hard rules)

Founder requirement: must not feel like multiplayer.

- Interaction: knob-drag wheel, never a card grid (`BattleModeCard` is MP's language). No lobby, no seeking overlay, no avatars on entry.
- Identity color: **neo-cozy** (`--neo-cozy #f4a261`, the palette's solo/practice family) for knob, round chip, hub chrome. Pink stays MP's. Mode color floods only after a mode is dragged to.
- Core stat: % of perfect (board ceiling), not placement. Percentile/leaderboard secondary, below the gauge.
- Copy: "you vs the perfect score" / "beat the board" — never battle/opponents/match.
- Loop: spin → play → results → spin. Zero pre-game config.

## Screens

### 1. Wheel picker (`/quick-play`)

- 4 mode nodes on a ring (60°-orbit math borrowed from `WordWheelPixiRing`, but plain DOM — no Pixi needed for 5 elements).
- Center knob, resting = RANDOM. Drag knob toward a node → magnetic snap (CSS transform + spring), `haptics.selection()` tick + SFX per snap, screen accent floods with mode color. Tap node also selects (a11y/desktop). Release outside ring = back to Random.
- Drag = native pointer events (repo precedent: `useWheelDragSpell.ts`), NOT framer drag.
- Big PLAY button in selected mode color. Sub-caption: "60 second round · no bots · you vs the perfect score".
- Round counter chip (session round #). BETA chip on title.
- Mockups: Claude Design project "Design System" → `quick-play/01-mode-wheel.html`, `quick-play/02-round-results.html` (pending /design-login push; local copies in session scratchpad).

### 2. Round (embedded mode)

`QuickPlayHub` swaps wheel → game component with a `QuickRoundConfig`:

```ts
type QuickRoundConfig = {
  mode: 'classic' | 'blast' | 'word-hunt' | 'wheel-rush';
  seed: string;            // deterministic board; shared via challenge links
  durationSec: 60;
  puzzle: unknown;         // mode-specific payload from /api/quick-play/round
  perfectScore: number;    // solver max, computed server-side
};
```

One thin adapter per mode (`components/quick-play/adapters/`) normalizes the four result shapes to:

```ts
type QuickRoundResult = {
  mode; seed; score; perfectScore; scorePct;      // score/perfectScore, capped 100
  wordsFound: number; totalWords: number; durationMs: number;
};
```

### 3. Results (between rounds)

Composed from existing `components/daily/results/*` pieces + `RivalCompareCard`:

- Hero: % -of-perfect gauge (count-up), score, words X/Y.
- Improvement: Δ vs player's rolling average for that mode (last 10 quick rounds, client-computed from API history).
- Rewards: coins (server-granted via `sync_coins` path) + XP chips.
- Percentile: "Better than N% of Quick Play players today" (server-computed).
- Ghost rival card: challenge rival (same-seed friend score) if one exists, else weekly `ghost_rivals` rival. "You took the lead vs Maya".
- Leaderboard peek: top 2 + your row; link → full quick-play leaderboard (today / all-time tabs).
- CTAs: **SPIN NEXT ROUND** (primary, returns to wheel), **CHALLENGE A FRIEND — SAME BOARD** (share).
- Celebrations, tier-scaled via `fireConfetti`/`fireRankConfetti`: personal best < beat rival < top-10% today. Static appear on mobile web (pitfall Class 5 — no fullscreen opacity tween, hardcode `bg-neo-navy`).

## Backend

### Round creation — `POST /api/quick-play/round`

Body `{mode, seed?}` (seed present when accepting a challenge). Server generates the board deterministically from seed (reuse daily gridGeneration utils), runs `findAllWordsAsync` (`backend/modules/wordValidatorPool.ts`) to get word list + `perfectScore`, returns `QuickRoundConfig`.

Perfect definition per mode:
- classic / word-hunt / blast: solver total on the initial grid. (Blast cascades can exceed it → cap `scorePct` at 100; approximation is acceptable and explained by the cap. `ponytail:` initial-grid max, cascade-aware solver if % feels wrong.)
- wheel-rush: sum of puzzle word list scores (already exhaustive).

### Submit — `POST /api/quick-play/submit`

Body: `QuickRoundResult` (+ auth). Server:
1. Validates plausibility (score ≤ perfectScore recomputed from seed; rate limit).
2. Inserts `quick_play_results` row.
3. Awards coins (`calculateGameReward` scale, capped) + XP (`increment_player_xp`, existing daily caps apply) server-side.
4. Updates weekly ghost rival score (`increment_ghost_rival_score`).
5. If round was a challenge acceptance → writes challenger notification row.
6. Returns `{coins, xp, percentileToday, rankToday, rival, history[last10 same-mode scorePct]}`.

### Tables (one migration)

```sql
quick_play_results(id, user_id, mode, seed, score, perfect_score, score_pct, created_at)
  -- index (created_at, score_pct) for daily percentile; index (user_id, mode, created_at)
quick_play_challenges(id, challenger_id, mode, seed, challenger_score, accepted_by, accepted_score, created_at)
```

Percentile: `count(score_pct < mine) / count(*)` over today's rows (SQL RPC). No realtime publication (rule 50 — no consumer).

### Leaderboard — `GET /api/quick-play/leaderboard?range=today|all`

Top 50 by best `score_pct` (tie-break score), plus caller's rank. Simple query, no season plumbing (`ponytail:` separate from season leaderboard on purpose — quick play is % -based, season is points-based).

## Viral loop

1. Results → "Challenge a friend — same board" → `getBragShareUrl`-style link `/quick-play?challenge=<id>` + Web Share (native) / clipboard fallback + share image via `shareImageGenerator` (score % + mode color card).
2. Friend opens link → beta-gated page shows challenge banner ("Maya scored 68% on this board") → plays the identical seed.
3. Friend's score posts back to the challenge row → challenger sees "Maya answered your challenge" rival card next session → rematch CTA.
Loop closes without either player leaving quick play. Non-beta recipients land on homepage with a "Quick Play is in beta" toast (no dead link).

## Beta gate

- Page gate: copy `/adventure` pattern — `canSeeInWorkModes` redirect in PageClient (`app/[locale]/adventure/PageClient.tsx:39-50`), robots `index:false` in layout.
- Entry point: Quick Play card in landing mode cards (`LandingChallengeCards` / `LandingModeCubes`), rendered only when `canSeeInWorkModes`.
- Dual-source pitfall (Class 1): gate renders nothing until profile resolved — no flash of the card for non-beta users.

## Analytics (PostHog)

| Event | Props |
|---|---|
| `quick_play_mode_selected` | `mode`, `method: drag\|tap\|random`, `roundIndex` |
| `quick_play_round_completed` | `mode`, `scorePct`, `coins`, `xp`, `percentile`, `roundIndex` |
| `quick_play_challenge_shared` | `mode`, `seed` |
| `quick_play_challenge_accepted` | `mode`, `seed` |
| `quick_play_rival_beaten` | `mode`, `rivalType: challenge\|weekly` |

## i18n

All strings `t('quickPlay.solo.*')` — 6 locales (en, he, sv, ja, es, ru). Hebrew RTL: wheel is rotationally symmetric (no flip needed); results rows use logical properties. `{code}`-style single-brace interpolation (repo convention).

## Testing

TDD per repo rules. Key RED targets:
- Wheel: pointer-drag selects nearest node, release-outside returns Random, tap selects, selection fires PostHog event with correct `method`.
- Adapters: each mode's native result → normalized `QuickRoundResult` (fixtures per mode).
- Percentile RPC: seeded rows → expected percentile; zero-rows day → 100%/"first today" path (no divide-by-zero).
- Submit route: rejects score > recomputed perfect; awards coins once per round id (no double-submit — Class 2 re-entrancy guard like blast `processingRef`).
- Challenge flow: accept writes `accepted_score`, challenger fetch surfaces it.
- Beta gate: non-beta profile → redirect; unresolved profile → no card render.

## Risks / notes

- `BlastGame` legacy wasn't built for prop injection — adapter may need a small refactor of its config entry; scoped to reading initial grid/duration from props (explorer flagged this).
- Word Hunt survival is target-stream-based; its "perfect" = solver total of the 60s board, consistent with others.
- Prior session (07-05 mode-removal spec): shiritori/sealed-bid/crossword are dead/admin-gated — NOT included here; the 4 quick-play modes are all live ones.
