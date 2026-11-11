# Making every mode more fun: feel, mascot personality, comeback hooks

Research date 2026-11-11. Sources: PostHog (last 30 days, lexiclash.live, test traffic not excluded, small samples are directional), a code inventory of `fe-next`, and web research (links inline).

## What the data says

| first mode | players | median games | came back another day | played 7+ days later |
|---|---|---|---|---|
| singleplayer | 177 | 2 | 13% | 3% |
| classic | 113 | 5 | 13% | 5% |
| word-wheel | 47 | 3 | 18% | 16% |
| blast | 41 | 4 | 5% | 3% |
| word-hunt | 29 | 5 | 16% | 15% |

Completion: classic 84%, singleplayer 59%, blast 73%, word-tower 40%, word-tower-v2 1 of 13.

1. **Juice alone does not bring people back.** Blast has by far the most effects, a reacting mascot and a finale, and the worst return rate (5%). Word Wheel and Word Hunt return best because they are daily: there is a reason to come back tomorrow. Every feel improvement below is paired with a reason to return.
2. **Single player is where new players fall off**: the most first games, 59% completion, a median of 2 games.
3. **Classic is the engine** (1,398 starts). Changes to the shared game screen also reach classrooms and quick play.
4. **Rewards are rarely reached**: the weekly chest card was seen 160 times and claimed twice; achievements fired 6 times in a month.
5. **Word Tower is a pacing problem, not a juice problem.** Players leave mid-run. It is a separate fix.
6. Nothing tracked mascot or combo moments, so none of this could be graded until now.

## What we already have (no new framework needed)

- framer-motion (475 files), GSAP 3.14 (free incl. all former paid plugins: [Webflow](https://webflow.com/blog/gsap-becomes-free)), PixiJS 8 + pixi-filters, matter-js, canvas-confetti, Howler; shared helpers in `lib/pixiFx/*`, `lib/gameEngine/*` (particles, shake, flash, time dilation).
- 91 sound effects, combo-level sounds that already climb per level (`comboLevelSrc`), word-length sounds, and mascot voice lines (cheer, giggle, gasp, whoa, aww, drumroll) that only education plays.
- About 60 mascot poses (WebP/GIF), 20 celebration video clips, random idle "activities" (pizza, coffee, skateboard): all built, mostly unused in games. The clips play only on a demo page; the activities only on the landing hero.
- One event-driven mascot: Blast's bus + state machine (`lib/blast/mascotBus.ts`, `mascotState.ts`) with a 4s global and 10s per-pose cooldown.

Gaps: Crossword is the flattest mode (no combo, haptics or mascot). Word Tower V2, Adventure, Word Craft, Crossword and the daily modes have no live mascot. No haptics in Word Tower V2, Adventure or Crossword. Word Tower v1's mascot and sky sightings look orphaned.

## Design rules for the mascot (personality without Clippy)

Clippy failed on unprompted interruptions ([The New Stack](https://thenewstack.io/humanity-vs-clippy-lessons-from-microsofts-failed-virtual-assistant/)). Duolingo keeps the "unhinged" tone on social and a wholesome one in the product ([Campaign](https://campaignlive.com/article/duolingo-comms-head-sam-dalsimer-leads-wholesome-unhinged-strategy/1910699)).

1. Never blocks input: the mascot layer takes no taps, sits at the edge, and leaves on its own.
2. Reacts to what the player did, not to a timer.
3. At most one gag per beat (existing cooldowns); big gags at most once per round.
4. Rarity tiers: common reactions (good word, combo), uncommon (personal best, comeback, near miss), rare "legendary" gags around 1% of sessions that people screenshot (the mascot steals a letter and runs, falls asleep on the timer, photobombs the results). Tier numbers are a proposal, not tested.
5. Multiplayer: only small reactions to the player's own events. No board-covering gags, no rank teasing. Big gags go to solo, daily and results screens.
6. Classrooms: respect reduced motion / "reduce effects", and the teacher's dials (hidden leaderboard, gentle timer) silence anything about rank or speed.
7. Empathy on loss, never mocking.

## Comeback hooks that are not predatory

Duolingo's published experiments ([streak research](https://blog.duolingo.com/duolingo-streak-research/)): letting players hold two streak freezes added 0.38% daily active learners; a streak-milestone animation added 1.7% to new-learner 7-day retention. Streaks amplify value, they do not create it.

- A visible "your freeze saved your streak" moment instead of a silent consume.
- End-of-round near-miss line ("3 points from your best") and a one-tap "again".
- Tomorrow's teaser on the results screen of daily modes.
- A rare surprise reward (1 in N sessions), never pay-to-reroll.
- No guilt notifications.

## Animation tech

- **Juice and particles:** keep GSAP (timelines, counting numbers), Pixi (bursts on existing canvases), framer-motion (UI springs). No new library.
- **Expressive mascot:** Rive is the best fit for one character with many reactions (state machine, web runtime ~222 KB brotli for canvas-lite: [Rive docs](https://rive.app/docs/runtimes/runtime-sizes.md)). Not now: we have no `.riv` file and nobody to rig one. Spike first: one rigged mascot, tested on a low-end Android webview. dotLottie is the fallback. Spine needs a paid editor licence for runtime use.
- **Audio:** combo pitch already climbs via per-level files. For any new chain sound, Howler `rate = 2^(n/12)` gives one semitone per step; cap near an octave and reset on a break.

## Plan

**Phase 1 (this branch):** one shared mascot layer. The Blast bus and state machine now also take a combo milestone; accepted words feed it from the server (multiplayer, classrooms, quick play) and from single player; `GameMascotReactions` pops the mascot at the edge, takes no input, hides under "reduce effects", and records `growth:mascot_reaction_shown` so the effect can be graded.

**Next, in order:**
1. Single player: near-miss line + one-tap again, and the unused celebration clips on the results screen (biggest new-player drop).
2. Mascot gag catalogue: idle activities during play (sleeping after 20s idle, peeking from the edge), voice lines on reactions, 3 to 5 rare legendary gags in solo/daily.
3. Crossword: per-word burst, combo, haptics, mascot (flattest mode).
4. Streak freeze "saved you" moment and a 7-day milestone animation.
5. Education copies that still need wiring or merging into the shared layer: vocab quiz, duels, boss projector, miss-gap, solo practice (own sound players), and choosing `EduMascot` art inside education.
6. Word Tower pacing pass (separate).
7. Rive spike with one rigged mascot.
