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
