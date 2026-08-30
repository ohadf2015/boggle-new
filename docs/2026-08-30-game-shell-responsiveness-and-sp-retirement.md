# Game shell responsiveness + retiring the separate single-player mode

Date: 2026-08-30
Branch: `feat/unified-game-shell` (worktree `/private/tmp/unify-game`, off `origin/master` @ `a4d11763a`)

## Part 1 — responsiveness

### The shared root cause

A `container-type: size` element only reports a non-zero **block** size (`cqh`/`cqb`)
when every ancestor up to the viewport has a **definite** height. `min-h-*` is a
minimum, not a definite height, so `flex-1 min-h-0` beneath it never resolves.

Measured in Chrome at 384×832 on `/en/singleplayer?autoStart=practice`:

```
100cqw -> 336px      ← inline size fine
94cqh  ->   0px      ← block size collapsed
min(100cqw, 94cqh) -> 0px
```

The board wrapper therefore computed `width: 0px`, and the inner
`.game-board-frame` — which has its own *viewport*-based `--board-size`
(`min(80vmin, 100vw-32px, 100dvh-280px)` = 352px) — fell back to that number and
rendered **180×352 inside a zero-width box**: a tall clipped grid with a dead gap
above it. Two sizing systems fighting, exactly as the screenshot showed.

### Fix 1 — `PortraitGameLayout.tsx` (screen 1: SP classic/practice portrait)

Root went from `overflow-y-auto min-h-[100dvh]` to `overflow-hidden h-[100dvh]`.

Verified in a real browser, same viewport:

| | before | after |
|---|---|---|
| `94cqh` | `0px` | `549px` |
| board wrapper | `0 × 352` | `336 × 352` |
| board frame | `180 × 352` | `336 × 352` |

Grid width went 180px → 336px (full width, square, no clipping, no dead gap).

### Fix 2 — `WordHuntGameLayout.tsx` (screen 2: MP word hunt, grid too small)

`[--wh-grid-size:min(100cqw,100cqh,560px)]` (was `440px`).

The `100cqw`/`100cqh` terms already clamp the board to its slot, so the px term
only ever *shrinks* it. Measured at 480×900: grid `440×440` inside a `480×540`
slot — the constant, not the container, was binding. At 560 the container
governs (→ 480). Unchanged at 384×832 (container-bound at 376).

Note: word hunt is **already on the MP shell**
(`MultiplayerInGameView` → `WordHuntGame` → `WordHuntGameLayout`), and MP classic
already fits correctly (`scrollH == innerH`, grid 334×334 at 384×832). The MP
shell is the healthier base — it uses `overflow-hidden` + `min-h-0` +
`calc(100cqb - …)` throughout, which is why it doesn't have screen 1's disease.

### Regression guard

`components/game/__tests__/gameShellSizing.contract.test.ts` — asserts that every
shell declaring a size container does not root on an indefinite height. jsdom
drops `min()` and container-query units, so a rendering assertion there would
pass whether or not the bug exists; this is a source contract instead, and the
real behaviour was verified in Chrome.

Went RED on `PortraitGameLayout.tsx` only, GREEN after the fix.

### Screen 3 — Word Wheel: FIXED (two defects, both measured)

**It only reproduces with an anchored ad banner.** On plain web at 384x832 the wheel
is fine — I checked LTR and RTL at four heights with words on the board and found no
overlap. Setting `has-admob-banner` + `--admob-banner-height: 90px` (the real Android
condition, and visible in the user's screenshot) reproduced both symptoms exactly.

**Defect 1 — `--bottom-stack-height` was reserved three times.** `body.screen-fit-locked`
reserves it in globals.css, then `WordWheelChallenge`'s playing wrapper reserved it
again, then `WordWheelGame`'s mobile root reserved it a third time. `WordWheelGame`'s
own comment called this "defence in depth" — but padding is **additive, not
idempotent**. With a 154px stack that is 3 x 154 = **462px lost from an 832px
viewport**: content ended at y=370 (44%) with a huge dead band beneath, which is the
"content only fills the top half" complaint. Removed both nested reservations.

**Defect 2 — the wheel orbit's cap could exceed its container.** The orbit is
`shrink-0` inside the `flex-1` cluster, so its own `max-w`/`max-h` are the only thing
holding it in. They read `max(176px, calc(100cqb - 116px))`, and that **176px floor
wins whenever the container is smaller than the floor**. Wrapped each cap in
`min(100cqb, …)` — inert on normal viewports (100cqb is already the largest term),
binding only when space is scarce.

Measured at 384x832 with the banner simulated:

| | before | after |
|---|---|---|
| wheel cluster | 360 x **126** | 360 x **434** |
| orbit | 176 (floored, overflowing) | 256 x 256 |
| Submit ↔ chips overlap | **60px** | **0** |
| cluster overflow | 64px | **0** |
| content bottom | **370** / 832 | **678** / 832 |

678 = 832 − 154, i.e. exactly one correct reservation.

**The ready/results screens double-reserve too, and that is deliberately left alone.**
Measured on the ready screen with the banner simulated: `body.screen-fit` pb=154px
*and* `WordWheelChallenge:587` pb=154px — reserved twice. But that screen is an
`overflow-y-auto` scroller, so the surplus becomes scroll space rather than
compressing anything: deepest content bottom 830 of 832. Only the *locked,
non-scrolling* playing screen turns the surplus into lost layout. Same for the
results recap at `:734`. Evaluated, not overlooked — revisit if either stops
scrolling.

Guard: `components/daily/__tests__/wordWheelOrbitClamp.contract.test.ts`.
`WordWheelGame.bannerClearance.test.tsx` asserted the *buggy* intent (it required the
game container to carry `pb-bottom-stack`); its assertion is inverted with the
measurement recorded in the file header.

Harness note: found-word chips sit at Framer Motion's `initial` state
(`transform: matrix(0,…)`, `opacity: 0`) in a headless tab because rAF is throttled.
`offsetHeight` is correct (28px), so layout is fine — do not chase this as a bug.

### Superseded — earlier analysis kept for the reasoning trail

Reproduced at 384×832 `/he/daily/word-wheel`. Here the height chain is **healthy**
(`100cqb` = 548px, `scrollH == innerH`), so it is *not* the screen-1 bug.

The real complaints in that screenshot are an **ad banner overlapping the top
letter** and the **send button overlapping the found-words chips** — an overlap /
stacking problem that only appears once words have been found (my repro had 0
words, so the area below was simply empty).

**Ruled out — the size-container collapse.** `WordWheelChallenge.tsx:554` roots on
`flex-1 flex flex-col min-h-0 h-dvh max-h-dvh overflow-hidden` — a definite height.
Measured `100cqb` = 548px, `scrollH == innerH`. The chain is sound on this route.

Worth knowing: `app/[locale]/quick-play/PageClient.tsx:26-35` documents this exact
failure for the *quick-play* route and already fixed it there — its comment reads
"a `min-h-screen` block here breaks that chain: the Word Wheel's `flex-1` root
becomes inert and its `[container-type:size]` wheel cluster collapses, **crushing
the board into the top HUD**". That is screen 3's symptom described verbatim. So if
this reproduces, suspect the *entry route's* shell, not `WordWheelGame` itself —
check whichever route the user actually launched from, not just `/daily/word-wheel`.

**Ruled out — wheel too small.** `WordWheelGame.tsx:1157-1163`: the orbit radius is
`min(w,h)`-based and **caps at ~140px**, so growing the box past ~384px only floats
the decorative ring away from the centred letters — a previously-fixed desktop bug.
Measured: cluster 360×556 but orbit 256×256, i.e. the wheel is deliberately smaller
than its slot.

**Still open.** The real complaints are the overlaps (banner over the top letter,
send button over the found-words chips) and the dead band below, both of which need
words on the board. Attempted repro: the wheel's centre letter is mandatory in every
word, and the cookie-consent modal (see below) intercepted the taps before any word
landed. Next step: dismiss consent first, submit 3+ words containing the centre
letter, then measure the chips container against the action bar — that distinguishes
z-index vs missing height reservation vs the chips row overflowing its slot.

## Part 2 — retiring the separate single-player mode

### The architectural decision (measured, not guessed)

**Reuse `PortraitLayout`, not `InGameScreen`.**

| component | role | socket refs | verdict |
|---|---|---|---|
| `game/in-game/components/PortraitLayout.tsx` (760L) | the shell | 2 — **both in comments** | store-driven, reusable with no transport |
| `game/InGameScreen.tsx` (696L) | the orchestrator | 20, incl. `socket.on('roundEventStart'…)` | genuinely socket-bound |

So solo keeps its own local orchestrator, feeds the same Zustand stores
(`useSelectionStore`, the `*Connected` wrappers), and renders the MP shell. That
satisfies "use MP as a base, no separate UI" **without** making offline/native
practice depend on Socket.IO.

### DONE — single player has no separate UI left

All three bespoke layouts are deleted (1411 lines): `PortraitGameLayout` (593),
`LandscapeGameLayout` (424), `DesktopGameLayout` (394). Solo renders the MP
`PortraitLayout` on every surface.

**The branch itself was the duplication.** Multiplayer never split by orientation —
`PortraitLayout` is responsive and takes `isDesktop`. Single player had three
layouts plus an `isLandscape` / `isDesktop || isTv` branch to pick between them. All
that survives is one flag.

Verified in Chrome, default path, practice + solo-vs-bots:

| viewport | board | overflow | raw keys |
|---|---|---|---|
| 384x832 portrait | 339x352 | none (`scrollH == innerH`) | none |
| 832x384 landscape | 300x300, fully inside | none | none |
| 1440x900 desktop | 522x522, 3-column rails | none | none |

Two defects found and fixed while doing it:

1. **`h-[100dvh]` is wrong for a surface that does not start at the viewport top.**
   The wrapper sat 74px below the fixed app header, so a 100dvh box ended one header
   past the fold — landscape board bottom 425 in a 384 viewport, page `scrollH` 554.
   Now `fixed inset-0 z-[70]`, which is both definite AND correctly positioned. z-70
   clears the header (fixed, z-60, 80px); modals stay above (AuthModal z-100). This
   also reclaimed those 80px for the board on every surface, and portrait's page
   overflow (951 vs 832) is gone.

2. **`t`'s identity never changed when the dictionary loaded** — see below. That was
   the real cause of the "shell renders raw keys" scare.

`showLandscapeTutorial` needed no porting: `LandscapeGameLayout` destructured it as
`_showLandscapeTutorial`, i.e. it was already dead.


### Pre-existing test failure, NOT caused by this branch

`components/results/__tests__/WheelRushResultsScene.test.tsx > shows all three stat
tiles` fails (`expected length 3, got 1`). Two independent checks say it is not ours:

1. `git diff origin/master -- fe-next/components/results/` is **empty** — this branch
   never touches that component or its test.
2. It fails identically with the `LanguageContext` `t` dep change temporarily
   reverted, which is the only file this branch shares with it.

So it is red on `origin/master` too. Don't re-investigate it as fallout from the
shell swap.

### The i18n bug this uncovered (app-wide, not shell-specific)

`LanguageContext`'s `t` reads translations from a **ref**, and was memoized on
`[language]` alone. Any memoized subtree that painted during the async dictionary
load kept its stale `t` and rendered **raw key paths forever** — nothing re-rendered
it. Components with a ticking prop (score, timer) healed themselves, which is exactly
why this went unnoticed. Static ones did not: `practice.coach.label`,
`practice.coach.dismiss`, `playerView.swipeHintShort`. All of those keys exist in
`translations/en.js`; copy was never missing.

Fix: add `translationsReady` to the `t` dep array. It is not read inside `t` — it
exists to change the callback identity once when the dictionary lands. Guard:
`contexts/__tests__/LanguageContext.tIdentity.test.tsx`, asserted at source level
because jsdom bundles the translations so `translationsReady` starts true and a
render-based test would pass either way.

**This likely explains other raw-key reports in this codebase**, including the cookie
banner — worth re-checking them against this fix rather than hunting for missing copy.

### The original prop mapping (kept for reference)

### The UI unification is feasible — here is the executable prop mapping

This is the part that answers "not a separate UI". Verified feasible, not yet built.

`PortraitLayout` takes ~60 props, ~37 required. `SinglePlayerGame`'s `commonProps`
(`SinglePlayerGame.tsx:289`) already computes most of them. Neither `*Connected`
wrapper needs a socket — `WordFormingAreaConnected` reads `useSelectionStore` (which
SP already uses) and `ComboDisplayConnected` reads `useComboTimer`. Both are local UI
stores, so the shell renders with no transport.

Adapter (`components/singleplayer/game/SinglePlayerShell.tsx`), SP → MP prop map:

| PortraitLayout prop | source |
|---|---|
| `letterGrid` | `core.grid` |
| `playerScore` | `core.score` |
| `remainingTime` / `timerValue` | `core.timer.remainingTime` |
| `gameActive` / `isPlaying` | `!core.isPaused && !core.isGameOver` |
| `comboLevel` | `core.combo.comboLevel` |
| `foundWords` | `core.foundWords` (shape-map to `FoundWord[]`) |
| `currentFeedback` | `core.currentFeedback` |
| `highlightedCells` | `core.revealState.highlightedPath` |
| `lastWordTime` / `lastWordFoundTime` | `core.lastWordFoundTimeRef` |
| `fireRoundActive` / `fireRoundRemaining` | same names on `core` |
| `earthquakeState` | `core.earthquakeState` |
| `gameLanguage` | `settings.language` |
| `minWordLength` | `settings.minWordLength` |
| `totalBoardWords` | `core.totalBoardWords` |
| `gameStatsRef` | `core.gameStatsRef` |
| `onWordSubmit` / `onPathSubmit` / `onWordChange` | `wrappedWordSubmit` / `wrappedPathSubmit` / `wrappedWordChange` |
| `onExitRoom` | `core.handleQuitRequest` |
| **`deferredLeaderboard`** | **`settings.bots`** (`{name, score}`) + the player — this is the win: solo gains the live MP leaderboard instead of bot cards only at results |
| `playerRank` | derived from that leaderboard |
| `username` | auth display name, else `t('common.you')` |
| `gameCode` / `isHost` / `tournamentData` / `showStartAnimation` / `gameplayFocusMode` | `''` / `true` / `null` / `false` / `false` |

**The gap to close first: `PortraitLayout` has no pause, coins badge, `0/N` progress
bar, or practice `TrainingProgressBar`** — MP has no pause by design. Make the shell a
superset (render those from its `children` slot or behind flags) *before* swapping, or
solo silently loses them.

Note `settings.bots` is mutated in place by the bot simulation, so the leaderboard must
read it reactively — see the stale-bot-state pitfall in `.claude/rules/60-recurring-pitfalls.md`.

Do this as: (1) extend `PortraitLayout` with the four SP-only affordances,
(2) add the adapter, (3) swap SP's portrait branch, browser-verify solo-bots /
practice / challenge, (4) then landscape + desktop, (5) then delete
`PortraitGameLayout` (593), `LandscapeGameLayout` (424), `DesktopGameLayout` (394).

### Corrected scope — the route comment undercounts the entry points

A sweep of every `/singleplayer?…` URL the codebase constructs:

| entry | constructed by | status |
|---|---|---|
| `autoStart=bots` | `lib/onboarding/firstGameRoute.ts:23` | **live — every new user's first game** |
| `autoStart=challenge` | `FriendChallengeLandingClient` x2, `FriendsList` | live — friend challenges |
| `autoStart=practice` | `TrainingAnalysisModal`, `OnboardingFlow` | live |
| `practice=1` | `lib/offline/offlineCapableModes.ts:67` | live — offline PWA entry |
| `boardCode` | `app/[locale]/community/[boardCode]/PageClient.tsx:61` | live |
| `preset=bots` | `components/results/NextStepPrompt.tsx:99` | live |
| `returnTo=daily` | **nothing** | **retired `69b0feff6`** |

That is six live entry points spanning onboarding, friend challenges, training,
offline PWA, UGC boards and a results CTA — not the "four thin params" the route
comment implies. **Finishing this is a multi-session job**, and each entry point
wants its own commit.

### Blocked: the bots FTUE cannot be retired without building an MP config surface

Retiring `autoStart=bots` / `preset=bots` looked like a one-liner. It is not, and the
reason is concrete: the FTUE path applies `FIRST_WIN_CONFIG`
(`useSinglePlayerConfig.ts:41`) — **EASY, 60s, 1 easy bot** — on a device that has
never completed a game. `/multiplayer?quickPlay=true` has **no surface to express
any of that**: a grep for `autoFill|addBot|fillBots|botCount|difficulty` across
`components/multiplayer/` and `app/[locale]/multiplayer/` returns nothing.

So the options are (a) redirect and silently drop the tuned first game, which changes
onboarding difficulty for every new user, or (b) add bot-count/bot-difficulty/timer
config to Quick Play (client **and** server bot spawning) first. (b) is the correct
one and is its own piece of work.

This is why the UI unification above is the better route to "no separate UI": it
leaves routing, FTUE tuning and activation completely untouched.

### The bots entries are already mostly migrated

`useSinglePlayerConfig.ts:171-179` holds a "returning-player gate": once
`hasPlayedBotsGame()` is true, **both `autoStart=bots` and `preset=bots` already
`router.replace` to `/multiplayer?quickPlay=true`**. SP-vs-bots is FTUE-only — only a
user's first-ever bots game renders the SP shell.

So retiring those two is a one-line change (drop the `hasPlayedBotsGame()` condition)
— **but do not make it unilaterally.** The FTUE path runs `firstWinConfigFor()` and
`trackFirstWinConfigApplied('autoStart=bots')`: a deliberately tuned first-win
difficulty. Deleting it changes onboarding/activation, which is a product call, not a
refactor. Either port that tuning into the Quick Play launch or accept the change
knowingly.

`preset` is **not** independently migratable: `preset=bots` is the only value anything
constructs, and it hits the same `hasPlayedBotsGame()` gate, so it is part of the FTUE
product call above rather than a separate task.

Cheapest-first order for what is left: **`boardCode`** (the only genuinely independent
one) → `autoStart=challenge` → the bots/FTUE product call → practice last (it needs
`TrainingProgressBar`, skills/hints state and its own `PracticeResults`, none of which
the 1408-line MP `ResultsPage` models).

`boardCode` routing is **not** broken today, despite `community/[boardCode]` pushing a
bare `/singleplayer?boardCode=…`: `proxy.ts:141` builds its 301 target as
`` `/${locale}${pathname}${search}` ``, so the query survives and the param keeps the
request off the Quick Play redirect. The call site is now locale-prefixed anyway, to
match the other six and skip the hop.

**Two side effects are business logic, not UI, and are exactly what a shell swap
drops silently** — both need a test that fails if they stop firing:
`SinglePlayerView` awards `awardCreatorCoins('BOARD_PLAYED', { boardCode })` and
POSTs `/api/ugc/boards/{boardCode}/play` (creator payouts + play counts).

### Original scope notes

**This migration is already underway upstream and is further along than expected.**

`app/[locale]/singleplayer/page.tsx` documents a "Phase 5 soft delete": bare
`/singleplayer` already `permanentRedirect`s (308) to `/multiplayer?quickPlay=true`,
which starts a random mode with auto-filled bots. Confirmed live: opening
`/en/singleplayer` lands on the MP lobby with "Add Bot" and CLASSIC / WORD HUNT /
WHEEL RUSH / BLAST.

The SP shell survives only for four param cases (`redirectLogic.ts`):

| param | use case |
|---|---|
| `?autoStart=practice`, `?practice=1` | Practice mode |
| `?returnTo=daily` | Daily challenge replay |
| `?boardCode=…` | UGC community boards |
| `?preset=…` | Preset auto-launch |

So "remove the separate single-player mode" = **retire those four**, then delete
the SP-only shell. What that costs:

| to delete | lines |
|---|---|
| `PortraitGameLayout.tsx` | 593 |
| `LandscapeGameLayout.tsx` | 424 |
| `DesktopGameLayout.tsx` | 394 |
| `SinglePlayerGame.tsx` | 520 |
| `SinglePlayerView.tsx` | 378 |
| `SinglePlayerResults.tsx` | 600 |
| `results/PracticeResults.tsx` | ~300 |

Already shared, so nothing to migrate: `GridComponent` (750), `CircularTimer`
(184), `WordFormingArea` (550), `useSelectionStore`, `useSoundEffects`,
`useGameMusic`, `useKeyboardWordInput`.

Genuinely SP-only, so it must be **added to** the MP shell before deletion:
pause, the coins badge, the `0/N` words-found progress bar, practice-mode
training state (`TrainingProgressBar`, skills, hints), and challenge mode's
target-high-score footer.

### Recommended sequencing

1. Practice first — it is the only one of the four with its own results screen and
   its own progress chrome, so it sets the shape of the MP-shell additions.
2. Then `preset` / `boardCode` / `returnTo=daily`, which are thin launch paths.
3. Delete the SP shell only once all four render through the MP shell.
4. **Keep `/singleplayer` alive as a redirect** — do not remove the route. SEO
   landing pages (`boggle-word-shake-free`, `balda-onlayn`, `erudit-onlayn`,
   `filvordy-onlayn`, `igry-v-slova-onlayn`, …) and blog posts link into it, and
   route removal in this repo has a 404 history.

Do **not** make solo a real socket room. The user's wording ("just not utilize the
separate mode for that with separate ui and stuff") is about duplicated UI. Making
solo transport-dependent would drag Socket.IO into offline/native play for no gain.

## Unrelated bugs found while verifying (not fixed)

0. **The cookie-consent modal renders raw key paths on `/en`** — `cookieConsent.title`,
   `cookieConsent.message`, `cookieConsent.learnMore`, `COOKIECONSENT.ACCEPT`,
   `COOKIECONSENT.CUSTOMIZE`. This is the first thing every new visitor sees, on the
   default locale. Highest-severity item found in this pass; fix before the layout work.
1. **Missing i18n keys render raw key paths to users.** On a logged-out
   `/en/multiplayer`: `common.back`, `auth.signIn`, `nav.home`, `nav.singleplayer`,
   `nav.play`, `nav.daily`. Persists after 30s, so it is not a dictionary-load
   flash. Hebrew footer on `/he/daily-word-wheel`: `legal.title`,
   `legal.privacyPolicy`, `legal.termsOfService`, `legal.refundPolicy`,
   `cookieConsent.manageCookies`, `support.kofiFooter`, `common.opensInNewTab`,
   `NEWSLETTER.TITLE`, `footer.about`.
2. **Local dev trap:** Chrome caches turbopack dev chunks under a stable filename,
   so an edit can appear not to apply across server restarts *and* a full `.next`
   wipe. Verify by grepping `.next` for the new string; if it is there, the browser
   is stale — kill the browser session, not the server.
