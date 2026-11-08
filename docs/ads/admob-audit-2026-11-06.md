# AdMob audit — 2026-11-06

PostHog, 60 days, `$host` = lexiclash.live. The native app is Android WebView traffic (user agent contains `; wv)`).

## Where things stand

| | Native app | Web |
|---|---|---|
| Users with a pageview (30d) | 26 | ~513 |
| Users who finished a game (30d) | 16 (103 games) | 308 |
| Interstitial shows (60d) | 7, all from 1 user | none (no web interstitial provider) |
| Age prompt shown (60d) | 1 user | n/a |

The native audience is small. Most players are on web, where AdMob cannot serve. Web revenue depends on AdSense, which is tracked separately on the board.

## Rewarded funnel per placement (native, 60d)

Ad units are shared, and the tap and watch events carried the unit surface, not the placement. Several placements share `hint` and `retry`, so the rows below are attributed by page path.

| Placement (page) | Offer seen | Tapped | Watched | Users |
|---|---|---|---|---|
| Connections hint + reveal answer (`/connections/daily`, `/connections/pyramid`) | 410 (inflated, see fix 6) | 30 | 24 | 3 |
| Word Tower hint (`/daily/word-tower`) | — | 2 | 2 | 1 |
| Survival extra life + results retry (`/daily/word-hunt`) | 12 | ~2 | 1 | 2 |
| Catch-up (`/daily/word-wheel`) | — | 1 | 1 | 1 |
| Profile free coins (`/profile`) | 53 | 0 | 0 | 17 |
| SP gold top-up (`/singleplayer`) | 27 (+237 on web) | 0 | 0 | 8 |

What this says: an ad that unblocks a stuck player converts once tapped (24 of 30). Free currency gets no taps. Measured load failures were rare: 4 prepare timeouts and 2 failed shows in 52 loads. The sample is a handful of players, so it shows direction only.

## Fixed in this change

1. **Interstitials and the age prompt were almost never reached.** Only 4 screens counted a game end, and a slot came due only on an exact multiple of 3. Word Wheel, Blast, Tower, WordCraft, Connections, Crossword and Adventure never counted. Now every mode counts once, through `trackGameEnd`'s one-end-per-start guard plus the `lc:game-ended` signal. A due slot also stays due until a screen that can show an ad is reached. The last show is remembered across launches, so a restart doesn't reset the spacing.
2. **An interstitial could follow a rewarded ad seconds later.** For example, a survival extra-life ad, then the completion interstitial. A rewarded show now starts the same minimum gap.
3. **The rewarded ad was only preloaded after a granted reward.** After a skip or no-fill, the next tap loaded cold. It now preloads after every settled session.
4. **The Challenge results interstitial covered the score reveal.** It now shows when the player leaves the results, as it already did on SP results.
5. **The web gold top-up button did nothing.** It rendered on web with no ad provider: 237 offers, 87 users, no possible watch. It now renders only when an ad can play.
6. **Connections offer telemetry fired again on every guess**, because the transient "checking" flag reset the latch. It also fired while the free hint was the visible button. It now fires only while the ad button is visible.
7. **WordCraft's clue could be granted twice on a double tap**, because it called AdMob directly. It now uses the shared rewarded hook, which adds the in-flight guard, daily cap, analytics, clock pause and the `hint` unit.
8. **"Offered" counted both views and taps, and taps and watches named the shared ad unit (`hint`, `retry`) rather than the placement.** The tap-time emission now carries `trigger: 'tap'`; untagged means the offer was seen. Every feature unlock now reports its placement on tap, watch and decline, so Connections, WordCraft and Blast hints are no longer pooled together.
9. **New placement: a Word Wheel interstitial between the game and the results**, the same break daily Word Hunt uses (results open after at most 3 s, catch-up days skipped, each practice replay gets its own break). Word Wheel is the most-played native mode and had no ad break. Note that SP results deliberately moved its ad from before the results to the exit; Word Wheel's exits are shared links, so it follows the daily pattern instead. This is an owner call if the exit is preferred.
10. **WordCraft's clue tap did nothing once the daily ad cap was reached.** It now shows the existing "ad failed" message.
11. Removed two dead components: `TimeLowAdPrompt` and `WatchAdForRevealButton`.

## Decisions (made 2026-11-07, owner delegated)

- **Unknown-age guests now get interstitials** (owner, 2026-11-07). Only a declared child is blocked. Their ads stay G-rated and non-personalized (child-directed init tags) until they declare 13+; the age prompt still opens at a due slot, at most every 14 days.
- **No rewarded server-side verification (SSV) yet.** At ~26 native users a month the exploit value is a few coins. Tracked on the board; do it with Double Gold moving onto the capped `award_ad_coins` RPC.
- **Gates that grant on ad failure stay** (forfeit replay, catch-up, Blast v2 undo), so nobody is stranded by a no-fill.
- **Word Wheel's interstitial stays before the results**, matching daily Word Hunt; its exits are shared links.
- **Further placements** (Adventure hint/revive, Tower collapse rescue, Crossword reveal) wait for native volume: 2 to 4 native games per mode in 60 days.

## On deploy

Existing installs have more than 3 lifetime games and no record of their last interstitial. Each one is therefore due on its first ad break after the update, and unknown-age guests see the age prompt there. This is intended, and it happens once.

Nothing here was checked on a device. Everything was verified by tests only.

## How to read it in 28 days

- `growth:interstitial_ad_lifecycle` with stage `show_resolved`: distinct users should be above 1.
- `growth:age_gate`: users should rise. This is the path that lets guests see interstitials.
- Per placement, the count of `growth:rewarded_ad_offered` with `trigger='tap'` divided by the untagged count (offer seen) is the true view-to-tap rate. Placement names now match on both.
