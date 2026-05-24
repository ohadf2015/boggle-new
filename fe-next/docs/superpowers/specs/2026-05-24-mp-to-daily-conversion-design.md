# Sophisticated MP → Daily Challenge Conversion

**Date:** 2026-05-24
**Status:** Approved design → implementation
**Surface:** Post-multiplayer-game results screen (`ResultsPage`)

## Problem

Multiplayer (MP) is our highest-energy, most-social surface, but it converts poorly to
the one mechanic that actually drives D1+ retention: the **Daily Challenge**. A basic
nudge already exists — `components/growth/DailyChallengeInvite.tsx` — but it is shallow:

1. **Zero instrumentation.** It fires no PostHog events. We cannot measure whether it
   converts anyone, so we cannot improve it.
2. **Leaky gate (latent bug).** It hides via `useWordOfTheDay().playerFound`, which tracks
   whether the player found the *Word of the Day* word
   (`daily_word_of_day_players.found`) — **not** whether they completed today's daily
   challenge. A player who played the daily but missed the WOTD word still sees the invite.
3. **No behavioral targeting.** Copy branches only on win/loss. It ignores the player's
   actual conversion-predicting state: an alive streak about to break, a missed-day
   recovery window, a near-miss loss vs. a blowout.
4. **No urgency.** No countdown to puzzle reset, despite the daily being inherently
   time-bounded.

The player's emotional state at the MP results screen — just won, just lost narrowly,
has a 6-day streak at risk — is the strongest predictor of whether they'll start a daily.
We're throwing that signal away.

## Goal

Upgrade the existing inline invite into a **behaviorally-targeted, measurable** conversion
surface. Same footprint (no new screen, no interstitial), no new DB tables. Frontend-only
except for reusing the already-shipped `/api/daily/missed` endpoint.

Non-goals (explicitly deferred to separate specs):
- Full-screen interstitial between results and lobby.
- Rival-driven social hook ("your opponent has a 12-day streak — beat them"). Needs
  backend opponent-streak queries + privacy review.

## Verified facts (researched before writing)

| Question | Finding |
|---|---|
| Is `useEngagementStatus().streak` the daily streak? | **Yes** — `player_engagement.current_streak`. |
| Same as `useDailyChallengeStatus().currentStreak`? | **Yes, identical concept.** Both resolve to `current_streak`. `useDailyChallengeStatus` reaches it via `/api/daily-challenge/word-hunt/check-played/` and is force-refreshable → canonical. |
| Is `playerFound` the right "played today" gate? | **No — leaky.** `playerFound` = found WOTD word. Use `useDailyChallengeStatus().hasPlayed`. |
| Is placement available at the render sites? | **Yes.** `ResultsPage` has `currentPlayerRank`, `sortedScores`, `currentPlayerData`, `otherPlayers` in scope at both lines 205 (desktop) and 1083 (mobile). Currently only `isWinner` is passed. |
| Does a missed-day API exist? | **Yes** — `GET /api/daily/missed` → `{ today, missed: [{ date, puzzleNumber }] }`, 3-day window. |

## Architecture

Three units, clear boundaries:

### 1. Pure pitch selector — `lib/growth/dailyConversionPitch.ts`

A single pure function. No React, no I/O. Decides *whether* to pitch and *which* pitch.
Fully unit-testable in isolation.

```ts
export type DailyPitchVariant =
  | 'streak_at_risk'
  | 'catchup'
  | 'win_momentum'
  | 'close_loss'
  | 'loss_redirect';

export interface DailyPitchInput {
  hasPlayedToday: boolean;
  currentStreak: number;
  missedDays: number;        // count from /api/daily/missed (0 if none / unknown)
  isWinner: boolean;
  placement: number | null;  // 1-based rank; null if unknown (guest/solo)
  totalPlayers: number;      // sortedScores.length
  marginToNext: number | null; // points behind the player ranked just above; null if 1st/unknown
  isOnCrazyGames: boolean;
}

export interface DailyPitch {
  variant: DailyPitchVariant;
  accent: 'orange' | 'yellow' | 'cyan';
  /** i18n keys; selector returns keys only — never English strings. */
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  showCountdown: boolean;    // true only when urgency has a payoff (streak/catchup)
  /** Appended to the CTA href as query for attribution; date set by caller for catchup. */
  attribution: 'mp_results';
}

export function selectDailyConversionPitch(input: DailyPitchInput): DailyPitch | null;
```

**Suppression:** returns `null` when `hasPlayedToday` is true. (Already played → no pitch.)

**Priority ladder (first match wins):**

1. **`streak_at_risk`** — `currentStreak >= 1 && !hasPlayedToday`.
   Loss aversion, the strongest lever. accent=`orange`. `showCountdown=true`.
   Copy: title = streak count ("🔥 N-day streak"), body = "Ends in {countdown} — one
   puzzle keeps it alive."
2. **`catchup`** — `missedDays > 0 && currentStreak === 0 && !hasPlayedToday`.
   Loss aversion + concrete recovery. accent=`orange`. `showCountdown=true`.
   Copy: "You missed a puzzle — catch up before it's gone." CTA deep-links to the missed
   date (caller supplies the date).
3. **`win_momentum`** — `isWinner && currentStreak === 0`.
   Ride the win. accent=`yellow`. Copy: "You won! Start a daily streak while you're hot."
4. **`close_loss`** — `!isWinner && marginToNext !== null && marginToNext <= CLOSE_LOSS_POINTS`.
   Redirect the competitive sting to a fresh board. accent=`cyan`.
   Copy: "So close. The Daily's a clean slate — climb the global board."
5. **`loss_redirect`** — default fallback for any non-winner not covered above. accent=`cyan`.
   Copy: "Tough match. Reset on today's Daily — everyone starts equal."

`CLOSE_LOSS_POINTS` = `15` (module constant; tunable).

CrazyGames: when `isOnCrazyGames` is true, the body key is swapped for the existing
come-back variant (`dailyInvite.bodyCgComeBack`) regardless of branch — preserves current
D1 behavior on that platform. The *variant* (for analytics) is still recorded.

### 2. Component — `components/growth/DailyChallengeInvite.tsx` (modified)

Responsibilities: gather live state, call the selector, render, instrument.

- **Gate fix:** replace `useWordOfTheDay().playerFound` with
  `useDailyChallengeStatus()` → use `hasPlayed` for the gate and `currentStreak` for the
  streak. Drop the `useWordOfTheDay` / `useEngagementStatus` dependencies for this purpose.
- **New props (all optional, from `ResultsPage`):** `placement`, `totalPlayers`,
  `marginToNext`. Backward-compatible; absent → selector treats placement as unknown.
- **Countdown:** live mm:ss / `Hh Mm` countdown to next puzzle reset, rendered only when
  `pitch.showCountdown`. Reuse the existing daily-reset countdown utility used by
  `DailyChallengeBanner` (locate during planning; if none is shareable, extract a pure
  `msUntilDailyReset(now)` into `utils/dailyChallenge/`). 1s tick via `setInterval`,
  cleaned up on unmount.
- **CTA href:** `/daily?from=mp_results` (catchup variant appends `&date=YYYY-MM-DD`).
- **Dismiss:** unchanged sessionStorage mechanism.

**Instrumentation (the core measurement win):**
- On first render of a non-null pitch: `posthog.capture('growth:daily_conversion_shown', { variant, surface: 'mp_results', streak: currentStreak, placement, totalPlayers })`. Fire once per mount (ref guard).
- On CTA click: existing `trackCtaClicked({ ctaId: 'mp_to_daily', location: 'mp_results', metadata: { variant, streak } })`.
- On dismiss: `posthog.capture('growth:daily_conversion_dismissed', { variant, surface: 'mp_results' })`.

Event names follow the existing `growth:*` convention (cf. `growth:game_feedback`).

### 3. Wiring — `components/views/ResultsPage.tsx` (modified)

At both render sites (desktop ~205, mobile ~1083) pass the already-in-scope placement
data:

```tsx
<DailyChallengeInvite
  isWinner={isCurrentUserWinner}
  placement={currentPlayerRank}
  totalPlayers={sortedScores.length}
  marginToNext={marginToNext}  // computed once near sortedScores
/>
```

`marginToNext` = how many points the current player finished **behind the player ranked
immediately above** them (the gap that defines a "close loss"). With 1-based
`currentPlayerRank`, the player above sits at array index `currentPlayerRank - 2`:

```ts
const marginToNext =
  currentPlayerRank > 1 && currentPlayerData
    ? sortedScores[currentPlayerRank - 2].score - currentPlayerData.score
    : null; // null when 1st place or rank/data unknown
```

Verify the index against `useResultsData`'s sort order during implementation and lock it
with a test (a player who lost by 8 points → `close_loss`; by 40 → `loss_redirect`).

## Catch-up data flow

`missedDays` feeds the selector but requires a network call. To avoid a fetch on every MP
results view:
- Lazy-fetch `GET /api/daily/missed` **only** when `!hasPlayedToday && currentStreak === 0`
  (the only state where the catchup branch can win).
- On failure / non-200 → treat `missedDays = 0` (catchup simply doesn't fire). Graceful.
- No new endpoint; reuse the shipped route.

## Testing (TDD, mandatory)

**Unit — `lib/growth/__tests__/dailyConversionPitch.test.ts`** (drives the selector):
- Suppresses when `hasPlayedToday`.
- `streak_at_risk` wins over win/loss when streak ≥ 1 and not played.
- `catchup` fires when streak 0, missedDays > 0, not played — and does *not* override
  an alive streak.
- `win_momentum` only when winner AND streak 0.
- `close_loss` vs `loss_redirect` boundary at `CLOSE_LOSS_POINTS` (14 → close, 16 → redirect).
- `placement === null` (guest/solo) → never `close_loss`; falls to `loss_redirect`.
- Returns i18n keys, never literal English.

**Component — `components/growth/__tests__/DailyChallengeInvite.test.tsx`:**
- Hidden when unauthenticated / `hasPlayed` true / dismissed.
- Fires `growth:daily_conversion_shown` once on mount with correct variant.
- CTA click fires `trackCtaClicked` with variant + correct href (`?from=mp_results`).
- Dismiss fires `growth:daily_conversion_dismissed`.
- Countdown rendered only for `showCountdown` variants.
- Mock `useDailyChallengeStatus`, `posthog`, `/api/daily/missed` fetch.

## i18n

English (`translations/en.js`) authoritative. New / revised keys under `dailyInvite.*`:
`streakAtRiskTitle`, `streakAtRiskBody`, `catchupTitle`, `catchupBody`, `winMomentumTitle`,
`winMomentumBody`, `closeLossTitle`, `closeLossBody`, `lossRedirectTitle`, `lossRedirectBody`,
`playNow`, `resetCountdown`. Add parallel keys to `he/sv/ja/es` — **native review pending**
(flag in commit, per project convention).

## Phasing (one commit per phase, ask before committing)

- **Phase 1 — Foundation + instrumentation.** Pure selector with three core variants
  (`streak_at_risk`, `win_momentum`, `loss_redirect`); leaky-gate fix; canonical streak
  source; impression/click/dismiss events; `?from=mp_results`. **Shippable measurement win
  on its own** — unlocks lift analysis for everything after.
- **Phase 2 — Urgency + placement.** Live countdown for `streak_at_risk`; wire placement →
  `close_loss` variant.
- **Phase 3 — Catch-up lane.** Lazy-fetch `/api/daily/missed`; `catchup` variant +
  dated deep-link.

## Files

| Action | Path |
|---|---|
| NEW | `fe-next/lib/growth/dailyConversionPitch.ts` |
| NEW | `fe-next/lib/growth/__tests__/dailyConversionPitch.test.ts` |
| MODIFY | `fe-next/components/growth/DailyChallengeInvite.tsx` |
| MODIFY/NEW | `fe-next/components/growth/__tests__/DailyChallengeInvite.test.tsx` |
| MODIFY | `fe-next/components/views/ResultsPage.tsx` (2 render sites + marginToNext calc) |
| MODIFY | `fe-next/translations/{en,he,sv,ja,es}.js` (`dailyInvite.*`) |
| REUSE | `GET /api/daily/missed`; daily-reset countdown util |

## Success criteria

- `growth:daily_conversion_shown` / `_dismissed` + `mp_to_daily` CTA events flowing in
  PostHog with `variant` breakdown → conversion measurable per variant.
- Leaky gate closed: a player who completed today's daily (regardless of WOTD) no longer
  sees the invite.
- Pitch copy matches player state per the priority ladder.
- `npm run lint && npm run test && npm run build` green. TDD throughout.
