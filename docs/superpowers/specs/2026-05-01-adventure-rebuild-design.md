# Adventure Rebuild — Design Spec
**Date:** 2026-05-01
**Working name:** *LexiClash Adventure: Word Crawler* (placeholder)
**Status:** brainstorming complete, awaiting user review before implementation plan
**Owner:** Ohad
**Source conversation:** Claude Code session 2026-05-01
**External reviews folded in:** 3 (adversarial / gameplay / research-comprehensive)

---

## Section 0 — Critique Digest & Wall Sentence

This rebuild started after months of patching the existing Adventure mode without escape velocity (11 audit fixes shipped 2026-05-01 alone). The team is nuking ~75 components + 50 lib files and rebuilding around a single sharp idea.

### The wall sentence (kill criterion — print this)

> **"If spelling a word to deal damage does not feel viscerally more magical than pressing an 'Attack' button within the first playable prototype, burn the rest of the design and start over."**

Every section below is decoration around that sentence. The prototype must validate it before the implementation plan ships.

### Convergent critiques accepted (3 external reviewers agreed → load-bearing)

1. **No seam between word-input and battlefield** — letter tiles render IN Pixi on the battlefield, not as a separate React panel. The seam was the #1 risk.
2. **One meta-progression layer in v1: Runes only.** Skill tree + gear deferred. Active skills are run-local (level-up picks).
3. **Combat owned by an FSM** (hand-rolled v1). Pixi scene + GSAP timelines + input gating live inside it.
4. **matter-js dropped.** GSAP fakes physics at 1/10th cost.
5. **Per-chapter visual budget, not per-room.** ~3-5 backgrounds per chapter, ONE shader stack per chapter. Variation comes from particles + palette tinting.
6. **Word Mastery layer** (Bingo bonus + persistent Lexicon) added — explicit reward for word-skill, prevents the "literate player breaks the game" failure mode.
7. **Run length compressed to 5-8 rooms (~10 min)** to match word-game session length, not the 20-40 min Slay-the-Spire baseline.
8. **2-phase boss cap** (Grok pushed for 1-phase; we kept 2 to preserve interactivity but no more).

### Critiques rejected (with reason)

- *"Audience doesn't exist commercially"* — Bookworm Adventures is the cited proof it exists. Size unknown; existence not in question.
- *"Cut multi-phase bosses entirely"* — too aggressive; 2 phases is the floor for "feels like an encounter."

### Items deferred per critique meta-reviewer (post-spec)

- A **playthrough simulation** prompt (Prompt 6) and **anti-roguelike** prompt (Prompt 7) will be added to the external review file before plan handoff, not before spec.

---

## Section 1 — Vision & Pillars

**Core verb:** spell to fight. Words are your sword. RPG progression is the why.

**4 pillars:**

1. **Word as weapon, not the whole game.** Combat uses a word grid; *most* of the screen and minutes are RPG (movement, choice, juice, dialogue, loot, animations).
2. **Run-based structure, not endless level grind.** A run = pick a chapter on WorldMap → walk a branching path of 5-8 rooms → fight a boss → claim rewards → return to Hub.
3. **Skills, runes, gear are visible.** Every upgrade changes the hero sprite, the battlefield, or a damage number you can see go up.
4. **Pixi for feel, React for shell.** Pixi battlefield + RuneSlate (letter tiles) + sprites + particles + filters. React/DOM ONLY for hub screens, post-run modals, settings, achievement gallery.

**Anti-goals (will NOT ship in v1):**

- No infinite procedural levels.
- No special-tile / mutator / mechanic combinatorial explosion.
- No flash challenges, daily quests, story beats, weekly modifiers, mastery, ascension.
- No real-time twitch combat.
- No skill tree as a meta layer.
- No equippable gear as a meta layer.
- No matter-js physics.
- No per-room unique backgrounds.

---

## Section 2 — Run Structure & WorldMap Binding

### The "run" model

A run = one journey through a chapter. Begin at hub, end at boss room or death. Slay-the-Spire-shaped node graph but compressed for word-game session length.

**Run skeleton (5-8 rooms total):**

```
START
  │
  ▼
[ROW 1]  ░ ─ ░          (2-3 nodes, you pick 1)
            \ /
[ROW 2]    ░             (combat / event / shop)
              │
[ROW 3]   ░ ─ ░          (treasure path option)
              │
[CAMP]       🏕         (rest/upgrade — heal 30%, OR pick active skill, OR shop)
              │
[BOSS]       👑          (chapter boss, 2-phase)
              │
[REWARD]      ✨         (pick 1 of 3 rune drops)
              │
            HUB
```

**Target session length:** ~10 minutes per run (matches casual word-game session expectation).

### Room type mix

| Type | Count per run | What happens |
|---|---|---|
| 🗡 Combat | 3-4 | Standard enemy fight (1 enemy v1) |
| ⚔ Elite | 0-1 (optional path) | Tougher enemy, guaranteed rune chance |
| 💎 Treasure | 0-1 | Open chest, pick 1 of 3 |
| ❓ Event | 0-1 | Dialogue branch, narrative choice, stat outcome |
| 🛒 Shop | 0-1 | Spend gold for active-skill picks, potions |
| 🔥 Camp | 1 forced (mid-run) | Heal or upgrade an active skill |
| 👑 Boss | 1 final | Chapter boss, 2-phase |

### v1 chapter count: 3

- Chapter 1: Forest of First Words (placeholder)
- Chapter 2: Clockwork Underburg (placeholder)
- Chapter 3: Aetherglass Temple (placeholder)

WorldMap (preserved component) = chapter selector. Click chapter → intro card → "Start Run" → run begins. Locked chapters unlock by clearing previous chapter's boss.

### Run failure & death

- Die in any room → run ends.
- **Lost on death:** all run-local progression (active skills picked, gold gained mid-run, transient buffs).
- **Kept on death:** 50 gold consolation grant, lexicon progress, achievements progress, runes already owned.
- Death cinematic: ~2s. Skippable on second death.

### Run save state

- localStorage: synced on every state change.
- Supabase `adventure_runs` table: synced on room transitions + run end.
- One active run at a time. Resume on reload.

---

## Section 3 — Combat Loop

### The seam fix (load-bearing)

**There is no separate word-input panel.** Letter tiles render in Pixi on the battlefield, in front of the hero, in a Pixi container called **RuneSlate** that sits in the bottom-third of the battle scene. Composing a word = tapping or dragging tiles in the same scene where damage flies.

Implementation:
- `RuneSlate` Pixi container, 4×4 tile grid, sprites for tiles.
- Tap a tile → it floats up to a "casting glyph" between hero and enemy. Tiles physically travel (GSAP-driven, no matter-js).
- On valid submitted word, the glyph charges (particles + bloom), then **the spelled word fires as a projectile** at the enemy. Each letter trails light. Hits = screen shake + enemy flash + damage number popping.
- Input ergonomics: tap-to-add by default; drag optional. Hidden HTML `<input>` underlies the canvas for hardware keyboards + IME (Hebrew/Japanese).
- Submit gesture: glowing Pixi cast-button OR Enter key.

### Turn structure (turn-based-lite, no timer)

```
ENEMY TELEGRAPH → PLAYER COMPOSE → PLAYER SUBMIT
                                       ↓
                                  PLAYER RESOLVE
                                       ↓
                                  ENEMY RESOLVE
                                       ↓
                                  TILE REFRESH
                                       ↓
                                     (loop)
```

- **No timer.** Enemy intent visible: "Strikes for 12 next turn." Skilled players spell faster organically.
- Each turn the player picks ONE action: cast a word, defend (no word), or use an active skill (some require a word ≥ N letters).
- After action, used tiles replace from the chapter's letter pool (locale-frequency-weighted).

### Tile pool

- 16 tiles, 4×4 in v1. Locale-aware letter frequency.
- **v1 locale support: en, he, sv, es.** Japanese (`ja`) is **deferred from v1**. Reason: a "tile = letter" model is structurally undefined for ja — hiragana (~46 base chars + dakuten) needs a curated hiragana-only lexicon and its own frequency/rarity tables; kanji is thousands of distinct tiles; romaji breaks the fantasy for native readers. Doing it right is its own design pass. The hub still loads in `ja` (LexiClash UI ja is preserved). Adventure mode in `ja` falls back to a "coming soon" card linking to the en build with a locale-aware notice. Re-enter ja in v2 with the hiragana-tile approach.
- **Rarity tiers:** common, uncommon, rare. Rares = letters worth more (Q, X, Z in en) + visual sparkle. Per-locale rarity tables defined in `lib/adventure/v2/engine/tilePool.ts`.
- **Runes can modify the pool** (e.g. "Vowel Loop" = vowels never deplete). Visible in the slate (rune icon glows).

### Damage formula (transparent)

```
base       = Σ(letter_values) × length_multiplier
length_mul = { 3:1.0, 4:1.3, 5:1.7, 6:2.2, 7:2.8, 8+:3.5 }
crit       = roll(crit_chance) ? 2.0 : 1.0
final      = base × crit × (1 + Σ rune_modifiers) × hero_atk
```

Real-time feedback: damage chip on each tile *while composing*. "Current word: STORM = 47 damage."

### Word Mastery / Bingo / Lexicon

- **Bingo:** empty all 16 tiles in one word → ×3 damage + 20% heal + cinematic burst. Rare, memorable.
- **Lexicon:** persistent across runs. Every unique word ever spelled = an entry. Visible at hub. Milestones (50 / 200 / 1000 unique) grant permanent passives.
- **Combo chain:** back-to-back words without taking damage build a multiplier. Resets on damage.

### Active skills (3 slots, RUN-LOCAL — distinct from Runes)

Picked from "level up choose 1 of 3" during a run (Hades-style). Cooldown-gated.

Examples:
- **Defend** (no word) → +50% block next hit. CD 1.
- **Burn** (word ≥4) → 5 dmg/turn × 3 turns. CD 2.
- **Heal** (word ≥5) → restore 20% HP. CD 3.
- **Time Glyph** (word ≥6) → enemy skips next turn. CD 4.
- **Mirror Spell** (word ≥4) → second word played that turn at 50% damage. CD 3.

20-30 active skills total in the v1 pool.

### Status effects

**On hero:** poison (HP/turn), freeze (N tiles locked), curse (random tile becomes joker, valid words shrink).
**On enemy:** burn (HP/turn), weak (-30% telegraph dmg), stun (skip turn).

Locale-translated names; effects render as Pixi sprites pinned to actor.

### FSM (hand-rolled)

```
combat: idle
   │
   ├→ player_compose ─→ player_submit ─→ player_resolve
   │      ↑                                  │
   │      └────────invalid word──────────────┘
   │                                         ↓
   │                                  enemy_telegraph
   │                                         ↓
   │                                   enemy_resolve
   │                                         ↓
   │                                   tile_refresh ──→ idle
   │
   ├→ phase_transition (boss only, HP threshold trigger)
   ├→ victory
   └→ defeat
```

State machine owns: Pixi scene root, GSAP timelines, input gating. React subscribes to derived view-state only.

---

## Section 4 — Bosses (2-phase cap, bespoke gimmicks)

### Design contract

- **2 phases max.** Phase change = cinematic + new mechanic, not a stat bump.
- **Each boss teaches a verb.** P1 introduces; P2 twists.
- **Each boss has its own arena, shader pass, music cue.**
- **Reward:** 1 of 3 themed runes + boss-trophy in Hub.

### Boss 1 — *The Hollow Stag* (Forest)

- **P1 Verdant Hunt:** Forest-themed words (`root, vine, moss, fern, leaf, thorn, bloom...`) glow on slate when available, deal **+50% damage**. Standard telegraph attacks.
- **P2 trigger** (50% HP, cinematic): antlers crack into branches, mist filter (`@pixi/filter-godray`) drops over arena.
- **P2 Withering Bloom:** each turn, **one random tile rots into "X"** (unusable). Boss summons a Tangle — break with vowel-only word (≥3 vowels).
- **Reward runes:** *Verdant Heart* (heal 5% per word), *Bramble Crown* (every 5th word stuns), *Wild Memory* (Lexicon entries +1 dmg).

### Boss 2 — *The Cogfather* (Underburg)

- **P1 Mainspring:** **Cog-meter** fills with each *letter placed*. Full = boss AOE. Trade-off: long words = big dmg + more cog.
- **P2 trigger** (60% HP, cinematic): boss explodes into gears, CRT scanlines + RGB-split filter, music tempo doubles.
- **P2 Reshuffle Hour:** every 2 turns the **slate physically rearranges**. Boss shoots **gear-projectiles** that lock specific tiles for 2 turns.
- **Reward runes:** *Stopwatch* (cog meter -30%), *Geared Tongue* (3-letter words +100%), *Brass Echo* (combo doesn't reset on damage).

### Boss 3 — *The Mirror Saint* (Temple)

- **P1 Echo Sermon:** boss **echoes your word** on its turn for 0.5× back-damage. Trade-off: power = self-damage.
- **P2 trigger** (40% HP, cinematic): splits into **mirrored pair**, prismatic shards + watercolor + heat-haze shader.
- **P2 Twin Vows:** the two mirrors each lock **one opposing letter as forbidden** (e.g. left: no E; right: no T). Player alternates which mirror to target.
- **Reward runes:** *Saint's Tongue* (echo halved), *Twin Pact* (alternate-turn dmg +75%), *Prism* (one rare tile/turn guaranteed).

### Cinematic budget per boss

≤ 2 seconds, skippable on second run.

| Beat | Tech | Eng hours est. |
|---|---|---|
| Intro card | Pixi + GSAP timeline + Lottie name-stamp | 2h |
| P1→P2 transition | Pixi filter swap + camera GSAP + Howler stinger | 3h |
| Finisher | Pixi shader burst + freeze-frame + slow-mo damage popup | 3h |

3 bosses × ~8h cinematic = ~24h. Bounded.

---

## Section 5 — Non-Combat Rooms

### Design contract

- Each non-combat room is a Pixi scene with a bespoke micro-interaction.
- Some rooms have **zero word interaction** — pure RPG choice. This is the "not-just-a-word-game" promise.
- Each non-combat room is ≤90 seconds — fast in, fast out, hand back to combat.

### v1 room types (5)

#### 💎 Treasure Room
A Pixi chest sprite mid-arena, glowing. Tap to open. Three loot icons spring out (GSAP arc). Pick 1 of 3:
- Gold pile (+50 gold)
- Active skill (next available skill draft)
- Mystery potion (heal / damage buff / random)

No words. ~30 seconds.

#### ❓ Event Room (dialogue + choice)
A character/NPC sprite (chapter-themed: druid, clockwork merchant, glass priestess). Pixi text box renders dialogue (locale-translated). Player chooses 1 of 3 responses. Outcomes mix:
- Pure stat: gain HP, lose gold, gain skill point
- Word-gated: "Spell a 5-letter word to convince the merchant" (mini-spell, free of combat damage math)
- Risk: 50/50 — skill check via word length OR random

Branches deterministic per chapter pool of ~6 events. ~60 seconds.

#### 🔥 Camp (forced mid-run, 1 per run)
Hero sits at a fire (Pixi flame particles, GSAP gentle sway). Three buttons:
- **Rest:** heal 30% HP
- **Train:** upgrade one active skill (CD -1 OR damage +20%)
- **Whittle:** spend 50 gold for next-room rare tile guarantee

No words. ~20 seconds.

#### 🛒 Shop
Chapter-themed merchant sprite. Pixi shelf with 3-4 items. Items:
- Active skill picks (slot-in if you have <3)
- One-shot consumables (potion, bomb-letter that explodes for AOE)
- Rune slot mid-run unlock (rare)

Gold-gated. No words to buy, but a tiny Easter egg: spell the merchant's name = 10% discount this visit. ~45 seconds.

#### 🪤 Trap (skill check)
Trap mid-arena (Pixi anim: spike pit, ticking clock, swarm of letter-bugs). Single prompt:
- "Spell a word ≥ 4 letters in 10 seconds OR lose 15% HP"
- This is the ONE timed micro-event in v1. Used sparingly (max 1 trap per run).

~15 seconds.

### Non-combat room visual identity

Each chapter has 3-5 backdrops; non-combat rooms reuse them with a different prop + lighting. No new bespoke art per non-combat room — that'd blow the asset budget. Variation = props (chest, NPC, fire) + foreground particles + brief shader tint.

---

## Section 6 — Meta-Progression (folded from expert design)

> Source: ccgs-economy-designer. Numbers locked, integrated below.

### Hub layout (7 tiles, RTL-aware)

1. **Worldmap** — chapter select + run entry (primary CTA).
2. **Rune Armory** — equipped/unequipped runes, slot management.
3. **Shop** — gold sinks (rune slot unlocks v1; gear deferred).
4. **Lexicon Stats** — unique words, rarity breakdown, milestone progress bar.
5. **Achievements** — grid, filtered by category.
6. **Daily Login Bonus** — single tile, +50 gold/day.
7. **Mascot + contextual greeting** — state-driven (first visit / after 3 runs / on streak / on death).

### Rune economy (the ONLY meta layer in v1)

- **Slot count:** 3 base, +1 unlock at 500 gold, +1 unlock at 750 gold = **5 max**.
- **Drop rate:** 1 guaranteed at boss clear; ~5% chance per elite/treasure → ~1.3 runes/run mean.
- **v1 rune pool:** 18 runes across Offense / Defense / Utility (6 each).
- **Soft category cap:** max 2 of any single category equipped (prevents glass-cannon degeneracy).
- **NO upgrade / NO recombination v1** — horizontal collection > vertical stat-bumping for the prototype phase.

### Gold sources & sinks

**Sources (per run):** room clear 10-30 (chapter-scaled), boss 100 flat, treasure 50-100, run-completion 50 floor (even on death), daily login 50.

**Total per run:** 150-300 gold (median 200). Per week (7 runs): ~1400 gold.

**Sinks:**
- 4th rune slot: 500 gold (one-time)
- 5th rune slot: 750 gold (one-time)
- Lexicon shortcuts: **CUT v1** (would dilute "earn unique words by playing")

### Anti-grind: diminishing returns on repeat-chapter runs

3+ runs of same chapter same week → 50% gold from that chapter (rune drops unaffected). Resets Monday UTC. Positive framing ("You've conquered this chapter").

### Achievements (18 in v1, 6 categories × 3 each)

- Combat (no-damage clears, big-word hits, etc.)
- Words (lifetime unique counts, bingo counts)
- Runs (endurance, low-HP clears)
- Lexicon (milestones, completionist)
- Bosses (one per boss + perfect-run variant)
- Hidden (special challenges)

Rewards = cosmetic badges (avatar frames, rune auras, leaderboard suffixes). NO gold rewards — celebration not faucet.

### Daily/weekly hooks

**Daily login bonus only.** No weeklies, no battle pass, no challenges in v1. Wall-sentence demands focus, not completion-grind. Revisit post-launch if D7 dips.

### Post-run flow (the loot-drop dopamine moment)

1. Death cinematic (if applicable) → "shattered word" anim → gold/runes toast.
2. Trophy room → run summary card (chapter, gold, runes, words spelled, achievements popped).
3. Rune armory auto-opens → new rune highlighted, prompt to equip.

---

## Section 7 — Visual Identity & Per-Chapter Uniqueness (folded from expert)

> Source: ui-ux-designer. Locked decisions integrated.

### Locked-shared (NEVER changes per chapter)

- UI chrome: dark navy `#1a1a2e` base, 2px hard black borders, hard pixel shadows (2px down-right; RTL: down-left).
- Typography: Fredoka (display), Rubik (body). NO other fonts.
- Mascot: kawaii marshmallow-cube, state-driven sprite swap (no idle loop).
- RuneSlate frame: 3px border in chapter accent, 4:3 aspect locked.
- Damage numbers: white Fredoka 24pt, 1px outline, pop-and-fade 0.8s.
- Win/lose card: 2s fade, skippable.

### Chapter-flexible (CHANGES per chapter)

| Dim | Forest | Underburg | Temple |
|---|---|---|---|
| Primary | `#BFFF00` lime | `#FF1493` pink | `#00FFFF` cyan |
| Accent | `#00FFFF` cyan | `#8B5CF6` purple | `#FFE135` yellow |
| Support | `#2D5016` forest | `#C0123D` magenta-dark | `#B19CD9` lavender |
| Text | `#FFFEF0` cream | `#FFFEF0` | `#FFFEF0` |
| Particles | leaves + motes | cogs + sparks | prisms + light |
| Motion | `power2.easeOut` | spring bezier | sinusoidal float |
| Music key | D minor | A minor | C major |
| SFX | wood + nature | metal + machinery | crystal + wind |

### Shader stack per chapter (Pixi 8 filters)

**Forest:** AdjustmentFilter (sat +0.15) → GodrayFilter (boss-only) → BlurFilter (parallax DOF).
**Underburg:** RGBSplitFilter (Cogfather only, sync to SFX) → BloomFilter → ShatterEffect (custom patch, used in patches/).
**Temple:** BloomFilter (generous on cyan/yellow) → TwistFilter (Mirror Saint only) → AdjustmentFilter (hue +15).

3-filter cap per chapter. Hard rule.

### fal-ai flux prompt scaffold (anti-AI-slop)

```
<style_prefix>
neo-brutalist 2D game background for <chapter>,
dark navy (#1a1a2e) dominant, hard pixel shadows, no gradients, solid geometry,
<chapter-theme>, <4-5 elements>
</style_prefix>

negative: blurry, soft lighting, glassmorphism, photorealistic, 3D depth, watercolor,
cutesy anime, lens flare, volumetric fog, corporate, flat design.

aspect 4:3, game-ready pixel-art aesthetic, 1920x1440.
```

Forest example:
```
neo-brutalist 2D background for forest RPG level, dark navy (#1a1a2e) base with
halftone dots, hard pixel shadows, twisted ancient trees with thick black outlines,
moss-covered stones in lime-green accents, scattered wooden ruins, three depth
layers (canopy / floor / cliffs). [+ negative + aspect block]
```

Human-in-the-loop step (NON-NEGOTIABLE): hand-trace black outlines onto every
generated background to align with the Neo-Brutalist contract. Skip = AI slop.

### RTL Hebrew battlefield (load-bearing)

**Mirrors (chrome):** hard shadows flip down-left; HUD text via `dir="rtl"`; mascot moves to top-right; button labels via `t()`.

**DOES NOT mirror (battlefield):** hero stays LEFT, enemy stays RIGHT (for ALL locales). Tile cascade always top→bottom. Damage-number direction always hero-right / enemy-left. Skill arrows in absolute compass.

Cited proven approach: Inscryption — localize chrome, lock battlefield geometry.

### Mobile / desktop / TV (single-author, three-viewport)

| Viewport | Pixi internal | Slate | HUD | Touch target |
|---|---|---|---|---|
| Mobile (320-480) | 1280×960 | 95% w / 85% h | stacked vertical | 48px min |
| Desktop (768-1920) | 1920×1440 | 60% w / 80% h | sidebar | 56px |
| TV (1920+) | 3840×2880 | 55% w | side-panels XL | 64px + focus ring |

CSS: `aspect-ratio: 4/3`, Pixi auto-resolution. Damage numbers scale 24pt → 36pt → 48pt.

### Anti-spec (we will NOT do)

1. No glassmorphism.
2. No soft / blurred shadows.
3. No full-screen flash whiteouts.
4. No fonts beyond Fredoka + Rubik.
5. No per-room unique backgrounds.

### Boss arena identity (1-2 sentences each)

- **Hollow Stag:** sunken clearing, gnarled trees as natural amphitheater, bioluminescent moss, particles spiral inward during fight.
- **Cogfather:** vast gear chamber where architecture IS the boss; clockface floor with rotating cog-tiles; spotlights sweep.
- **Mirror Saint:** infinite cathedral of crystal columns; arena floats in void; her attacks reflect across mirrors and slightly twist the slate.

---

## Section 8 — Tech Architecture (folded from expert)

> Source: feature-dev:code-architect. Amended where the expert drifted into deleted-v1 mental model (e.g. "tile-clear objectives"). The RuneSlate is a word-tile pool, not a Boggle grid — no clearing objectives.

### Module layout

**`fe-next/lib/adventure/v2/`** (non-React utilities):
- `fsm.ts` — finite state machine + discriminated union types
- `engine/damageCalculator.ts` — letter values, length multipliers, rune modifiers
- `engine/wordValidator.ts` — dictionary lookup + lexicon adds (no server call mid-fight)
- `engine/tilePool.ts` — locale-frequency-weighted tile draw, rune-modified pools
- `assets/bundleLoader.ts` — `Assets.addBundle('chapter-N', …)` per chapter
- `audio/soundBus.ts` — Howler music/sfx/ambience buses + ducking
- `state/runStore.ts` — Zustand: run + meta + UI slices
- `persistence/local.ts` — localStorage immediate writes
- `persistence/supabase.ts` — batched sync on room transition + run end
- `types.ts`

**`fe-next/components/adventure/v2/`** (React + Pixi):
- `BattleSceneRoot.tsx` — Pixi Application owner, FSM mount, input bind
- `scenes/BattleScene.ts` — `Container` subclass, holds layers
- `layers/BackdropLayer.ts`, `ActorLayer.ts`, `RuneSlateLayer.ts`, `FxLayer.ts`, `HudOverlayLayer.ts`
- `input/RuneSlateInput.ts` — hidden HTML input + IME bridge + FSM-gate
- `modals/CombatVictoryModal.tsx`, `CombatDefeatModal.tsx` (React, post-run)
- `hub/*` reuses existing hub components

Hub pages live at existing `fe-next/app/[locale]/adventure/` paths.

### FSM (TypeScript discriminated union)

```ts
type FsmState =
  | { type: 'idle' }
  | { type: 'player_compose'; word: string; tilesUsed: TileId[] }
  | { type: 'player_submit'; word: string }
  | { type: 'player_resolve'; damage: number; effects: Effect[] }
  | { type: 'enemy_telegraph'; nextAttack: EnemyAction; animMs: number }
  | { type: 'enemy_resolve'; damage: number }
  | { type: 'tile_refresh'; newTiles: Tile[] }
  | { type: 'phase_transition'; bossPhase: 1 | 2 }
  | { type: 'victory'; loot: Loot }
  | { type: 'defeat' };
```

Transition rules in `fsm.ts`. **Only `player_compose` accepts tile clicks.** Pixi layers read state via closure; FSM transient state never enters Zustand.

### Pixi scene graph

```
AdventureRoot (Pixi Application, 1920×1080 virtual, auto-scale)
└─ SceneStack
   └─ BattleScene
      ├─ BackdropLayer (Container — parallax)
      ├─ ActorLayer (Container — hero, enemy, projectiles, damage numbers via ParticleContainer pool)
      ├─ RuneSlateLayer (Container — only interactive layer)
      ├─ FxLayer (ParticleContainer cap 500 active)
      └─ HudOverlayLayer (Container — HP bars, combo, buffs; no pointer events)
```

### GSAP + Pixi ticker

**Single-clock pattern.** Pixi's `Ticker` is the source of truth. GSAP runs natively (RAF) and we use its `.delay()` + `.then()` for sequencing. Use Pixi 8's `onRender` hook for per-frame logic (replaces v7's `updateTransform`). NEVER spawn a second RAF loop.

`app.ticker.speed = 0.5` for slow-mo cinematics. `app.ticker.add(...)` for game-state polls.

### State management (Zustand)

```ts
interface RunState {
  run: { runId; chapterId; nodePath; gold; hp; maxHp; activeSkills: Skill[] };
  combat: { enemyId; enemyHp; combo; tiles: Tile[] };  // snapshotted, not transient
  meta:   { lexicon: Set<string>; runesOwned: Rune[]; achievements: AchId[] };
  ui:     { settingsOpen; locale; etc };
}
```

FSM transient state (which animation is mid-flight, telegraph counter) stays inside `CombatRuntime` ref, NOT Zustand. Only durable outcomes (HP changes, words found) update store.

### Persistence — three tiers

- **Tier 1 localStorage:** every store change → `JSON.stringify(runState)`. <1ms write.
- **Tier 2 Supabase:** new tables `adventure_runs`, `adventure_lexicon`, `adventure_runes_owned`. Sync on room transitions + run end. Never sync mid-combat.
- **Tier 3 Redis:** **NOT USED v1** (single-player only).

### Anti-cheat v1

Client-trust + outlier flagging in PostHog (`damage > MAX_POSSIBLE × 1.5`). No runtime rejection — combat UX latency is sacred. Server-side word-validation deferred until abuse detected.

### Asset loading & memory (CrazyGames 20MB cap — REAL math)

The 20MB CG initial-download cap includes our JS bundle. Realistic math:

| Component | Size |
|---|---|
| Pixi 8 + GSAP + Howler + Zustand (gzipped) | ~5MB |
| LexiClash app code (excluding adventure assets) | ~1MB |
| Adventure v2 runtime code | ~0.5MB |
| **JS budget total** | **~6.5MB** |
| **Asset budget remaining** | **~13.5MB** |

**Policy: one chapter loaded at a time.** Per-chapter target ≤3MB (HARD cap, not 4.5MB). Initial download ships Chapter 1 only (~3MB assets + 6.5MB JS = ~9.5MB initial), well under 20MB.

On chapter transition: `Assets.unloadBundle('chapter-N')` BEFORE `Assets.addBundle('chapter-M')` and `loadBundle`. Hub stays in memory (lightweight, ~1MB). Texture pooling for tiles + particles is shared across chapters (in always-loaded core bundle).

**Chapter 2 + 3 fetched on entry**, ~2-3s load time on 4G with a Pixi-rendered transition cinematic to mask latency.

If chapter assets blow past 3MB during production, scope-cut order kicks in (Section 9) — drop background variants before dropping shaders/effects.

### Audio (Howler)

3 buses: music (loop, ≤30s/chapter), sfx, ambience. Ducking on cinematics. Mute on blur. No voice in v1.

### Test layered strategy

1. **Vitest unit:** damage formula, word validation, FSM transitions, tile-pool draws.
2. **Jest + RTL component:** Hub screens, modals, Zustand selectors.
3. **Playwright e2e:** hub → run → end flow with Pixi mocked.
4. **NO snapshot tests** for Pixi cinematics (flaky).
5. **Manual perf benchmarks:** mid-tier Android, 100-particle stress.

### Performance budgets (hard targets)

| Metric | Target |
|---|---|
| FPS floor (mid Android) | 50 |
| FPS floor (desktop) | 60 |
| JS heap | <120MB |
| Draw calls/frame | <50 |
| Active particles | <500 |
| Texture VRAM | <80MB |
| LCP (4G) | <2.5s |
| TTI | <3.0s |
| FSM cycle (input → next turn) | <33ms |

Sentry RUM markers on every transition.

---

## Section 9 — Migration & v1 Scope Cut

### Delete list (75+ components, 50+ libs)

**Components to delete entirely** (`fe-next/components/adventure/` — keep ONLY `WorldMap*.tsx`, `AdventureHub.tsx`, `AdventureShopFAB.tsx`, `meta/UpgradeShop.tsx`, achievements/, RunePanel.tsx, HubWelcomeBanner.tsx, MasteryBadge.tsx):

- AdventureGame.tsx, AdventureGameOverlays.tsx, AdventureGameShell.tsx, AdventureGameErrorBoundary.tsx
- AdventureGrid.tsx + AdventureTile.tsx + AdventureTile.css
- AdventureView.tsx + AdventureViewHeader.tsx + AdventureViewModals.tsx
- AdventureHuntGame.tsx, AdventureWheelGame.tsx
- AdventureObjectives.tsx, AdventureToast.tsx, AdventureTimer.tsx, AdventureTutorial.tsx, AdventureUpgradeHUD.tsx, AdventureThemeBanner.tsx
- AdventureEffectsCanvas.tsx, AdventureTailOverlays.tsx, BossGridEffectStyles.css
- BossDefeatShareCard.tsx, BossDialogue.tsx, BossHPBar.tsx, BossIntro.tsx, BossRushResults.tsx, BossVictory.tsx
- CollectionPanel.tsx, ComboMilestoneOverlay.tsx, FlashChallengeToast.tsx, HintMessage.tsx
- LevelCompleteContent.tsx, LevelCompleteModal.tsx, LevelEntryOverlay.tsx, LevelGrid.tsx + .css, LevelGridComponents.tsx, LevelGridHeader.tsx, LevelPreviewCard.tsx, LevelShareCard.tsx
- LexiReaction.tsx, LootChestReveal.tsx, LootRevealAnimation.tsx, MechanicBonusToast.tsx, MechanicIndicator.tsx, MilestoneDivider.tsx, MissedWordsPanel.tsx, NextLevelPreview.tsx
- RPGLevelCard.tsx, RetryAssistModal.tsx, StoryBeatCard.tsx, StreakMilestoneCelebration.tsx, TileBadge.tsx, WeeklyChallengePanel.tsx, WordAlbumPanel.tsx
- All `boss/`, `cinematics/`, `effects/`, `hud/`, `juice/`, `power-ups/`, `quests/`, `themed/`, `ui/`, `SkillTree/` subdirs
- adventureGridGeometry.ts, bossGridEffects.ts, levelGridConfig.ts, useAdventureHistory.ts, useGridGestures.ts, hooks/

**Lib files to delete** (`fe-next/lib/adventure/` — keep ONLY: `adventureShare.ts`, `colors.ts`, `worldThemes.ts`, anything WorldMap-specific):

- abilities/, achievements concepts, archetypeMastery.ts, ascensionConfig.ts
- bossAnimations.ts, bossConfig.ts, bossRush.ts (whole boss-rush mode dies)
- collectibleConfig.ts, consumables.ts, dailyQuests.ts, endlessMode.ts, entryTiming.ts, flashChallengeConfig.ts
- flattenTiles.ts, gridConstants.ts, gridGenerator.ts, gridLanguages.ts, gridRandom.ts, gridValidator.ts, huntMode.ts
- levelArchetypes.ts, levelConfig.ts, lootConfig.ts, lootGenerator.ts, mastery.ts, nearMiss.ts
- objectives.ts, offlineCompletionQueue.ts, powerGrowth.ts, questConfig.ts, runeCatalog.ts (rebuild fresh)
- specialTiles.ts, springPhysics.ts, storyConfig.ts, themedWords.ts, themes/, upgradeConfig.ts, upgradeEffects.ts
- weeklyChallenge.ts, weeklyModifiers.ts, wordAlbum.ts, worldConfig.ts, worldMechanics.ts, worldMutators.ts

**Routes to delete:**
- `/adventure/endless` (page + tests)
- `/adventure/boss-rush` (page + tests)
- `/adventure/skills` (page + tests)
- `/adventure/achievements` STAYS but reskins to v2 schema

**Tests:** delete every `__tests__/Adventure*.test.tsx` and `lib/adventure/__tests__/*` file matching the deletion list.

### Preserve list (rebuild around these)

- `WorldMap.tsx` + `WorldMap.css` + `WorldMapBackground.tsx` + `WorldMapDecorations.tsx`
- `AdventureHub.tsx` + `HubWelcomeBanner.tsx`
- `AdventureShopFAB.tsx` + `meta/UpgradeShop.tsx` (Shop screen)
- `MasteryBadge.tsx` (repurposed for Lexicon milestones)
- `RunePanel.tsx` (used as starting scaffold; will be rewritten to back the new 18-rune armory + slot system)
- `app/[locale]/adventure/achievements/page.tsx` + components (re-skin to v2 stat schema)

### Database migration

**New tables (Supabase migration via mcp):**
- `adventure_runs` (run history, persisted to backend; outcomes are client-trusted v1 with PostHog outlier flagging — see Section 8 "Anti-cheat v1")
- `adventure_lexicon` (per-user unique words ever spelled)
- `adventure_runes_owned` (per-user owned + equipped runes)

**Old tables:** snapshot `adventure_progress` → `adventure_progress_v1_backup`, then leave the original in place but unused (rollback safety). Do NOT migrate row-by-row — clean slate intentional.

### Feature flag rollout

- ENV var `ADVENTURE_V2_ENABLED` (Vercel/Railway env).
- `/adventure` route reads flag, renders v1 OR v2.
- Internal QA on staging with flag ON for 48h.
- Production flag flip in low-traffic window.
- Monitor Sentry + PostHog for 48h. Rollback = flip flag OFF.
- After 2 weeks stable: delete v1 code in cleanup PR.

### Old user data fate

- Existing `adventure_progress` row data: archived to backup table, never read again by v2.
- Coins / gold balance: SHARED currency, untouched (LexiClash uses one gold across all modes — preserved).
- v1 achievements: preserved in achievements table, v2 adds new keys; old badges keep showing but the v2 set is what new players see by default.

### v1 scope cut order (drop in this order if behind schedule)

0. **Already cut at spec time:** Japanese (`ja`) Adventure mode — see Section 3 tile-pool note. Ship en/he/sv/es. ja shows "coming soon" card.
1. Drop Chapter 3 (ship 2 chapters, defer Mirror Saint).
2. Drop the Trap room type (timed mini-event); rely on combat + treasure + event + camp + shop.
3. Drop Bingo cinematic (keep Bingo as +3× damage but skip the screen-wide burst — boss cinematic budget retained).
4. Drop hidden achievements category (ship 5 categories of 3 = 15 achievements).
5. Drop one shader per chapter (cap 2 instead of 3).
6. Drop the dialogue/event room type entirely (rely on treasure + camp + shop only for non-combat).
7. Drop one background variant per chapter (cap 3 instead of 4) — last-resort to hit 3MB chapter cap.

Drop in this order. Stop dropping when you have a shippable v1.

---

## Open Questions for User Review

1. **Naming.** Working chapter names are placeholders. Do you have preferred names or themes?
2. **Mascot in combat.** Mascot is in the Hub for sure. Should it appear as a sidekick in combat (cute non-interactive companion sprite) or stay Hub-only? Recommendation: Hub-only v1 to preserve combat focus.
3. **Hero customization.** Currently the hero is a single shared character. Skin variants from runes/achievements? Recommendation: ONE hero v1, cosmetic skins post-launch.
4. **PvP integration.** Does Adventure unlock anything in multiplayer? (Lexicon shared across modes, e.g. words found in adventure could buff multiplayer dictionary.) Recommendation: Lexicon is shared, runs are isolated.
5. **Asset budget approval.** ~9 backgrounds (3 per chapter, post-cap revision) + 3 boss arenas + ~9 enemy sprites + 3 hero anim sets. Estimated fal-ai cost + curation hours: 30-40h art-direction work spread across a 6-week sprint. Sign-off?
6. **Hebrew bidi inside the casting glyph.** When a he-locale player composes a word, letters fly from RuneSlate (chrome-mirrored, top-right-anchored) into the casting glyph between hero (left) and enemy (right). Should the spelled word read **RTL inside the glyph** (visually correct for Hebrew readers — right-most letter is the first letter) on a non-mirrored battlefield? Recommendation: **YES, RTL inside the glyph for he**. The glyph is a text element, not a battlefield-geometry element — it follows chrome rules.
7. **Existing-player data migration policy.** v1 adventure currently grants gold (single shared currency) + per-mode achievements. v2 adds: lexicon (new, blank for everyone), runes (new pool, replaces v1 `runeCatalog.ts`). Decisions to lock:
   - **Gold:** preserved (single shared currency across all modes — never zeroed).
   - **v1 runes earned:** zeroed at v2 launch. Compensation: existing players get +500 gold one-time grant + an exclusive "Veteran" cosmetic badge. Lock confirmed?
   - **v1 adventure achievements:** preserved as historical record; v2 adds new achievement set; both visible in achievements UI under separate tabs.
   - **v1 progress (level reached, etc.):** snapshotted to backup table, not exposed in v2 UI. Effectively reset.
8. **Japanese deferral.** Adventure mode in `ja` shows "coming soon" card with link/CTA back to other modes. User comfortable with this scope cut? Or hold v1 for ja? Recommendation: ship without ja; add in v2 with hiragana-tile design.

---

## Wall Sentence (printed last to remind every reader)

> **"If spelling a word to deal damage does not feel viscerally more magical than pressing an 'Attack' button within the first playable prototype, burn the rest of the design and start over."**
