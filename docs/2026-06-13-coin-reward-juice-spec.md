# Coin Reward Juice — casino-dopamine spec (2026-06-13)

## Goal
Coins earned ANYWHERE in the app should feel fun + addictive + a-bit-random-every-time.
Retire the flat "+X gold" toast. Coins fly to a top counter; the counter rolls up and
shows the delta (+X) with a flourish; sound is a complimentary, varied chime (casino
"ding-ding-ding" arpeggio), escalating + occasionally jackpot. Respect reduced-motion +
cosy/calm a11y modes.

Scope = **global coins** (`CoinContext`). Adventure "gold" (`useAdventureCurrency`) is a
SEPARATE currency with its own HUD → out of scope / fast-follow.

## Current state (verified)
- LIVE path: `addCoins()` (CoinContext) → `coinEarnToast()` (the boring toast, KILL) +
  `emitCoinEarned(amount)` → `GlobalCoinEarnFx` listener → flat `coinCollect` sound (one
  file, one pitch) + WebGL/DOM flying coins to `[data-coin-counter]` or top-right fallback.
- `CoinAnimationProvider` / `CoinCounterWithAnimation` = DEAD (never mounted). Harvest only
  the presentational `CoinCounterAnimated` (rolling number + "+X" + pulse).
- Main desktop `Header` has NO persistent visible counter → coins fly to a void today.
  ⇒ A self-contained transient HUD overlay (own anchored rolling counter) is load-bearing.
- Coin sounds: `coinCollect`, `coin-collect-2`, `coinCascade`. Howler supports per-play
  `rate` (pitch) — unused for coins.
- Mount point `essential-providers.tsx:227`: `CoinProvider`→`AccessibilityProvider`→
  `SoundEffectsProvider` ancestors all present.

## Design — single owner, one tier-roll
Evolve `GlobalCoinEarnFx` into the ONE listener that plans the whole reward moment once
(so sound + visual + counter agree on the tier). Pure plan → side effects.

### 1. Pure planner `lib/audio/coinSoundPlan.ts`  (Phase 1, TDD)
`planCoinReward(amount: number, rand: () => number = Math.random): CoinRewardPlan`
- `tier`: 'normal' | 'big' | 'jackpot'
  - jackpot if `amount >= JACKPOT_AMOUNT` (≥100) OR a small random roll (~8%) → surprise.
  - big if `amount >= BIG_AMOUNT` (≥25).
- `coinCount`: clamp(ceil(amount/25), 4..10), +bonus on jackpot. Slight random jitter ±1.
- `chimes`: array of `{ delayMs, rate, volume }` — ascending-pitch arpeggio (the casino
  ding-ding-ding). Count scales with tier (normal 3, big 5, jackpot 7). Base rate jitters
  per-moment (random within a musical band) so it "feels different every time"; each step
  climbs by a fixed musical interval. Pitch capped (≤2.0) to avoid chipmunk.
- `cascade`: boolean — play `coinCascade` layer on jackpot.
- RNG injected for testability. Cosmetic only → `Math.random` fine (NO leaderboard seed
  constraint).

### 2. Counter HUD `components/animations/CoinRewardHud.tsx`  (Phase 2, TDD)
Presentational, props: `{ total, delta, tier, anchor:{x,y}, reduced, calm, onDone }`.
- Rolling count-up `total-delta → total` (rAF ease-out; instant if `reduced`).
- Big `+delta` pop that floats up + fades.
- Anchored to fly target rect (`[data-coin-counter]`) else top-center.
- `tier==='jackpot'` (and !calm) → extra flair (gold ring burst / "JACKPOT" sparkle, GSAP
  one-off timeline). Suppressed under calm.
- Self-removing; renders via portal to `document.body`, `pointer-events-none`, aria-live
  polite so the count is announced (replaces the retired toast for SR users).

### 3. Orchestrator `GlobalCoinEarnFx.tsx`  (Phase 2)
On `COIN_EARNED_EVENT`: read `coins` (new total) from context + capture prev via ref →
`delta = amount`. `plan = planCoinReward(amount, rand)`. Then:
- schedule `plan.chimes` via timers → `playCoinChime({rate, volume})` (NEW param on sound
  fn, `requiresGameActive:false` ALWAYS — silent-drop trap); jackpot also `playCoinCascadeSound`.
- spawn flying coins (`plan.coinCount`) — existing WebGL/DOM, mode via `selectCoinFxMode`.
- render `<CoinRewardHud total delta tier anchor reduced calm />`.
- Reduced motion: no coins/sparkle, but HUD still renders (instant count-up) — a11y
  fallback for the retired toast. Calm: counter updates, jackpot flair suppressed.

### 4. Retire toast (Phase 2)
Delete the two `coinEarnToast(amount, reason)` calls in `addCoins` (CoinContext L258/274).
Keep `emitCoinEarned`. Keep `coinSpendToast` (spending out of scope).

### 5. Visual polish (Phase 3, last — visual-only, deferred-safe)
`spawnCoinStream`/`DomCoinBurst`: per-coin random arc height + scatter + delay + spin;
arrival → counter "bump" pulse; jackpot → denser gold sparkle. New asset: gold coin
sprite (fal) if circles look cheap — optional.

### 6. Comma-formatted totals (cross-cutting)
EVERY coin total shown to the user gets locale thousands separators (1,234 / 1.234 etc).
Use `safeToLocaleString(n, language)` (already used by `CoinBalance`). HUD rolling counter
+ delta MUST format. Audit existing coin renders for raw numbers missing separators; fix.

## A11y / i18n
- `t()` for any text ("+{n}", "JACKPOT" → use icon/emoji or translation key). aria-live.
- Reduced-motion + cosy/calm honored (see above).

## Tests (TDD, per phase)
1. `coinSoundPlan.test.ts`: tier thresholds; jackpot random-roll (seeded rand); chime count
   per tier; ascending + capped rate; determinism w/ fixed rand; coinCount clamp.
2. `CoinRewardHud.test.tsx`: rolls prev→total; renders +delta; instant under reduced;
   no jackpot flair under calm; anchors to target; self-removes.
3. `GlobalCoinEarnFx.test.tsx`: event → plays chimes (mock sound) + renders HUD; reduced →
   HUD still renders, no coin spawn; calm → no jackpot.
4. `CoinContext`: addCoins no longer calls toast; still emits event.

## Commits (ask before each)
- Phase 1: `feat(coins): pure casino coin-reward sound planner`
- Phase 2: `feat(coins): casino reward HUD counter + retire +gold toast`
- Phase 3: `feat(coins): flying-coin visual polish + jackpot sparkle`
