# Word Vault — Technical Plan for External Critique

> **For the user:** copy the entire content of this file into ChatGPT / Gemini / Grok / DeepSeek / Claude (separate session) for a critique. The document is self-contained.

---

## CRITIQUE PROMPT (paste this at the top)

You are a senior game-engineering / technical-art reviewer. Your specialty is **how games feel alive** — the micro-interactions, animation polish, audio layering, state machines, asset pipelines, and the small details that separate a "playable prototype" from a "product that feels alive and well."

I'm planning the technical implementation of a story-driven puzzle-adventure web game called **Word Vault**. The plan focuses on **functionality, tech architecture, and aliveness** — NOT story, lore, or art assets.

Below you'll find:
1. The product overview (what Word Vault is in one page)
2. The tech stack and architecture
3. The "feel alive" plan — every system that makes the game feel responsive, breathing, present
4. Asset pipeline + state management + persistence + audio layering
5. Risks I've identified
6. Specific critique questions

**My ask:** tear this plan apart. Find:
- What's missing for "alive and well" feel
- What's over-engineered
- What architecture decision will cause pain in 12 months
- What polish patterns I haven't considered
- What state-machine / animation / audio coordination traps lurk
- What modern tech / library / pattern would lift this from "good" to "great"

Be specific, be brutal, name names of libraries and patterns. Cite real games (Inscryption, Disco Elysium, Hades, Layton, Monument Valley, Untitled Goose Game) where their polish does what mine should.

Format your critique as:
- **Top 5 things I missed** (most important)
- **Top 3 architecture bombs** (will break later)
- **Top 5 "aliveness" details** I should add
- **Anything I over-engineered**
- **A 1-sentence north star** I should print on the wall

---

## 1. PRODUCT OVERVIEW

**Word Vault** is a single-player web game (Next.js App Router, deployed on Railway, primary platforms: mobile web + desktop web + Capacitor Android wrap, future iOS).

**Genre:** story-driven puzzle-adventure (Professor Layton + Inscryption + escape-room).

**Core loop:** Player is **MELO**, a sticker-illustrated marshmallow-cube mascot. Travels chamber by chamber through a corrupted Vault. Each chamber is a small **room** containing a **riddle**. Solving riddles advances the story, unlocks rooms, drops items, accumulates an inventory.

**Riddle variety:** ~8 distinct types — word constraint puzzles, cipher decoding, logic/sequence (lever orders), memory (recall after flash), spatial (slide tiles), audio (melody match), lateral riddles, pattern recognition.

**Structure:** 5 "books" × 8-10 rooms each = ~50 rooms total game. Linear progression with branching only inside chapters. NO permadeath. NO run-resets. Every solved room is permanent.

**Hero arc:** redeem 4 corrupted "cousin" mascots (each a chapter boss) by *understanding* them through story-riddles, not by fighting them.

**Tone:** eerie fairytale. Whimsical-but-melancholy.

**Locales:** English + Hebrew (RTL) primary v1. Swedish + Japanese + Spanish later. Localized via existing `next-intl` + `i18n/` infrastructure (already wired in repo).

**Existing tech in repo we're building on:**
- Next.js 16 App Router + TypeScript
- Pixi.js 8.17 for canvas rendering
- GSAP 3.14 for animations
- Howler 2.2 for audio
- Zustand for state (already used elsewhere)
- Supabase for persistence
- Vitest + Jest for tests
- 5-locale i18n already wired

The game replaces an earlier Adventure-mode prototype that we built and discarded. The codebase has ~30k LoC of LexiClash word-game systems we can leverage (dictionary trie, word validators, RTL handling, mascot assets, Neo-Brutalist UI primitives).

---

## 2. TECH STACK

### Runtime

| Concern | Library | Why |
|---|---|---|
| App framework | Next.js 16 App Router | Already on it; SSR + dynamic routes |
| Canvas rendering | **Pixi.js 8.17** | High-perf 2D, WebGL+WebGPU, mature |
| Tween / timeline | **GSAP 3.14** | Best-in-class easing + sequencing |
| Skeletal animation | **Lottie** (free) for cinematics, **Rive** ($14/mo) for state-machine reactive characters | Lottie = exported After Effects scenes; Rive = data-driven character with state machine |
| Audio | **Howler 2.2** for SFX + music | Cross-browser sprite support |
| State management | **Zustand** + **XState** for riddle state machines | Zustand for game state; XState for the more complex per-riddle FSMs |
| Persistence | **localStorage** (immediate) + **Supabase** (cloud sync) | Tier-2 persistence; player can resume across devices |
| Input | Native pointer events + custom drag-adjacency engine | Already prototyped |
| Testing | Vitest (unit) + Jest+RTL (component) + Playwright (E2E) | Already wired |
| Telemetry | Sentry (errors) + PostHog (events) | Already wired |
| i18n | `next-intl` + ICU MessageFormat | Already wired |

### Asset pipeline (decided, NOT in scope to generate yet)

- **Sprites & backgrounds:** fal-ai Flux 2 Pro (image-to-image from existing mascot file as visual anchor; preserves brand consistency)
- **Music:** Suno (user-generated, 5 chapter themes + hub theme + boss-redemption stinger)
- **SFX:** CassetteAI Sound Effects via fal-ai (~30 SFX clips, ≤30s each)
- **Voice (optional v1):** ElevenLabs API (narration + cousin-voice barks); deferred unless API key already in env
- **Cinematic moments:** Lottie (.json) for stamp-style intros; Rive (`.riv`) for reactive mascot states

---

## 3. ARCHITECTURE

### Module layout (planned)

```
fe-next/
├── app/[locale]/
│   ├── word-vault/                  ← new entry route
│   │   ├── page.tsx                  ← server component
│   │   └── PageClient.tsx            ← client wrapper
│   └── ... (existing LexiClash routes untouched)
├── components/word-vault/
│   ├── HubFoyer.tsx                  ← hub screen (Librarian, Inventory, Memory Theatre)
│   ├── BookMap.tsx                   ← chapter map
│   ├── RoomShell.tsx                 ← root container for a single room
│   ├── riddles/                       ← one component per riddle type
│   │   ├── WordConstraintRiddle.tsx
│   │   ├── CipherRiddle.tsx
│   │   ├── LogicSequenceRiddle.tsx
│   │   ├── MemoryRiddle.tsx
│   │   ├── SpatialRiddle.tsx
│   │   ├── AudioRiddle.tsx
│   │   ├── LateralRiddle.tsx
│   │   └── PatternRiddle.tsx
│   ├── overlays/                      ← cinematic + transition layers
│   │   ├── CharacterDialogue.tsx
│   │   ├── MemoryFlashback.tsx
│   │   ├── RedemptionCinematic.tsx
│   │   └── RoomTransition.tsx
│   ├── inventory/
│   │   ├── InventoryDrawer.tsx
│   │   ├── ItemCard.tsx
│   │   ├── CharmSlots.tsx
│   │   └── MemoryCoin.tsx
│   └── pixi-scenes/                   ← Pixi-side renderers
│       ├── ChamberScene.ts
│       ├── HubFoyerScene.ts
│       └── layers/
│           ├── BackgroundLayer.ts
│           ├── ActorsLayer.ts
│           ├── ParticlesLayer.ts
│           └── EffectsLayer.ts
├── lib/word-vault/
│   ├── types.ts                       ← Riddle, RoomConfig, Item, Cousin, Charm
│   ├── content/                        ← per-chapter authored data
│   │   ├── book1-hearth.ts
│   │   ├── book2-lullaby.ts
│   │   ├── book3-forgetting.ts
│   │   ├── book4-cipher.ts
│   │   └── book5-mirror.ts
│   ├── engine/
│   │   ├── riddleStateMachine.ts      ← XState definition
│   │   ├── inventoryEngine.ts
│   │   ├── progressionGate.ts          ← what's unlocked when
│   │   └── solvers/                    ← shared solver utilities
│   ├── state/
│   │   ├── gameStore.ts                ← Zustand: progress, inventory, settings
│   │   ├── runtimeStore.ts             ← transient: current room, animations in flight
│   │   └── persistence.ts              ← localStorage + Supabase sync
│   ├── audio/
│   │   ├── musicBus.ts                 ← Howler music channel + crossfade
│   │   ├── sfxBus.ts                   ← Howler sfx channel + ducking
│   │   └── ambientLayers.ts            ← per-chapter ambient loops
│   └── animation/
│       ├── lottiePlayer.ts             ← wrapper for cinematic Lotties
│       ├── rivePlayer.ts               ← wrapper for mascot reactive states
│       └── gsapTimelines.ts            ← shared timeline factories
├── public/word-vault/                  ← static assets (lazy-loaded by chapter)
│   ├── audio/
│   ├── lottie/
│   ├── rive/
│   └── images/
└── lib/word-vault/__tests__/
```

### State management architecture

**Two-store split:**

1. **`gameStore` (Zustand, persisted via localStorage + Supabase)**
   - `progress: { currentBook, currentRoom, solvedRooms: Set, redeemedCousins: Set }`
   - `inventory: { coins: number, fragments: number, items: ItemId[], charms: CharmId[], equippedCharms: CharmId[] }`
   - `settings: { locale, audio: {music, sfx, voice}, accessibility: {largeText, reduceMotion, colorblindMode} }`
   - `lexicon: { uniqueWordsSpelled: Set, milestonesUnlocked: number }`

2. **`runtimeStore` (Zustand, NOT persisted — resets on reload)**
   - `currentRiddleId: string | null`
   - `riddleFsmState: FsmState` (XState snapshot)
   - `dialoguePending: DialoguePayload | null`
   - `cinematicInFlight: CinematicId | null`
   - `pixiAppMounted: boolean`
   - `inputLocked: boolean` (true during cinematics)

**Why split:** persistence boundaries are clearer. Reload doesn't lose your progress but DOES reset transient UI state.

### Riddle state machine (per riddle, XState)

```
states:
  ready          (player about to start)
  active         (input accepted)
  validating     (checking solution)
  solved         (success animation playing)
  failed         (cooldown before retry)
  hint-active    (hint lantern consumed, fog lifting)
  abandoned      (player exits without solving)
```

Transitions are typed. Each riddle type provides its own `solve(input)` function but shares the FSM shell.

### Pixi scene graph

Same proven pattern from the prototype:
```
PixiApplication (resolution-aware)
└─ SceneStack (manages active scene + crossfade)
   └─ ChamberScene
      ├─ BackgroundLayer (parallax + ambient particles)
      ├─ ActorsLayer (Melo, NPCs, props)
      ├─ ParticlesLayer (ParticleContainer, max 500 active)
      ├─ RiddleSurface (riddle-specific Pixi container)
      └─ EffectsLayer (filters, screen shake, glow)
```

DOM/React layer overlays Pixi for: dialogue boxes, inventory drawer, hint UI, settings.

`pointer-events: none` on the canvas; React UI is on top with native pointer events.

### GSAP + Pixi ticker coordination

Single-clock pattern: Pixi's `Ticker` is the game-clock. GSAP runs on its own RAF (browser-native). For cinematic timing, we use `gsap.timeline()` with explicit durations — no manual Pixi-tick-driven tweens. Pixi's `app.ticker.speed` allows slow-mo on cinematic moments.

### Audio architecture (Howler)

3 buses with ducking:
- **Music bus** (single track, crossfaded between chapters, ~30s loops)
- **SFX bus** (interactive sounds, sprite-loaded for low latency)
- **Ambient bus** (chapter-specific atmosphere — fire crackle, ice wind, paper rustle, glitch buzz)

Music ducks 30% during dialogue. SFX has its own pool (3 instances per critical SFX to avoid retrigger cutoff).

### Persistence

**Tier 1 — localStorage** (immediate writes):
- Every `gameStore` mutation writes JSON snapshot
- Survives reload
- Survives offline

**Tier 2 — Supabase** (debounced + on milestones):
- Sync on chapter complete, item earned, room solved, settings change
- 30-second debounce for low-priority writes (inventory shuffle)
- Conflict resolution: last-write-wins per key, with timestamp

**Anti-cheat:** none required (single-player, narrative game). Don't gate on it.

### Localization architecture

- All player-facing strings via `t('word-vault.<chapter>.<room>.<key>')`
- Chapter content authored as TypeScript objects with locale keys baked in
- RTL: chrome mirrors automatically (`dir="rtl"` set on root); Pixi battlefield-equivalent (room scenes) does NOT mirror — Hebrew text inside Pixi auto-handles bidi via the platform's text rasterizer

---

## 4. THE "FEEL ALIVE" PLAN

This is the section the user emphasized most. Every system below exists to make the game feel responsive, breathing, present.

### A. Reactive mascot state machine (Rive)

**Melo is always doing something.** Even idle, he reacts.

State machine driven by gameStore + runtimeStore signals:
- IDLE: subtle breathing animation, occasional blink
- THINKING: when a riddle is open and 5+ seconds pass, Melo tilts head, taps chin
- HAPPY: room solved, jumps + sparkles
- SAD: dialogue with corrupted cousin
- SCARED: encountering a new cousin for the first time
- DETERMINED: starting the redemption chamber
- TRIUMPH: redemption succeeds, big pose
- TIRED: after 5 rooms in a session, yawn animation
- CONFUSED: invalid input, scratches head

Implementation: **Rive .riv** file with state machine. React component subscribes to game events + sets Rive inputs. Rive runtime is ~100KB, runs at 60fps natively.

NPCs (Librarian, Wick) get the same treatment — each their own Rive file with 3-5 states.

### B. Idle ambient life

Even when the player isn't doing anything, the room has motion:

- **Particles:** every chapter has its signature ambient (embers / snow / dust motes / glitch artifacts / mirror shards). ~50 particles max, ParticleContainer.
- **Background parallax:** 3 layers per room, slow drift. Gives depth.
- **Lantern flicker:** Melo's lantern flickers warm light periodically.
- **Letter-tile breathing:** unselected tiles in word puzzles have a gentle ~3-second scale pulse (0.97-1.03×) so the slate never looks "dead."
- **Cousin shadow at chapter borders:** the cousin's silhouette occasionally glides in the background — a teasing presence even before the redemption room.
- **Memory coins glint:** newly-earned coins have a slow rotation + glint sweep until viewed in inventory.

### C. Micro-interactions everywhere

Every player action has felt feedback within 50ms:

| Action | Feedback (visual) | Feedback (audio) |
|---|---|---|
| Tap tile | Scale-pop 1.15 then 1.0 in 80ms | tile_tap.wav (3 random variants) |
| Drag continues | Lime trail line follows finger | tile_continue.wav (subtle pitch up) |
| Drag back to undo | Tile scale-down 0.9 with sad bend | tile_undo.wav |
| Word valid (preview) | Tile glow pulse, dmg counter ticks up | (silent — preview state) |
| Word submit valid | Whole word flash, projectile if combat | word_submit.wav |
| Word submit invalid | Glyph shake-x 6 frames, red flash | word_invalid.wav |
| Riddle solved | Gold star burst + ROOM CLEARED banner GSAP timeline | solved_chime.wav |
| Item earned | Coin/item flies to inventory icon, drawer pulse | coin_drop.wav |
| Hint lantern used | Fog parts in 1s sweep, hint reveals | hint_chime.wav |
| Cousin appears | Silhouette darkens, ambient music swells | cousin_voice_growl.wav |

GSAP timelines for every animation. Reuse: `lib/word-vault/animation/timelines.ts` factory functions.

### D. Transitions never feel abrupt

- **Room → room:** 600ms crossfade with Pixi scene swap. No instant cut.
- **Hub → book:** zoom-in animation, book opens, page-turn sound, pause, then transition.
- **Riddle solved → next room:** triumph pose + 500ms hold, then door opens with creak sfx, then walk-through.
- **Cousin redemption:** 5-8 second cinematic. Camera zooms, music swells, color shifts to redemption-tone, Lottie character animation plays. UNSKIPPABLE on first viewing, skippable on replay.

### E. Sound layering — depth without overload

- **Layer 1 — chapter music** (always playing, low volume, lowpass on idle)
- **Layer 2 — ambient loop** (chapter-specific: fire crackle, ice wind, paper rustle)
- **Layer 3 — interactive SFX** (player actions)
- **Layer 4 — narrative stingers** (cousin appearances, redemption moments)
- **Layer 5 — voice/narration** (where used)

When dialogue plays, layers 1+2 duck 30%. When cinematic plays, layers 1+2 fade out and replaced with cinematic music.

Sound design rule: no two layers occupy the same frequency band.

### F. Accessibility = respect

- **Reduce motion** toggle: kills all parallax, particle systems, screen shake. Solid color background.
- **Color-blind palette** swap: protanopia / deuteranopia / tritanopia presets via shader filter.
- **Large text** toggle: bumps font size 30%, reflows.
- **Subtitle / closed-caption** for ALL voice + cinematic SFX.
- **Slow-mode** toggle: all timed riddles get +50% duration.
- **Skip cinematics** after first viewing.
- **Keyboard navigation**: full focus-visible support, ARIA live regions for game events.
- **Screen reader friendly** (Pixi-rendered scenes get DOM mirror-content with aria-labels).

### G. State persistence that respects the player

- Save after EVERY meaningful action (room solved, item earned, dialogue advanced).
- Resume EXACTLY where the player left — including which dialogue line was visible, which riddle move was last made.
- "Continue" button on splash takes you straight back, no menu navigation.
- Cloud-sync silent in background.

### H. Fail states that don't punish

- No HP, no permadeath in puzzle rooms.
- Wrong answer = a small wobble + soft buzz, no progression loss.
- Hint Lantern (paid currency) available after 3 wrong attempts.
- "I'm stuck" button after 5 minutes of inactivity in a room — Librarian appears, offers a free hint.
- Even chapter "boss" redemption can't be lost. If the player struggles, the cousin softens further to make it solvable.

---

## 5. ASSET PIPELINE

(Decided, NOT yet executing.)

### Visuals
- fal-ai Flux 2 Max + Pro for backgrounds + heroes
- Image-to-image with existing `fe-next/public/mascot/celebration.webp` as visual anchor — locks brand consistency for all corrupted-cousin variants
- Lottie .json files: ~8 cinematic moments
- Rive .riv files: 1 for Melo, 1 for Librarian, 1 for Wick, 1 per cousin = ~7 character files

### Audio
- Suno (user-generated): 5 chapter themes + hub theme + redemption stinger = 7 tracks, ~30-60s each
- CassetteAI via fal-ai: ~30 SFX clips, ≤30s each, batched
- ElevenLabs (optional): ~30 narration lines per chapter × 5 chapters = ~150 lines, ~$10 per locale

### Versioning
- All assets stored in `fe-next/public/word-vault/` lazy-loaded per chapter via Pixi `Assets.addBundle('book-N', …)`
- On chapter transition: unload prior bundle to free memory
- Initial bundle (hub + book 1): target ≤4MB

---

## 6. PERFORMANCE BUDGET

| Metric | Target |
|---|---|
| FPS floor (mid-Android, e.g. Galaxy S10) | 50 |
| FPS floor (desktop) | 60 |
| JS heap (peak, in-room) | <120MB |
| Pixi draw calls per frame | <50 |
| Active particles | <500 |
| Texture VRAM | <80MB |
| LCP on 4G (room first-paint) | <2.5s |
| TTI | <3.0s |
| Time to interactive after route enter | <1.5s |
| Audio latency (tap → SFX) | <80ms |

Sentry RUM markers on every transition.

---

## 7. RISKS

1. **Asset coherence at scale.** AI-generated art tends to drift in style across many prompts. Mitigation: image-to-image with single mascot anchor, 1-2 hero "style guide" prompts, manual curation.
2. **Riddle authoring is the bottleneck.** ~50 unique riddles × story ≈ 80-120 hours of design work minimum. Mitigation: chapter 1 first, then validate before authoring 2-5.
3. **Localization quality (Hebrew especially).** AI translation for narrative text is shaky. Mitigation: hand-translate critical story beats, AI for one-off riddle text; flag "needs native review" in commit.
4. **Audio mixing.** Five layers can muddy. Mitigation: dedicated 1-week audio polish phase before public ship.
5. **Save corruption.** localStorage can be cleared, Supabase can fail. Mitigation: triple-redundant save (in-memory + localStorage + Supabase), versioned schema with migrations.
6. **Mobile portrait stacking.** Inventory + dialogue + Pixi canvas all competing for screen. Mitigation: design mobile-first, drawer-based inventory, full-screen dialogues.
7. **Sound assets pre-load size.** All chapter music + SFX could balloon initial load. Mitigation: lazy-load per chapter, ambient streams instead of preload, audio-sprite SFX.
8. **Rive state-machine debugging.** New tech for the team; runtime errors hard to trace. Mitigation: start with Lottie for v1 cinematics, only adopt Rive for Melo + cousins where state-reactivity matters.

---

## 8. PHASING

### Phase A — Foundation (1 week, no asset gen)
- Set up `lib/word-vault/` module skeleton
- Type definitions: `Riddle`, `RoomConfig`, `Item`, `Cousin`, `Charm`
- Zustand stores (gameStore + runtimeStore) + persistence layer (localStorage stub, Supabase stub)
- XState riddle FSM
- Hub Foyer + Book Map + Room Shell skeleton (no riddles yet)
- Hot-reload dev story: a single placeholder room loads end-to-end

### Phase B — First two riddle types (1 week)
- WordConstraintRiddle (reuses prototype work)
- LogicSequenceRiddle (lever puzzle)
- Riddle state machine integration
- Solve / fail / hint flows
- Inventory icon-flying-to-drawer animation

### Phase C — Engine completeness (1 week)
- Add CipherRiddle, MemoryRiddle, SpatialRiddle
- Audio layering wired (with placeholder SFX)
- Reactive mascot scaffolding (Rive set up, single state for now)
- Cinematic transition system (Lottie loader)
- Hint Lantern system
- Memory Theatre skeleton

### Phase D — Chapter 1 content (2 weeks)
- Author all 8 rooms of Book 1 (riddles + dialogue + flow)
- Wire Cinder redemption cinematic
- First-time-user tutorial
- Mobile-first responsive polish
- Hebrew RTL polish

### Phase E — Polish (1 week)
- Real Suno music for hub + chapter 1
- CassetteAI SFX ~30 clips
- Optional ElevenLabs narration
- Lottie cinematics
- Chapter 1 playtest with 3-5 testers
- Iterate based on solve rates + retention

### Phase F — Chapters 2-5 (4-5 weeks, one chapter per week)
- Each chapter follows Phase B-D pattern
- Engine reused; only content + chapter mechanics added

**Total v1 timeline:** ~10 weeks. Chapter 1 demo: ~5 weeks.

---

## 9. SPECIFIC CRITIQUE QUESTIONS

To the LLM reviewing this:

**Architecture:**
1. Two-store Zustand split (game + runtime) vs single store with persistence selectors — is the split worth the complexity?
2. XState for per-riddle FSM vs hand-rolled state machine like the v2 prototype used — which scales better when we have 8 riddle types × 50 instances?
3. Pixi 8 + React DOM hybrid (canvas with `pointer-events: none`, React UI on top) — best practice or trap? What about a full DOM build for puzzle rooms (CSS-only) and Pixi only for cinematics?
4. Rive vs Lottie — for a story-puzzle game with reactive characters, which gives 80% of the value at 20% of the effort?
5. localStorage + Supabase tier-2 with last-write-wins — too naive? Should we use CRDTs or proper conflict resolution?

**Aliveness:**
6. What "alive" details are missing from section 4? What does a game like Inscryption or Disco Elysium do that I'm not doing?
7. Reactive-mascot state machine: 9 states feels right or way too many? Where's the sweet spot for a 2D puzzle game?
8. Idle ambient particles + parallax — am I over-promising visual richness that will cause perf issues on mid-Android?
9. Audio layering with 5 buses + ducking — is this overkill for a puzzle game vs just music + SFX?

**Tech choices:**
10. Howler vs Tone.js vs Web Audio API directly — for a game with music ducking + sprite SFX + ambient streams, which fits best?
11. fal-ai Flux 2 Pro for images — anyone seen better consistency from another model in 2026?
12. Suno music quality at 60s loops — what's the floor for game OST quality?
13. CassetteAI SFX vs ElevenLabs SFX vs human-recorded packs — quality / cost / time tradeoffs?

**Structural:**
14. Linear progression with no branching map — does this hurt replayability? Should chapters have branching paths (Slay the Spire-y) or stay linear?
15. NO permadeath, NO timed pressure — is this catering too hard to casual? Does the story-puzzle genre need failure tension?
16. ~50 rooms total game length — too short, too long, or just right for a $10-15 mobile/web title?

**Feel:**
17. The "wall sentence" replacement: "Every room must teach or reveal one thing. If a room exists only to fill space, cut it." — is this the right kill criterion for a story-puzzle game, or is there a sharper one?
18. What 1-sentence north-star should I print on the wall to keep the team aligned for 10 weeks of building this?

---

## 10. CONTEXT THE LLM MIGHT WANT

- The team is small (1-2 developers + AI tools, no dedicated artists or composers)
- Existing codebase is the LexiClash word-game platform (~30k LoC) with proven systems for word validation, RTL Hebrew, mascot assets
- We've already prototyped a different word-RPG (combat-based) and discarded it — Word Vault is the redirect
- Target audience: casual players (mobile-first), word-game fans willing to try a story format, puzzle gamers
- Monetization (post-MVP): one-time unlock after Book 1 demo (free), or all-chapters bundle ($5-10)
- Distribution: Web (lexiclash.app domain), then Capacitor Android (Play Store), then iOS

---

## END OF PLAN

**My ask, again:** be specific, be brutal, name names. The goal is "alive and well" — not "complete" or "fancy" — alive. Where are the missed beats? What architecture lurks as a 12-month bomb? Print one sentence on the wall.
