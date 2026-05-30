# Cozy Mode v2 — "No-Rush" (calmer gameplay + in-game visual cohesion)

**Date:** 2026-05-30
**Status:** Design → implementation
**Author:** Claude (autonomous, /goal: "improve even more the cozy mode … actually change the gameplay to be adjusted to a more calm gameplay")

## Problem

Cozy / Calm Mode today is **visuals & feedback only**. The deep pass on
2026-05-28 nailed the *look* (warm "paper & oak" palette, soft shadows, AA
contrast, calm motion, quiet-checkmark celebration) — but it changes **zero
gameplay**. The clock still ticks the same, bots still race you, urgent beeps and
"time's running out!" audio still fire, and a loss-aversion rewarded-ad prompt
still pops at the most stressful moment. The user explicitly wants the *gameplay*
adjusted to feel calm, plus the look pushed "even more."

## Design constraint that shapes everything: reward-neutrality

In this codebase **anything that lets you find more words feeds persistent
progression**. An SP-classic solo game-end awards XP (`/api/stats/record-game`),
records quests (`updateQuestProgress` — `wordsFound`/`longWordsFound`), and grants
combo coins live during play (`awardComboCoins`). Verified destinations of score:
XP ✅, quests ✅, combo coins ✅; personal-best is localStorage-only; **no**
competitive leaderboard.

⇒ A calmer mode must **not** inflate rewards. That rules out the obvious-but-wrong
levers: longer timer, easier boards, more combos (all increase words → XP/coins/
quests). Calm must target **pressure sources that do NOT gate word-count**:
opponent pacing and panic cues. This is the whole reason the scope looks the way
it does.

Out of scope for the same reason: **earthquake / fire-round** mechanics. Fire round
grants a score multiplier (reward-coupled); the grid-regen earthquake is bundled in
the same `useEarthquakeFireRound` hook. Touching either risks inflating/deflating
rewards, so they stay as-is (their *visuals* are already calmed by
`disableEarthquakeEffects`/`disableFireRoundLights`). Noted as a deliberate
deferral, not an oversight.

## Scope

Single-player only (multiplayer shares one server-authoritative timer/board, so
per-player gameplay changes would be unfair — MP keeps cosy *visuals* only). The
three changed SP timed/bot consumers:

- `components/singleplayer/game/hooks/useSinglePlayerCore.ts` (SP classic + solo-bots)
- `components/singleplayer/game/hooks/useBotSimulation.ts` (solo bots)
- `components/singleplayer/game/components/PortraitGameLayout.tsx` + `LandscapeGameLayout.tsx` (time-low ad prompt + in-game timer)

## Part A — Calmer gameplay (reward-neutral)

### A1. Slower solo bots — the headline change
Bots stop *racing* you. Pure, reward-neutral (bot scores never touch the player's
XP/quests/coins), fairness-free (SP only).

New pure module `lib/cosy/cosyGameplay.ts`:
```ts
/** Calm pacing stretches bot think-time so the player never feels chased.
 *  1.6× brings hard bots ~1.8–3.0s → ~2.9–4.8s, easy ~5–8s → ~8–12.8s:
 *  present but unhurried, never pointless. */
export const CALM_BOT_PACING_MULTIPLIER = 1.6;
export function applyCalmBotPacing(intervalMs: number, calm: boolean): number {
  return calm ? Math.round(intervalMs * CALM_BOT_PACING_MULTIPLIER) : intervalMs;
}
```
`useBotSimulation` gains an optional `calmPacing?: boolean` option (passed from
`SinglePlayerView`, which already reads accessibility context). `getBotInterval`
wraps its computed interval in `applyCalmBotPacing(interval, calmPacing)`.

### A2. No urgency audio
Reuse the existing cosy flag `suppressTimerUrgency` (already `true` under cosy —
semantically "stop the timer shouting") at the audio sites:
- **Countdown beep** (`useSinglePlayerCore.ts:197-201`): gate `playCountdownBeep`
  behind `!suppressTimerUrgency`.
- **Urgent game-music ramp** (`useGameMusic`, called `useSinglePlayerCore.ts:227`):
  pass the suppress flag so the low-time urgent ramp is held at the calm bed (the
  hook still plays in-game music, just no "running out" escalation).

Reward-neutral: muting cues doesn't change how many words you find.

### A3. No loss-aversion ad prompt
The time-low rewarded-ad prompt ("loss aversion at the most urgent moment",
Portrait/Landscape layouts) is deliberate stress. Suppress it under cosy
(`suppressTimerUrgency`/`cosyMode`). It's a *prompt*, not a reward grant — removing
it is reward-neutral and squarely on-theme. (Players can still earn ads elsewhere;
we only drop the panic-timed nag.)

## Part B — In-game visual cohesion ("looks good even more")

The token-driven *chrome* is already excellent and recently done — do **not** redo
it. The gap tokens can't reach is the **in-game play surface**, and the new calm
gameplay needs a matching look:

### B1. Calm in-game timer presentation
`CircularTimer` already clamps urgency colour/scale under cosy, but the ring still
*depletes* — a shrinking red-free ring is subtly less stressful yet still "time
pressure" shaped. Under cosy, present the timer calmly: steady cozy-accent ring,
no pulse, plain remaining-time readout. (Visual only; the timer still counts and
still ends the round — we are not making it untimed, which would inflate rewards.)

### B2. "Take your time" calm-session cue
A small, quiet indicator on the SP game HUD when cosy is active, e.g. a soft pill
reading `t('cosy.noRush')` ("Calm · no rush"). Reinforces that this is a relaxed
session and explains the absence of beeps/urgency so it reads as *intentional
calm*, not a broken timer. New i18n key across all 5 languages (en/he/sv/ja/es),
RTL-checked.

### B3. Verify, don't re-skin
Live playwriter pass (/en + /he, phone width, cosy via `?cosy=1`) on the actual
game screen during validation to confirm the play surface reads clean & calm and
nothing regressed. No speculative re-skinning of already-done chrome.

## Architecture / boundaries

- **`lib/cosy/cosyGameplay.ts`** — new pure module, the gameplay tuning spine.
  Kept SEPARATE from `lib/cosy/cosyPreferences.ts` whose documented invariant is
  "cosy can only *reduce visual intensity*, never increase it." Bot pacing /
  audio gating aren't visual masks, so they live in their own pure module to keep
  that boundary clean. Mirrors the existing `celebrationScale.ts` / `timerUrgency.ts`
  split — small, single-purpose, independently testable.
- No server changes. No reward-path changes. No DB / migration. No MP changes.
- Fully reversible: every change is gated on `cosyMode`/`suppressTimerUrgency`;
  toggling cosy off restores exact current behaviour with no bookkeeping.

## Testing (TDD, mandatory)

1. `lib/cosy/__tests__/cosyGameplay.test.ts` — `applyCalmBotPacing`: identity when
   `calm=false`; ×1.6 rounded when `true`; multiplier constant pinned; never NaN/0
   for positive input.
2. `useBotSimulation` light test: with `calmPacing: true`, computed interval is the
   stretched value (assert via the pure helper boundary / a timing assertion).
3. Audio-gating tests: countdown beep NOT called when `suppressTimerUrgency` true;
   called when false (guard logic, pure-extractable if needed).
4. Ad-prompt suppression test: time-low prompt does not render under cosy.
5. i18n contract: `cosy.noRush` present in all 5 locale files.
6. Existing cosy suites stay green (`cosyPreferences`, `celebrationScale`,
   `timerUrgency`, `calmPalette.contract`, `QuietCelebrationLayer`).

## Success criteria

- Cozy SP classic: bots visibly unhurried; no countdown beeps; no urgent-music
  ramp; no time-low ad nag; calm steady timer; quiet "no rush" cue; **identical
  XP/coin/quest math** to non-cosy for the same play.
- Non-cosy gameplay byte-for-byte unchanged.
- `npm run lint && npm run test && npm run build` green. Live /en + /he cosy verified.

## Explicitly deferred (with reason)
- Earthquake/fire-round calming — reward-coupled (fire = score multiplier).
- Daily / Word-Wheel timer relax — daily is comparative; fairness risk.
- Untimed/zen SP — unbounded score → reward inflation.
