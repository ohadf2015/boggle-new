# Word Vault v3.5 — Final Design Document

> **For agentic workers:** This is the source-of-truth briefing. Read this entire file before dispatching subagents for Phase A.
>
> Phase A starts in a fresh Claude Code session. Subagents should be dispatched per chunk (module skeleton / types / Zustand / XState / Pixi Hub) using `superpowers:subagent-driven-development`.

**Date locked:** 2026-05-02
**Status:** Design phase complete. Ready for Phase A foundation work.
**Working title:** *Word Vault: Tales of the Corrupted Cube*
**Version:** 3.5 (LOCKED — 3 critique rounds, ~10 reviewers, all GO)

---

## 0. CRITIQUE TRAIL (read before changing anything)

This plan was shaped by 3 rounds of external LLM critique:

- Round 1: 4 reviewers — initial scope critique
- Round 2: 3 reviewers — cuts validation
- Round 3: 4 reviewers — final GO/NO-GO gate

**Round 3 verdict:** 4/4 GO (3 with revision). Convergent revision = "ship 3-room vertical slice at week 8 before committing to remaining content + polish."

**User overrode mid-Round-2** to keep Hebrew. **User overrode end-of-Round-3** to make it Hebrew-only at launch.

**Critique prompt files** (for reference):
- `docs/superpowers/specs/2026-05-02-word-vault-COMPLETE-prompt.md` (round 1)
- `docs/superpowers/specs/2026-05-02-word-vault-REVISED-prompt-for-critique.md` (round 2)
- `docs/superpowers/specs/2026-05-02-word-vault-v3-LOCKED-prompt-for-critique.md` (round 3)

If a future engineer disagrees with a locked decision, read the relevant critique prompt + responses first.

---

## 1. THE WALL SENTENCE (print this on the wall)

> **"Every room must change what the player understands — about the mechanic, the character, or themselves. If it changes none, it is the corruption — cut it."**

Kill criterion for every room, dialogue line, ability, item.

---

## 2. VISION

**Word Vault** is a story-driven puzzle-adventure web game. Player is **MELO**, a sticker-illustrated marshmallow-cube hero. He travels chamber by chamber through a corrupted Vault, redeeming his four sibling-cousins (Cinder/Frost-Mute/Forgotten/Ciphermaster) by *understanding* who they were before corruption — not by fighting them. Solving riddles advances the story, unlocks rooms, drops items, accumulates an inventory.

**Reference DNA:** Professor Layton (puzzle structure) + Inscryption (eerie tone) + Knotwords (constraint-based clarity) + Bookworm Adventures (word puzzle in narrative wrap).

**This is NOT:** a roguelike, a tycoon, a word-RPG, a combat game, or a deckbuilder. Earlier prototypes explored those. They are deprecated.

---

## 3. SCOPE — BOOK 1 ONLY DEMO

**Launch content:**
- Book 1: The Hearth Halls (Cinder's redemption arc)
- Hub Foyer with Librarian
- 6 rooms total
- 2 cinematics (Vault entrance + Last Recipe redemption)
- 3 riddle engines (Word Constraint, Cipher, Logic/Sequence)
- Inventory system (1 currency, 1 consumable, permanent items)
- 1 locale: **Hebrew only**

**Books 2-5 = post-launch roadmap.** Defer all content beyond Book 1 until retention/conversion validates the loop.

---

## 4. STORY (locked)

### Lore (one paragraph)

The Marshmellow Realm was tended by 5 cousin-cubes who carried Letter-Songs binding the realm together. Sealed deep in the Word Vault was THE TWIN VOICE — a forbidden book that speaks in contradictions. The youngest cousin Vex peeked at it; by morning, 4 cousins were CORRUPTED into shadow-versions of themselves. Only Melo (the middle, balance-keeper) remained whole. He must travel down the broken Vault staircase, room by room, redeeming his cousins by *understanding* who they were before — not by fighting them. Each cousin's redemption is a story-riddle, not a boss fight.

### Cousin redeemed in Book 1: CAEL → THE CINDER

- **Was:** warm-hearted cook, fed everyone, knew every recipe by heart, hummed while stirring
- **Is:** charred-black cube wreathed in lava-cracks, hungry, raging, glowing red embers for eyes — but flashes of his old self when offered the right ingredients
- **Domain:** Hearth Halls — burned-down kitchen, ash-covered counters, embers in air

### Melo's internal arc

- Recurring inner question across 6 rooms: *"Why did I sleep through the corruption?"*
- Two real **player choices** (rooms 4 + 6) — flavor consequences (affect Cinder Charm flavor text + final cinematic dialogue line)
- No mechanical branching — choices are story-flavor, NOT engine-state. (Round 2 + 3 reviewers warned against branching = scope landmine.)

### Twin Voice tease (under-foreshadowed in v3, fixed)

- **Tease 1**: charred diary in room 4 mentions "two voices that should not have spoken"
- **Tease 2**: glitched whisper in redemption cinematic — "you left us…"

---

## 5. THE 6 ROOMS

### Room 1.1 — THRESHOLD: *The Cracked Door*
- **Engine:** Word Constraint (tutorial)
- **Setup:** Burnt wooden door, only 4 tiles visible: F-I-R-E (glowing orange)
- **Puzzle:** Drag tiles to spell a word. Open the door.
- **Solution:** Spell FIRE.
- **Story beat:** Melo enters. Lantern lights up. Distant roar. Cinder calls: "GO BACK, LITTLE ONE!"
- **Earn:** First Memory Coin, controls intro.
- **Hebrew specifics:** Tiles letter set = ש,ל,ה,ב (spell שלהב — "flame"). Or simpler: א,ש (spell אש — "fire"). Use 3-letter min for tutorial parity.

### Room 1.2 — RIDDLE A: *The Recipe Wall*
- **Engine:** Logic/Sequence + Word Constraint hybrid
- **Setup:** Six fading recipe cards on a wall, each missing an ingredient. Cards out of order.
- **Puzzle:** Order cards via hint rhyme + spell each missing ingredient from a tile pool.
- **Hebrew rhyme:** "תחילה רותחים, אחר כך לשים, ולבסוף אופים."
- **Solution:** Order BOIL → KNEAD → BAKE; missing words: WATER, FLOUR, BREAD.
- **Hebrew solution:** מים, קמח, לחם (with appropriate normalization for final-form letters)
- **Story beat:** As cards align, faint humming melody plays — Cael's old cooking song.
- **Earn:** 2 Memory Coins + 1 Memory flashback.

### Room 1.3 — RIDDLE B: *The Cipher Pantry*
- **Engine:** Cipher (anagram unscramble)
- **Setup:** Pantry of jars; each label is a scrambled ingredient name.
- **Puzzle:** Unscramble 4 jars; identify the red herring.
- **English shape (for reference):** RUGAS → SUGAR, RUFLO → FLOUR, TAESM → STEAM, GAOR → ROAR (red herring).
- **Hebrew shape:** רכוס → סוכר (sugar), חמק → קמח (flour), חתפ → פתח (red herring), חמל → לחם (bread). Adjusted for HE root patterns.
- **Story beat:** When 3 correct labels placed, pantry door opens.
- **Earn:** Q-LETTER TOKEN equivalent + Memory Coin.

### Room 1.4 — RIDDLE C: *The Smouldering Vault*
- **Engine:** Logic/Sequence (lever puzzle)
- **Setup:** 4 levers labeled with cooking utensils (KNIFE/POT/FORK/OVEN). Pull in correct order based on a wall-rhyme.
- **Hint rhyme:** "First it heats, then it slices, then it lifts, then it serves."
- **Solution:** OVEN → KNIFE → FORK → POT.
- **Hebrew rhyme:** "קודם מחמם, אחר כך חותך, ואז מרים, ואז מגיש."
- **Story beat:** Vault opens, reveals **Cael's Recipe Book** (first permanent item).
- **🎯 PLAYER CHOICE 1:** Burn one of Cael's recipes for instant heat boost OR keep all of them. Affects Cinder Charm flavor text.
- **Earn:** Cael's Recipe Book (auto-completes future ingredient sequences).
- **Twin Voice tease 1:** Diary entry visible on a side desk.

### Room 1.5 — STORY ROOM: *Cael's Old Kitchen*
- **Engine:** None — story-only "just exist" room
- **Setup:** A cleaned, untouched kitchen frozen in time before corruption.
- **Action:** Walk through; click 5 objects (apron, ladle, cookbook, hat, photo) to read short memories.
- **Story beat:** The fifth object — a family photo — shows all 5 cousins together. Melo sheds a tear. **The signature dish ingredient ORDER is revealed environmentally here** (player must NOTICE — not told).
- **Earn:** WORD FRAGMENT (1 of 4 needed for redemption).

### Room 1.6 — REDEMPTION CHAMBER: *The Last Recipe*
- **Engine:** Word + memory + emotional choice (hybrid)
- **Setup:** Cinder appears, RAVENOUS. Demands a meal.
- **Puzzle:** "Cook" by spelling 3 ingredient words IN ORDER — the order Cael used to make his signature dish (revealed environmentally in room 1.5).
- **Solution:** WATER → FLOUR → HONEY (or HE equivalent: מים → קמח → דבש). Each correct word makes Cinder calmer.
- **Story beat:** Third correct word: he transforms back into Cael for a moment, weeps, hugs Melo, then vanishes — leaving Recipe Book + Letter-Song.
- **🎯 PLAYER CHOICE 2:** Final cinematic — what Melo says to Cinder before he vanishes. Affects Charm flavor text + epilogue line.
- **Earn:** CINDER CHARM (passive: +1 Memory Coin from fire-themed riddles), 1st of 4 Letter-Songs, Recipe Book fully unlocked.
- **Twin Voice tease 2:** Glitched whisper at end of cinematic — "you left us…"

---

## 6. INVENTORY & ECONOMY

### Currencies (1)
- **Memory Coins** (gold) — earned by clearing rooms (10-30 each, more for perfect solves). Spent at Librarian's shop on Hint Tokens.

### Consumables (1)
- **Hint Token** — burns through one fog-of-puzzle, reveals one letter or symbol. 3 free per chapter, +1 buyable for 50 Memory Coins.

### Permanent items (Book 1 only)
- **Melo's Lantern** — start item, lights all words
- **Cael's Recipe Book** — auto-completes ingredient sequences (rewards from room 1.4)
- **Cinder Charm** — passive: +1 Memory Coin from fire-themed riddles (earn from room 1.6)

### Deferred to Book 2+
- Word Fragments + Letter Tokens (currencies)
- Charm equip system (max 3 equipped)
- More than 1 consumable type
- Audio + Lateral + Pattern + Spatial+Memory riddle engines as standalone

---

## 7. TECHNOLOGY STACK (LOCKED)

### Runtime libraries (already in repo)

| Library | Version | Role |
|---|---|---|
| Next.js | 16 (App Router) | App framework |
| TypeScript | 5.9 | Lang |
| Pixi.js | 8.17 | Hub + 2 cinematics ONLY |
| GSAP | 3.14 | Tweens + cinematic timelines |
| Howler.js | 2.2 | SFX + music base layer |
| Zustand | latest | Single global store |
| next-intl | latest | i18n (HE primary v1) |
| Tailwind CSS | 3.4 | Styling |

### Runtime libraries (need to add)

| Library | Role | Why |
|---|---|---|
| **framer-motion** | DOM puzzle-room animations | Replaces Pixi for puzzle rooms (round-1 critique fix) |
| **XState** | Per-engine FSMs (3 engines) | Predictable state for riddle solve/fail/hint flows |
| **Tone.js** | Dynamic music behaviors | Lowpass on menu, layer-add near solution (round-2 critique fix) |
| **HTML5 `<video>` element** | Hero character "alive" animation (Melo, Librarian, Cinder, Cael) | **Replaces Live2D for heroes (2026-05-02 zero-GUI pivot)**. 5 short looping `.webm` clips per character (idle / thinking / happy / sad / confused), generated via Runway Gen-4 image-to-video. State-driven clip swap. No rigging required. Mesh-warp-quality smoothness because it's actual video. Lip-sync explicitly out of scope. |
| **Rive** (`@rive-app/canvas`) + **Rive Editor MCP** (Mac Desktop) | UI accents — tile interactions, riddle-solve bursts, inventory drawer, charm activation, achievement unlocks | **Re-instated 2026-05-02** (user override of round-2 drop). State-machine-driven UI animation; significantly more expressive than Lottie for interactive moments. **Rive Editor MCP enables 100% Claude-driven UI animation authoring** — natural language → state machines → preview → autofix. Free for solo dev under Rive Personal plan. |
| **Zod** | JSONB schema validation | Type-safe content layer |

### Backend / data

| Service | Role | Notes |
|---|---|---|
| Supabase | Postgres + Auth + Storage | Already wired |
| **Supabase JSONB tables** | Riddle + dialogue + room config | Hot-reloadable content (round-1 critique fix) |
| **Vercel Edge Config** | Cache hot-reads of JSONB content | <50ms global latency (round-2 critique fix) |
| Railway | Hosting | Already deployed |

### AI + content generation (locked 2026-05-02 after graphics-pipeline test)

| Service | Role | Notes |
|---|---|---|
| **mcp-image (Gemini Nano Banana Pro)** | Hero character stills + room backgrounds + cousin variants | **Primary character/BG generator.** Structured-prompt enhancer delivers cohesion without LoRA training (verified 2026-05-02 graphics-pipeline test — 5 keepers shipped at ~$0.55 total). |
| **fal-ai Flux 2 Pro** img2img | Style-anchored variants (e.g., Cael generated from Cinder anchor) | Use for tight character morph compatibility (redemption-cinematic pairs share body proportions via img2img) |
| **fal-ai Runway Gen-4** image-to-video | **Hero character animation loops + 2 cinematics**. 5 looping `.webm` clips per hero character (idle / thinking / happy / sad / confused) + Vault-entrance cinematic + redemption cinematic. | Multi-shot character consistency from single reference image (95%+ across 10s clips). Output: WebM/MP4. **Replaces Live2D rigging entirely — gives mesh-warp-quality character motion via actual video, fully Claude-automatable.** |
| **rembg `isnet-anime`** | Background removal for sticker characters | **Locked: always pass `-m isnet-anime`.** Default `u2net` mauls cream-white sticker bodies near thick outlines (Cael v4 incident 2026-05-02). |
| **Rive Editor MCP** (Mac Desktop) | Authors UI state machines, micro-interactions, riddle-solve bursts | **Locked 2026-05-02 zero-GUI pivot**. Claude prompts via natural language → Rive Editor builds state machines, renders previews, lints, autofixes. Mac Desktop early access. Requires user keeps Rive Desktop running with sign-in. |
| **ElevenLabs** | Hebrew character dialogue + TTS | **Re-instated 2026-05-02** (user override of doc-locked drop). MCP available. **Lip-sync explicitly out of scope** (2026-05-02) — characters don't sync mouths to phonemes; audio plays alongside generic talking-mouth video clips. |
| **Suno** | Music tracks (Hub, room ambient, redemption swell) | User-generated via Suno; ElevenLabs covers voice. |
| **CassetteAI** via fal-ai | SFX clips (~30, ≤30s each) | Cheap SFX gen |
| Claude / GPT-5 | Story dialogue drafts + riddle authoring helper | Already using |

**Explicitly DROPPED:**
- Lottie / dotLottie (replaced fully by Runway Gen-4 video for heroes + Rive for UI accents)
- **Live2D Cubism + pixi-live2d-display** (dropped 2026-05-02 zero-GUI pivot — Cubism Editor has no API/MCP, requires manual GUI work user explicitly refused. Replaced by Runway Gen-4 video clips for hero animation.)
- **Lip-sync** — dropped from scope 2026-05-02. Characters use generic talking-mouth video loops; audio plays in parallel without phoneme matching. Defer real lip-sync to post-vertical-slice if needed.
- DeepL API (HE-only at launch, no translation needed)
- Midjourney (offered but not adopted — Nano Banana Pro covers character + BG gen via MCP automation)
- LoRA training upfront (Nano Banana Pro structured-prompt enhancer delivers cohesion without it; revisit only if drift appears at scale)
- Pixa.com / nano-live2d / Inochi2D / Spine / DragonBones (evaluated 2026-05-02, none solve our actual rigging need at production quality with zero-GUI requirement)

**Re-instated 2026-05-02:**
- ElevenLabs — user override of round-2 "uncanny-valley risk" lock; ElevenLabs MCP available, Hebrew TTS quality good enough for stylized character dialogue
- Rive — user override of round-2 "$14/mo + inconsistency vs Lottie" lock; resolved by adopting Rive in Lottie's place + Rive Editor MCP enables 100% Claude-driven UI animation authoring on Mac Desktop

### Existing reusable code (LexiClash, ~30k LoC)

| Asset | Path | Use |
|---|---|---|
| Hebrew dictionary 250k words | `fe-next/public/adventure-v2/he-dict.txt` | Word Constraint engine |
| Hebrew final-form normalization | `fe-next/lib/adventure/v2/engine/wordValidator.ts` | Re-export for Word Vault |
| Drag-adjacent input pattern | `fe-next/components/adventure/v2/layers/RuneSlateLayer.ts` | Port for puzzle rooms |
| Mascot library | `fe-next/public/mascot/*.webp` | Brand anchor |
| RTL i18n + chrome mirroring | existing | Already wired |
| Supabase auth + RLS | existing | Already wired |

---

## 7.5 VISUAL LAW + ASSET PIPELINE (locked 2026-05-02)

Locked from graphics-pipeline-test session. Full archive at `docs/word-vault/graphics-pipeline-test-2026-05-02/`.

### Visual law (every Word Vault asset must obey)

1. **THICK black ink outline** (vinyl-sticker weight, ~3-5px depending on asset scale)
2. **Heavy halftone dot shading** on all character bodies and stone surfaces
3. **Cube-character family silhouette** — Melo / Cinder / Cael / Librarian share proportions for redemption-cinematic morph compatibility
4. **Restrained-grief eye treatment** — open eyes with shimmer of unshed tears at corners (Cinder + Melo + Librarian); Cael is the exception with closed-eye joyful hum
5. **Color palette ratio** — 70% deep navy + cobalt-grey + soot black, 20% warm cream highlights, 10% contained ember orange. Characters silhouette against dark BG.
6. **Cael is the visual exception** — pure cream-white + golden aura — he's the *memory of warmth*, not a character in the corrupted world
7. **Style anchor: Cinder.** All other characters cohere to Cinder's craft language (outline weight, halftone density, mood tone)

### Asset locations (reference paths)

| Asset | Path |
|---|---|
| Final hero character stills (with bg) | `docs/word-vault/graphics-pipeline-test-2026-05-02/01-final/` |
| BG-removed PNGs (video-input-ready) | `docs/word-vault/graphics-pipeline-test-2026-05-02/02-bg-removed/` |
| Hero character video loops | `docs/word-vault/graphics-pipeline-test-2026-05-02/03-video-loops/` (Phase next) |
| Rive UI animations | `docs/word-vault/graphics-pipeline-test-2026-05-02/04-rive/` (Phase next) |
| Asset gen prompts archive | `docs/word-vault/graphics-pipeline-test-2026-05-02/README.md` |

### Asset pipeline (locked — 100% Claude-driven, zero GUI)

```
[1] Character/BG gen        mcp-image (Gemini Nano Banana Pro)        Claude-driven via MCP
       ↓
[2] BG removal              rembg -m isnet-anime                       Claude-driven via Bash
       ↓
[3] HERO ANIMATION          fal-ai Runway Gen-4 image-to-video         Claude-driven via fal-ai MCP
   For each character: 5 looping .webm clips
   - idle.webm     (3-5s loop, default state)
   - thinking.webm (triggered: hand to chin, eyes glance up)
   - happy.webm    (triggered: smile bigger, slight bounce)
   - sad.webm      (triggered: eyes downcast, slump)
   - confused.webm (triggered: head tilt, brief shake)
       ↓
[4] CINEMATICS              fal-ai Runway Gen-4 (multi-shot consistency) Claude-driven
   - Vault entrance (Hub → Book 1 transition)
   - Cinder redemption (room 1.6 climax)
       ↓
[5] UI ANIMATIONS           Rive Editor MCP (Mac Desktop)              Claude-driven via Rive MCP
   - Tile interaction state machine
   - Riddle solve burst
   - Inventory drawer
   - Charm pulse (Cinder Charm activation)
   - Achievement unlock
       ↓
[6] AMBIENT FX              Pixi v8 + GLSL shaders                     Claude-written code
   - Embers in Hearth Halls
   - Memory Coin glints
   - Cursor trails
       ↓
[7] MOUNT                   React + HTML5 video + Rive runtime + Pixi  Claude-written code
   Hero state → swap which .webm is playing
   UI events → trigger Rive state machine inputs
   Background → Pixi canvas underneath
```

### Why video clips for heroes (instead of Live2D)

- **Zero GUI work** — user explicitly refused manual Cubism rigging; Live2D has no API/MCP
- **Mesh-warp-quality smoothness** — actual video, no rigging, frame-perfect motion
- **100% Claude-automatable** via fal-ai Runway Gen-4 MCP
- **Same pipeline as cinematics** (already planned for Runway) — no new tools
- **State control** via React clip swap on game-event subscriptions

### Tradeoffs accepted (logged 2026-05-02)

| Lose vs Live2D | Accept because |
|---|---|
| Real-time mesh-warp parameter control | Zero-GUI requirement is hard constraint |
| Per-frame state animation (clips have fixed motion) | 5 states × 4 chars = 20 distinct clips covers all needed states |
| Phoneme-perfect lip-sync | Lip-sync explicitly out of scope (2026-05-02) |
| Tiny model file size | Video clips at low bitrate are acceptable; ~500KB-2MB per clip |
| Industry-validated kawaii character feel (Hoyo etc.) | Runway Gen-4 video looks great; not battle-tested for *this* style but viable |

### Spend ledger

| Phase | Cost |
|---|---|
| Phase 1 (asset gen + bg-removal) — DONE | ~$0.55 |
| Phase 2 (hero video loops, 5 states × 4 chars × ~$2) | ~$40 |
| Phase 3 (cinematics, 2 × ~$5) | ~$10 |
| Phase 4 (Rive UI animations) | $0 (Rive Personal free tier) |
| **Total Book 1 graphics budget** | **~$50-60** |

LoRA training NOT used (Nano Banana Pro structured-prompt enhancer delivers cohesion without it).

---

## 8. ARCHITECTURE

### Module layout (Phase A creates this)

```
fe-next/
├── app/[locale]/word-vault/
│   ├── page.tsx                  ← server component (locale param)
│   └── PageClient.tsx             ← client wrapper
├── app/[locale]/admin/word-vault/
│   ├── page.tsx                   ← admin auth gate
│   └── AdminClient.tsx            ← Zod-validated forms for content authoring
├── components/word-vault/
│   ├── HubFoyer.tsx               ← hub screen (Pixi-rendered)
│   ├── BookMap.tsx                ← chapter map (DOM)
│   ├── RoomShell.tsx              ← root container per room (DOM)
│   ├── riddles/                    ← one component per engine
│   │   ├── WordConstraintRiddle.tsx
│   │   ├── CipherRiddle.tsx
│   │   └── LogicSequenceRiddle.tsx
│   ├── overlays/
│   │   ├── CharacterDialogue.tsx
│   │   ├── MemoryFlashback.tsx
│   │   ├── RedemptionCinematic.tsx
│   │   └── RoomTransition.tsx
│   ├── inventory/
│   │   ├── InventoryDrawer.tsx
│   │   ├── ItemCard.tsx
│   │   └── MemoryCoin.tsx
│   ├── pixi/                       ← Pixi v8: BG + particles + ambient FX
│   │   ├── HubBackgroundScene.ts   ← Hub BG layer (under Live2D)
│   │   ├── HearthBackgroundScene.ts ← Room 1.x BG layer
│   │   └── ParticleLayers.ts        ← embers, ash, golden-aroma particles
│   ├── characters/                 ← HTML5 video character system (state-driven .webm clip swap)
│   │   ├── CharacterVideo.tsx       ← shared <video> wrapper, fades between state clips
│   │   ├── MeloCharacter.tsx        ← state → clip path map for Melo
│   │   ├── LibrarianCharacter.tsx
│   │   ├── CinderCharacter.tsx
│   │   └── CaelCharacter.tsx        ← only used in flashbacks + redemption transition
│   ├── cinematics/                 ← WebM/MP4 video clips (Runway Gen-4 generated)
│   │   ├── VaultEntrance.tsx        ← Hub → Book 1 transition
│   │   └── CinderRedemption.tsx     ← Room 1.6 climax cinematic
│   ├── rive/                       ← Rive .riv state-machine animations (UI accents)
│   │   ├── TileInteraction.tsx      ← idle → hover → tapped → valid/invalid → submitted
│   │   ├── RiddleSolveBurst.tsx     ← multi-stage celebration on solve
│   │   ├── InventoryDrawer.tsx      ← state-driven open/close + item highlights
│   │   ├── CharmActivation.tsx      ← Cinder Charm pulse on fire-themed solve
│   │   └── CousinRedemptionUnlock.tsx ← achievement burst on cousin redeemed
├── lib/word-vault/
│   ├── types.ts                    ← Riddle, RoomConfig, Item, Cousin, GameProgress
│   ├── content/
│   │   └── book1-hearth-stub.ts    ← stub used until JSONB pipeline live
│   ├── engine/
│   │   ├── wordConstraintEngine.ts ← reuses adventure/v2 dictionary + drag-adjacent
│   │   ├── cipherEngine.ts
│   │   ├── logicSequenceEngine.ts
│   │   └── solverHelpers.ts
│   ├── state/
│   │   ├── gameStore.ts            ← Zustand single store
│   │   └── persistence.ts          ← localStorage + Supabase write-through
│   ├── machines/
│   │   ├── riddleMachine.ts        ← XState FSM template
│   │   ├── wordRiddleMachine.ts
│   │   ├── cipherRiddleMachine.ts
│   │   └── logicRiddleMachine.ts
│   ├── audio/
│   │   ├── musicBus.ts             ← Howler music + Tone.js dynamic
│   │   ├── sfxBus.ts
│   │   └── ambientLayers.ts
│   ├── supabase/
│   │   ├── contentClient.ts        ← reads JSONB via Edge Config
│   │   └── progressSync.ts         ← write-through on room-solve
│   └── i18n/
│       └── heFinalNormalize.ts     ← copied from adventure/v2
└── lib/word-vault/__tests__/
    └── (Vitest unit tests per engine)
```

### State management

**Single Zustand store (`gameStore`):**

```typescript
interface GameState {
  // Progress
  currentRoom: string | null;
  solvedRooms: Set<string>;
  redeemedCousins: Set<'cinder' | 'frost-mute' | 'forgotten' | 'ciphermaster'>;

  // Inventory
  memoryCoins: number;
  hintTokens: number;
  permanentItems: ItemId[];
  // (Charm equip system deferred to Book 2)

  // Settings
  locale: 'he';  // EN deferred to v1.5
  reduceMotion: boolean;
  largeText: boolean;
  audioVolume: { music: number; sfx: number };

  // Player choices (story-flavor, no mechanical branching)
  choice_room4_burnRecipe: boolean | null;
  choice_room6_finalLine: 'forgive' | 'remember' | 'farewell' | null;

  // Lexicon (persists across runs)
  uniqueWordsSpelled: Set<string>;

  // Actions
  startNewSession: () => void;
  solveRoom: (roomId: string) => void;  // write-through to Supabase
  earnCoins: (n: number) => void;
  spendHintToken: () => boolean;
  // ...
}
```

**XState per engine (3 instances):** transitions are typed. Each riddle solve/fail/hint event flows through the machine.

```
states:
  ready          (player about to start)
  active         (input accepted)
  validating     (checking solution)
  solved         (success animation playing)
  failed         (cooldown before retry)
  hint-active    (hint token consumed)
  abandoned      (player exits without solving)
```

### Persistence (write-through)

- **localStorage** — immediate write on every state mutation (offline buffer)
- **Supabase** — write-through on these events (NOT debounced):
  - room-solve
  - cousin-redeemed
  - permanent-item-earned
  - settings-changed
- **Vercel Edge Config** — read-cache for JSONB content (riddles, dialogue, room configs). Re-fetched on app start, cached during session.

### Hebrew RTL strategy (PHASE B — pull forward per round-3 critique)

Per Round 3 Reviewer 4: integrate RTL into engines from week 3, not week 6.

- All puzzle rooms render with `dir="rtl"` from start
- Word Constraint engine uses HE letter set + final-form normalization (already proven in adventure/v2)
- Cipher engine: anagram + substitution work in HE; symbol cipher uses shapes/icons (locale-agnostic)
- Logic/Sequence: rhyme text in HE; UI mirrors via existing `next-intl` chrome
- Pixi text: `fontFamily: ['Fredoka', 'Rubik', 'sans-serif']` already proven for HE rendering
- Drag-adjacent input: keyboard bridge collapses HE final-form letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ) via existing util

---

## 9. THE "FEEL ALIVE" SYSTEMS

Locked from Round 2 critique:

| System | Implementation |
|---|---|
| **Reactive mascot** | **HTML5 `<video>` character system** state-controlled — 5 looping `.webm` clips per character (idle / thinking / happy / sad / confused). State driven via Zustand → React clip-swap with cross-fade. Generated via Runway Gen-4 image-to-video. **No rigging required, no GUI authoring, 100% Claude-driven pipeline.** Lip-sync explicitly out of scope. (2026-05-02 zero-GUI pivot — Live2D dropped because Cubism Editor has no API/MCP.) |
| **Idle ambient particles** | Pixi ParticleContainer (max 200 active) in Hub; CSS particles in DOM rooms (lighter). Theme: embers in Hearth Halls. |
| **Letter-tile breathing** | CSS animation, ~3s scale pulse 0.97-1.03 on unselected tiles |
| **Cousin shadow at chapter borders** | Cinder silhouette occasionally glides in Hub background |
| **Failure-as-lore** | 3 distinct wrong-answer character voice lines per riddle room (Suno barks). E.g. Cinder: "Cael wouldn't have…" |
| **Hub visibly changes post-redemption** | Fireplace warms, ash settles, Cael's photo appears on the wall |
| **NPC observational reactivity** | Librarian comments based on solve speed + hints used. ~5 line pools per metric. |
| **"Just exist" room (1.5)** | Cael's Old Kitchen — no puzzle, story breath |
| **Dynamic audio** | Tone.js: lowpass on menu open, layer-add when player is 1 word from solving multi-part puzzle, music-key brightens on success |
| **Micro-interactions** | Tap tile = scale-pop 80ms + tile_tap.wav. Word valid preview = glow pulse. Submit = full word flash. Solve = star burst + chime. |
| **Memory coin glint** | Newly-earned coins rotate + glint until viewed in inventory |
| **Quiet "just exist" beats** | Fade-to-black moments between rooms for 600ms (player can't skip until first viewing) |

### Accessibility (locked, all required)

- Reduce motion → kills parallax + particles
- Large text → +30% font, reflows
- Subtitles for ALL voice + cinematic SFX (with HE captions)
- Slow-mode → +50% timer duration
- Skippable cinematics after first viewing
- Keyboard-nav full focus-visible
- Pixi scenes get DOM mirror with aria-labels for screen readers

---

## 10. PERFORMANCE BUDGET

| Metric | Target |
|---|---|
| FPS floor (mid-Android Galaxy S10) | 50 |
| FPS floor (desktop) | 60 |
| JS heap (in-room) | <120MB |
| Pixi draw calls per frame | <50 (Hub + cinematics only) |
| Active particles | <200 (lower than v3's 500 per round-2 perf concerns) |
| Texture VRAM | <60MB |
| LCP on 4G | <2.5s |
| TTI | <3.0s |
| Audio latency (tap → SFX) | <80ms |
| Time-to-first-room | <1.5s |

Sentry RUM markers on every transition.

---

## 11. 12-WEEK TIMELINE WITH WEEK-8 GATE

| Phase | Weeks | Deliverables |
|---|---|---|
| **A. Foundation** | 1-2 | Module skeleton, types.ts, Zustand single store, XState shells (3 engines), Pixi Hub initial render. **Use subagents per chunk.** |
| **B. 3 engines + Hebrew RTL FROM DAY 1** | 3-4 | Word Constraint (port from adventure/v2), Cipher, Logic/Sequence — all DOM+framer-motion. **Hebrew RTL baked in from start** (round-3 critique fix). |
| **C. Content pipeline** | 5 | Supabase JSONB schema, Zod validators, `/admin/word-vault` Next.js page, Edge Config cache wiring |
| **D. Book 1 content (HE)** | 6-7 | Author 6 rooms in Hebrew with native testers reviewing weekly. **2 weeks instead of 4** thanks to HE-only. |
| **🎯 WEEK 8: VERTICAL SLICE GATE** | 8 | **Internal playtest — 3 rooms (1.1 + 1.2 + 1.3) playable end-to-end with placeholder audio + cinematics. HARD GO/NO-GO gate. If testers don't engage, REVISE before continuing.** |
| **E. Audio + Lottie polish** | 9-10 | Suno music + Hebrew character barks, Tone.js dynamic, CassetteAI SFX, Lottie character animations + 2 cinematics |
| **F. Internal HE playtest** | 11 | 5-10 Israeli testers, refine solve rates, fix friction, polish |
| **G. Public Book 1 demo (HE)** | 12 | Launch on `lexiclash.app/he/word-vault`, PostHog analytics dashboard live |

### Vertical-slice gate criteria (week 8)

PASS if all of these hold across 5+ Israeli testers:
- Solve rate on rooms 1.1+1.2+1.3 ≥ 70% without hints
- Average time-per-room: 2-5 minutes
- 80%+ testers say "I want to see room 4"
- Zero RTL bugs in puzzle interaction
- 0 mid-puzzle crashes / soft-locks

If any fail: revise before authoring rooms 1.4-1.6.

---

## 12. RISKS AND MITIGATIONS

| Risk | Source | Mitigation |
|---|---|---|
| Content iteration speed (weeks 6-9) | Round 3 critic #3 | Strict word/line budgets per room. Hire designer-of-record (or self) to commit to budget. /admin UI for hot-reload. |
| Hebrew RTL bugs in DOM puzzle rooms | Round 3 critic #4 | RTL pulled to Phase B (weeks 3-4). Test EVERY engine in HE before authoring content. |
| Audio-visual sync (weeks 10-11) | Round 3 critic #1 | Treat dynamic Tone.js + Lottie cinematic timing as time-boxed polish; cut to static fallback if behind. |
| AI asset coherence | Round 1 + 2 critics | Image-to-image with `celebration.webp` anchor; manual curation pass on every hero asset. |
| State machine debug nightmare | Round 1 critic #2 | Strict modular XState; one machine per engine; visualizer in dev mode. |
| Content-as-TS bottleneck | Round 1 critic #3 | JSONB content layer in Phase C — designers iterate via /admin. |
| Save corruption | Round 1 critic #1 | Triple-redundant: in-memory + localStorage + Supabase write-through. Versioned schema with migrations. |
| HE-only narrows audience | User override | Acceptable — Israeli testers are real signal. EN comes in v1.5 once loop validated. |

---

## 13. PHASE A — WHAT TO BUILD IN NEXT SESSION

Phase A = **module foundation, no game logic yet**. ~1-2 weeks of work. Subagent-friendly.

### Suggested subagent breakdown

1. **Subagent 1 — Directory + types**
   - Create `lib/word-vault/`, `components/word-vault/`, `app/[locale]/word-vault/` directory tree
   - Write `lib/word-vault/types.ts` with full TypeScript types: `Riddle`, `RoomConfig`, `Item`, `Cousin`, `GameProgress`, `RiddleEngineId`, etc.
   - Stub content: `lib/word-vault/content/book1-hearth-stub.ts` with dummy data matching types
   - Export everything from a barrel `lib/word-vault/index.ts`

2. **Subagent 2 — Zustand store**
   - Write `lib/word-vault/state/gameStore.ts` with full `GameState` interface
   - Write `lib/word-vault/state/persistence.ts` with localStorage write-through
   - Stub the Supabase write path (real Supabase client wiring in Phase C)
   - Vitest unit tests for solveRoom, earnCoins, spendHintToken actions

3. **Subagent 3 — XState shells (3 engines)**
   - Write `lib/word-vault/machines/riddleMachine.ts` (shared FSM template)
   - Write `wordRiddleMachine.ts`, `cipherRiddleMachine.ts`, `logicRiddleMachine.ts`
   - Each handles: ready → active → validating → solved/failed/hint-active/abandoned
   - Vitest tests for state transitions

4. **Subagent 4 — Routing + locale gate**
   - Write `app/[locale]/word-vault/page.tsx` (server component)
   - Write `PageClient.tsx` with `dir={locale === 'he' ? 'rtl' : 'ltr'}` shell
   - Render placeholder "Word Vault" title + Hub mount point
   - Verify `/he/word-vault` returns HTTP 200

5. **Subagent 5 — Pixi Hub initial render**
   - Write `components/word-vault/pixi/HubScene.ts` — Pixi Application with placeholder Librarian sprite + interactive book buttons
   - `components/word-vault/HubFoyer.tsx` — React wrapper that mounts Pixi Application
   - 5 button placeholders: Worldmap / Inventory / Memory Theatre (deferred) / Shop / Settings
   - At minimum: dark navy background + chunky lime title

### Phase A success criteria

- `/he/word-vault` route returns HTTP 200 in dev
- Title + 5 hub buttons render
- TypeScript compiles cleanly (`tsc --noEmit`)
- Vitest passes (~10 unit tests across types/store/machines)
- No game content yet — just the scaffolding

### After Phase A → Phase B

Phase B (weeks 3-4): build the 3 riddle engines as actual playable components. Hebrew RTL baked in from day 1. Each engine gets ONE prototype room (no real content yet, but solvable).

---

## 14. UNBREAKABLE RULES

- **HE-only** at launch. Resist temptation to "just add EN" mid-build.
- **6 rooms**, NOT 8. Resist temptation to add a 7th if pacing feels thin.
- **3 riddle engines**, NOT 4. Memory stays folded into redemption-room recall.
- **Hero characters use HTML5 `<video>` clip-swap** (Runway Gen-4 generated). 5 looping `.webm` clips per character. **Rive for UI accents** (tile interactions, solve bursts, drawer transitions, charm pulses, achievement unlocks). Lottie + Live2D fully dropped. (2026-05-02 zero-GUI pivot.)
- **DOM puzzles + small `<video>` overlay** for character reactions in puzzle rooms allowed. Pixi v8 remains primary for Hub backgrounds + particles + ambient FX layers. (2026-05-02 softened from prior "Pixi only Hub + cinematics".)
- **No rigging tools, no Cubism, no Live2D, no Spine, no DragonBones**. Hero character motion = pre-rendered video clips. State control via React clip-swap. Pipeline must remain 100% Claude-driven via MCPs (no manual GUI work).
- **Lip-sync OUT OF SCOPE** (2026-05-02). Audio plays alongside generic talking-mouth video clips. Defer real lip-sync to post-vertical-slice if later required.
- **Vertical slice at week 8 is a HARD GATE.** If testers don't engage, revise before continuing.
- **All riddles authored in Hebrew first.** EN translation is post-launch.
- **No mechanical branching** for player choices — story-flavor only.
- **Wall sentence is the kill criterion** for every room: "If it changes none, it is the corruption — cut it."

---

## 15. DEPRECATED / ARCHIVED

- Adventure rebuild combat-RPG (`lib/adventure/v2/`) — code remains for reuse (drag-adjacent, dictionary, normalizer); not active in Word Vault routing
- Adventure-v2 prototype routes (`/he/adventure-prototype`, `/en/adventure-prototype`) — keep alive during Phase A-B for code reference; remove during Phase C
- All earlier Adventure design docs:
  - `docs/superpowers/specs/2026-05-01-adventure-rebuild-design.md`
  - `docs/superpowers/specs/2026-05-01-adventure-rebuild-phase1-prototype.md` (plan)
  - `docs/superpowers/specs/2026-05-01-adventure-prototype-playtest-log.md`

These remain in repo for history but **DO NOT inform Word Vault decisions**. This doc supersedes them all.

---

## 16. ONE-PARAGRAPH SUMMARY (for the team-lead-walking-by test)

Word Vault is a 12-week solo + AI-assisted Hebrew-only puzzle-adventure web game where Melo, a marshmallow-cube hero, journeys through 6 rooms of a corrupted Vault to redeem his cousin Cinder by understanding who he was before corruption — solving 3 types of riddles (word constraint, cipher, logic-sequence), making 2 flavor choices, and earning a charm. Built on Pixi + DOM + Lottie + framer-motion + Howler + Tone.js with Supabase JSONB content. Vertical slice at week 8 gates the rest. Story-driven, no combat, no permadeath, no run resets. Differentiated from English-saturated word-roguelike market (Wordlike/Spellatro/Word Play) by being eerie, story-first, HE-native, and Layton-shaped instead of Balatro-shaped.

---

## END OF DESIGN DOC v3.5

Phase A starts in next session. Read this doc, dispatch 5 subagents per the breakdown in section 13, build the scaffold. After Phase A, Phase B (3 engines + RTL baked in) starts.

The wall sentence again, because it matters:

> **"Every room must change what the player understands — about the mechanic, the character, or themselves. If it changes none, it is the corruption — cut it."**
