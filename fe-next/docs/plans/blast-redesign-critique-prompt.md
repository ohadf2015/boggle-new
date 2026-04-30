# Blast Mode Redesign — Critique Request

I'm redesigning a game mode called "Blast" in my word-puzzle game LexiClash
(Next.js + TypeScript, 5 languages incl. Hebrew RTL, mobile + TV, casual+competitive
audience ages 15-40). I want you to critique the redesign as a senior game designer.
Be ruthless about flaws.

## What Blast Mode Is

Blast is a hybrid of match-3 and word-find:

- 6×6 grid of letter tiles
- Player draws a path through adjacent tiles to spell a word
- Valid words clear those tiles, gravity pulls remaining tiles down, new tiles refill
- Special tiles (bombs, lightning, etc.) trigger area effects when included in a word
- Cascades: cleared boards can auto-find more words, chaining
- Waves: levels with increasing difficulty; each wave has objectives

## Current Problems (from real player feedback + audit)

1. Player quote: "Just finding ANY valid word isn't satisfying — I want a target
   word like in other word games."
2. 20 different special tile types exist; each spawns rarely, players never learn
   any of them well.
3. Goal banner can be dismissed; players forget what they're aiming for mid-wave.
4. Cascades sometimes auto-clear the tiles a player needed → silent failure, no
   explanation.
5. 9 different "micro-achievement" toasts spam the screen mid-game.
6. Hidden state (cascade momentum, DDA boost) affects gameplay invisibly.
7. Wave fail just shows "Game Over" — no reason given.
8. Late-wave tiles (Countdown, Fuse, Locked, Key) punish before teaching.

## Proposed Redesign — Clarity-First

### Goal Types (cut from 5 numeric → 3 clear)

Each wave shows ONE persistent goal banner with icon + sentence + live progress bar:

- **🎯 Find The Word**: "Spell CRYSTAL on the board" (target word seeded at wave
  start; solver pre-verifies path exists; cascade can't auto-clear it)
- **💖 Color Power**: "Spell a word using 4+ pink tiles" (pink tiles glow; counter
  ticks live as path is drawn)
- **⭐ Score Target**: "Reach 200 points" (familiar baseline, kept as-is)

### Special Tiles (cut from 20 → 5)

Each tile gets a 2-second tutorial card on first-ever encounter (one time only):

- 💣 Bomb (W1) — 3×3 area clear when used in a word
- 🌈 Rainbow (W1) — wild card, boosts word score
- ⚡ Lightning (W3) — full column clear
- ✨ Prism (W5) — row + column clear
- 💎 Gold (W7) — 3× score multiplier

Retired: countdown, fuse, locked, key, anchor, catalyst, shuffle, magma, portal,
crystal, diamond, ice, magnet, vortex, treasure-gem.

### Anti-Frustration Guards

- **Persistent goal banner** — never dismissable, always visible
- **"Why did I lose" card** — fail screen says "Out of moves. You needed 1 more
  pink word." instead of "Game Over"
- **First-encounter tutorial card** — game pauses, 2-sec card explains new tile
- **Fail-soft cascade** — if cascade is about to clear target word, pause 2s, glow
  target, then resume so player sees it
- **Hint system** — 30s idle → mascot suggests a path (free first hint per wave;
  second hint costs 1 move)
- **Cut micro-achievement toasts** from 9 → 3 (First Combo, Big Word 6+, Wave Clear)

### Dopamine Arc per Wave

1. Intro: Goal banner pops big (1.5s)
2. Mid-wave: Progress bar fills, mascot reacts to milestones
3. End: Success burst with sugar-crush finale, OR "you needed X more, retry?" CTA

### Telemetry (4 events only)

- `goal_seen { goal_type, wave }`
- `goal_completed { goal_type, time_s, used_hint }`
- `wave_failed_reason { reason, was_close }`
- `tutorial_card_shown { tile_type, dismissed_in_s }`

## Critique Questions

Please be hard on this. Specifically address:

1. **Is 3 goal types too few?** Will it get repetitive after 20 waves? What's the
   minimum viable variety to avoid boredom without overwhelming?

2. **Will "Find The Word" feel satisfying or stressful?** What if the player
   can't find the target — does the fallback ("cascade saved it for next wave")
   actually feel ok or feel like patronizing failure?

3. **Color Power risks** — does "use N pink tiles" reduce to luck (waiting for
   pink to spawn) or does it create real strategy?

4. **Special tile cut from 20 → 5** — am I losing too much depth? What's the
   right number for a hybrid match-3 word game?

5. **Tutorial cards on pause** — does pausing the game break flow, or is it
   necessary? Better alternatives?

6. **Did I miss any anti-frustration source** that's likely to bite?

7. **Hidden complexity I'm reintroducing** — is the "fail-soft cascade pause"
   actually adding back the kind of opacity I'm trying to remove?

8. **What would Royal Match / Wordscapes / Spelltower do differently here?**

9. **What's the riskiest assumption** in this redesign that should be A/B
   tested before committing?

10. **Order of shipping** — should I ship clarity guards (Sprint 1: persistent
    banner, fail card, tile cut, tutorials) BEFORE new goal types? Or bundle
    them so the new goals land in a clearer container?

Give me the top 3 things you'd change and the top 3 things you'd kill outright.
