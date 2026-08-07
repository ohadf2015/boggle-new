# Onboarding friction audit — 2026-08-07

Source: PostHog project 151059 (eu), session replays + event SQL.

## Era boundary (critical)
`7e565ff04` (2026-07-26) collapsed the FTUE to ONE screen (`quickStart`).
Before that: `language -> profile -> style`. **Any funnel spanning 07-26 mixes two
different products.** All numbers below are Jul 27 -> Aug 7 unless stated.

## The real funnel (per-user, post-refactor)
| Stage | Users | % of starters |
|---|---|---|
| `growth:onboarding_started` | 61 | 100% |
| `growth:onboarding_completed` | 37 | 61% |
| `growth:first_game_played` | 25 | 41% |
| `growth:game_completed` | 18 | 30% |
| `growth:first_game_won` | 12 | 20% |

**39% abandon on a single screen.** Only 41% ever start a first game.

## Signals (30d)
- `$rageclick`: ~220 total, ~77 on `/multiplayer` (es 30, en 26 + room links).
  Several are on individual letter tiles (`A x`, `R x`, `C x`, `N x`, `B x`)
  and on `Randomize` / `Aleatorio` / `Start Battle` / `Ready Up!`.
- `How to play` / `איך משחקים` rage-clicked on the landing page (3+3).
- `mp_stuck_coach_shown` 157 -> outcome `ignored` 103 (66%), `helped` 33 (21%),
  `dismissed` 12 (8%).

## Tracking gaps
- **The join funnel has no success path.** `growth:mp_lobby_join_attempted`
  fires ONLY on the socket-not-ready branch, so it counts failures and can never
  express a rate. FIXED: added `growth:mp_join_outcome`
  `{ outcome, wait_ms, isHostMode, quickPlay }` at the same chokepoint, emitted
  on every terminal path.
- `mp_stuck_coach_outcome` has no `context` -> 66% ignored tells us it is wrong,
  not *what* is wrong. (Not addressed in this pass.)

### Checked and NOT actually gaps
- `growth:onboarding_completed` **does** carry a reason: `via` is populated on
  every call site (`quick_start` 78, `auth_returning_user` 4,
  `invite_tutorial` 1). An earlier draft of this doc claimed it was missing.
- A `*_shown` counterpart to the step event is unnecessary now that new players
  see a single screen — `growth:onboarding_started` fires on mount and is
  already the "shown" signal for it.
- The `completed > started` raw discrepancy is therefore NOT a reason-tracking
  gap; both fire once per mount, so it is most likely double-mount inflation.
  It does not affect any conclusion here (the per-user funnel is computed from
  distinct persons).

## Replay observations
(filled in below as sessions are watched)

---

## ROOT CAUSE (replay-confirmed, then verified at scale)

The FTUE screen is not the main problem. The problem is what happens
**immediately after** it: the player taps PLAY / Quick Play / Let's Go and
**nothing happens**, repeatedly, with no explanation.

### Replay evidence
(Session stories were ordered at second resolution, so the *interleaving* of
events within a second is not established. The **counts** and the rageclicks
below are exact.)
- `019fd5c7` — arrived via a friend's **invite**, went through onboarding, then
  clicked **"Let's Go!" nine times**, ending in a `$rageclick`. Never joined.
  Left via the Friends tab.
- `019fd455` — clicked **Quick Start / Quick Play 7 times** (+8 join attempts),
  `game_started` = 0, 4 rageclicks. Eventually gave up on MP and went to practice.
- `019fd90b` — clicked the **language flags 8 times** (IL, RU, US, US, IL, US,
  US, RU) before finding a way forward, then bailed to "I have an account".

### Scale check (Jul 27 -> Aug 7)
- Quick-play sessions: **73 -> only 43 reached a started game (59%)**.
  (An earlier 80/46 figure was biased by construction — it folded in
  `mp_lobby_join_attempted`, which fires ONLY on failure, so those sessions were
  pre-selected for failure. Use 73 -> 43.)
  `game_started` IS emitted by multiplayer (`utils/mpGameTracking.ts:44`
  -> `trackGameStartBase('multiplayer', ...)`), so this is a real gap, not a
  measurement artifact.
  - 21 hit a **dead socket**
  - 16 **stalled silently** (no game, no error, no coach — nothing)
  - **62 of 73 (85%) saw the solo prompt** — i.e. quick play almost never finds
    a live opponent fast.

### Bug: `mp_lobby_join_attempted` is a failure counter, not an attempt counter
Both call sites are inside the socket-not-connected branch of
`app/[locale]/multiplayer/useMultiplayerJoin.ts` (L159, L175), and every single
event in the DB carries `socketReady: False` (50/50). So:
- there is **no success-path emit**, which makes the join funnel unmeasurable;
- 50 dead-socket taps from 27 distinct people in 11 days, present **every day** —
  chronic, not a spike.

The user-visible result is a `errors.notConnected` toast after a 5s wait. From
the player's side that is a button that does nothing for five seconds and then
complains.

## Ranked fixes
1. **Never let the first tap dead-end.** Socket not ready -> show connecting
   state immediately and auto-retry; on final failure route to a solo/practice
   game rather than a toast. A new player must never be told "not connected".
2. **Kill the silent stall.** 16 sessions had no game, no error, no coach.
   Anything that can stall needs a timeout -> visible outcome.
3. **Stop selling a lobby we cannot fill.** 85% of quick plays hit the solo
   prompt. Make the fast path *start a game immediately* (bots/solo) and let
   real opponents join in progress, instead of asking the new player to choose.
4. **Language step**: 8 flag clicks in one session. Selecting a flag must
   advance, not require a second confirm tap (already fixed on the main path —
   the **invite** path still runs the old `language -> profile` sequence).
5. **Invite path is the worst experience in the product** and it is the one
   with the highest intent (a friend sent them). `019fd5c7` did everything
   right and still never played.

## Tracking to add
- `growth:mp_join_outcome` `{ outcome: joined|timeout|not_connected|error,
  wait_ms, attempt_index, source }` — the missing success path.
- `growth:onboarding_step_shown` `{ step, index, total, variant }`.
- `reason` on `growth:onboarding_completed` (completed|skipped|bypassed|auto).
- `context` on `mp_stuck_coach_outcome`.

---

## THE SILENT STALL — root cause found in code

`host/components/HostPreGameView.tsx:359-364`:

> "This only FILLS the lobby with bots — it deliberately never starts the game.
> Starting is always the host's explicit action (product decision: MP mode must
> never auto-start without the host pressing Play)."

So a brand-new player taps **Quick Play**, silently becomes the *host* of an
empty room, waits out a 5s "adding bots…" countdown, gets 3 bots — **and then
the lobby just sits there forever** waiting for them to press a Start button
they have no idea is theirs to press.

| Metric (Jul 27 -> Aug 7) | Value |
|---|---|
| Sessions that reached a bot-filled / solo-prompt lobby | 117 |
| ...that went on to start a game | 76 (65%) |
| **...that never started anything** | **41 (35%)** |
| Of those 117 sessions, players in their first 24h | **109 (93%)** |

The 117 above is the union of BOTH rescue branches (the Quick Play 5s countdown
AND the public-room 15s+20s alone-timer) plus the explicitly-rendered prompt.
The population the shipped fix actually touches is narrower — quick-play
sessions whose lobby genuinely auto-filled with bots:

| Quick-play sessions with an auto-filled lobby | 29 |
|---|---|
| ...that started a game | 20 (69%) |
| **...that never started anything** | **9 (31%)** |

Use 29/9 when justifying the Quick Play change; 117/41 describes the wider
stall and is NOT all addressed here.

Both cohorts stall at the same rate (new 65.1%, returning 62.5%) — so this is a
flow defect, not a knowledge gap. But the population sitting in it is
overwhelmingly brand-new players.

## Dead socket: confirmed onboarding friction
Of the 28 people who hit the dead-socket branch, **26 were in their first 24
hours**. Not a veteran annoyance — it is first-run breakage.

## Language step: two-tap confirm still live on the invite path
`components/onboarding/LanguageSelect.tsx:26-36` — tapping a *different* flag
only selects it (fires confetti, does not advance). Only a *second* tap on the
*same* flag advances. So the same gesture behaves differently depending on
whether the flag was already selected. Session `019fd90b` tapped flags 8 times.

---

## Shipped in this pass (TDD, all tests green)

### 1. Quick Play starts itself — `host/components/HostPreGameView.tsx`
The bot-fill countdown now also starts the game **when `isQuickPlay`**. Public
rooms are unchanged and still require the host's explicit Start; that rule
protects someone who chose to open a room, and a Quick Play player did not.
Callbacks are held in refs so the effect's dep array cannot restart the
countdown on a parent re-render (that would have been a silent no-op).
Tests: `host/__tests__/HostPreGameView.quickPlayAutoStart.test.tsx` — covers the
fire case plus two negatives (public room, human joined mid-countdown).

### 2. A cold socket no longer dead-ends — `useMultiplayerJoin.ts`
- Pending state is shown **before** the wait, so the first tap visibly registers
  instead of the button sitting idle (the cause of the 7x and 9x tap sessions).
- `socket.connect()` is called explicitly — socket.io does not redial once its
  reconnection budget is spent, so the old code could only listen to a socket
  that had already stopped trying.
- Wait extended 5s -> 12s for a cold mobile radio.
- `setIsJoining(false)` on the failure paths (it was left stuck true).
Tests: `useMultiplayerJoin.coldSocket.test.ts` (5 cases incl. reconnect-within-wait).

### 3. Language step: one gesture, one meaning — `LanguageSelect.tsx`
A flag tap now always selects and never advances. Continue always advances.
Previously the identical gesture did different things depending on invisible
state. Tests updated in `__tests__/LanguageSelect.test.tsx`.

### 4. The join funnel is now measurable — `growth:mp_join_outcome`
`{ outcome, wait_ms, isHostMode, quickPlay }` where `outcome` is the server's
real answer (`joined` / `error` / `joinedAsSpectator` / `rateLimited`), or
`timeout` (server never replied within 10s), or `not_connected` (dead socket).

Deliberately emitted from the points where an attempt actually ENDS — the ack
handler, the safety timeout, the dead-socket branch — and NOT straight after
`socket.emit('join')`. Firing at send time would only mean "request sent", and
since a silent server no-reply is a known failure mode here
(`mp_lobby_join_timeout` already exists for it), that would have scored stalled
joins as successes — reintroducing the exact name-vs-firing-point defect this
event exists to correct. Guarded so exactly one outcome is emitted per attempt.

## NOT done — deliberate, needs a product call

- **The headline funnel finding is NOT addressed.** 24 of 61 starters (39%)
  never complete the single FTUE screen, and this pass does nothing about that.
  Every fix above is downstream of that screen — they help the 37 who DO
  complete it and then try to play. **We have no evidence about why the 24
  leave**; no replay in this audit captured an abandon on the quickStart screen
  itself. That is the next thing to investigate, and it needs its own session
  watching replays filtered to `growth:onboarding_started` without
  `growth:onboarding_completed`.
- **Start the match immediately and let real opponents join in progress.** 85%
  of quick plays hit the solo prompt, i.e. the lobby rarely fills with humans.
  Fixing that properly touches the MP session lifecycle (Class 2 per-round reset
  paths + Class 3 asymmetric join paths) and is a gameplay change, not a friction
  fix. Recommended, not built.
- **`mp_stuck_coach_outcome` needs a `context` prop.** 66% ignored (103/157)
  says the coach is wrong, but not what is wrong.
- **`How to play` / `איך משחקים` rageclicks (3+3).** Could not verify from a
  logged-in browser (`/en` redirects to the stored locale, and the FTUE view
  differs for a fresh visitor). Small n; needs a clean-profile check.
- **Invite path** still runs the older `language -> profile -> inviteTutorial`
  sequence. Session `019fd5c7` shows an invited player completing onboarding and
  then failing to join 9 times. The join fix above helps; the flow itself was
  left alone.

---

## Replay watching (session `019fd455`, the 7x Quick Start abandoner)

Two frames from the actual video that the event data could not have told us:

**Frame 1 — `/en/multiplayer?quickPlay=true`, cursor mid-click on QUICK PLAY.**
A red `⚠️ Offline` badge is showing at the top of the screen. So the app KNOWS
the socket is dead — and both CTAs (`QUICK START`, `QUICK PLAY`) are still
rendered fully enabled, bright lime, and inviting. The player is tapping a
button the app already knows cannot work. This is the visual half of the
dead-socket finding, and it means the fix is not only "reconnect faster" but
"do not present a live-looking CTA while offline".
Also visible: two competing primary CTAs for the same action on one screen
(`QUICK START` top, `QUICK PLAY` bottom).

**Frame 2 — the FTUE `quickStart` screen itself.** This is the screen 39% of
starters abandon, and the frame explains why: it contains a wordmark, an avatar,
a name field, 6 language flags, PLAY, "How to play", "I have an account", and a
"Make it yours forever" email capture — roughly **8 interactive targets and zero
gameplay**. There is no board, no tile, no preview of what the game even is, and
it asks for an email address **before the player has seen a single word**.

That is the direct inverse of "show the value and the fun from the first
moment", and it is the strongest remaining lead on the 39%.

## Which modes should newcomers meet first?

Completion rate for players in their FIRST 24 HOURS (30d, `game_started` ->
`game_completed`):

| mode | starts | completion |
|---|---|---|
| word-wheel | 66 | **56.1%** |
| survival | 53 | **52.8%** |
| classic | 656 | 45.1% |
| word-hunt | 290 | 33.4% |
| blast | 200 | **31.0%** |
| wheel-rush | 140 | 30.0% |
| connections | 9 | 11.1% (n too small to act on) |

The landing hub already reorders for newcomers (`practice` then `daily` first),
but `placeBlastAfterArena` force-promotes `blast` regardless of ranking — giving
a newcomer the mode most of them bounce off as an early impression.

**Shipped:** `lib/landing/newcomerModeOrder.ts` demotes `blast` below the
higher-completing cards for the newcomer cohort only (`isNewbie && !isVeteran`).
Veterans and the blast-after-arena rule are untouched. 5 unit tests.

**Deliberately NOT changed:** `connections` measured worst (11.1%) but on n=9 —
too little evidence, left in place.

---

## Follow-up pass — the two items the first pass left open

### 5. Offline no longer offers a CTA it knows will fail
`components/multiplayer/ArenaCTAStrip.tsx`. Both arena CTAs (`QUICK START`,
`CREATE PRIVATE BATTLE`) were only ever disabled on `isQuickPlayLoading`, so
the replay showed them bright, enabled and inviting **while the app was already
rendering its own `⚠️ Offline` badge**. The secondary button had no
`disabled:` styling at all — it stayed fully lit even once inert.

Now: both disable while the device is offline, the primary swaps its label to
`mp.quality.reconnecting` (an existing key — present in all 6 locales, so no
new strings and no ratchet risk), and both get real disabled styling.

**Scope, deliberately:** this covers the DEVICE-offline case, which is what the
replay showed. A first attempt also read socket state here, but `useSocket`
throws outside a `SocketProvider` and that made the leaf unrenderable — its own
existing tests caught it. The dead-socket-while-online case is handled inside
`useMultiplayerJoin` instead (pending state up front, explicit reconnect, 12s),
which is the better place for it.

### 6. The FTUE screen leads with the game, not a form
`components/onboarding/QuickStartStep.tsx`. The screen opened with a wordmark
and then a form: avatar, name field, 6 flags, PLAY, two links, and an
account-signup block — roughly 8 interactive targets, zero gameplay, and an
email ask before the player had seen a single tile.

- A self-tracing `MiniGrid` now sits directly under the wordmark, above
  everything else, so the one mechanic (drag to link letters) demonstrates
  itself within a second of arrival. It reuses the existing localized
  `demoConfigs` (already shared with WelcomeDemoStep and PreGameTutorial) and is
  keyed on the selected language so switching language re-demos in that language.
- `OnboardingGoogleSignup` is removed from this screen. Guests already get a
  signup CTA on the result screen, where there is finally something to sign up
  FOR — this restores value-then-ask instead of ask-then-value.

One pre-existing test file needed a `MiniGrid` stub added: the real component
pulls framer-motion's `useMotionValue`/`useSpring`/`useTransform`, which that
file's lightweight framer mock does not provide. Board behaviour is covered by
the new `QuickStartStep.showsTheGame.test.tsx`.

**Not measured yet.** Both of these are reasoned from replay evidence, not from
an experiment. The FTUE change in particular should be watched against
`growth:onboarding_started -> growth:onboarding_completed` (currently 61 -> 37)
before it is assumed to have worked.
