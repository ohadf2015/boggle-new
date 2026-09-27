# Word Vault — Complete Game Plan for External Critique

> **For the user:** copy this entire file and paste into ChatGPT-5 / Gemini-2.5-Pro / Grok / DeepSeek / Claude (separate session). The document is fully self-contained: story, characters, chapters, every riddle, tech architecture, "feel alive" plan, and critique questions. The reviewing LLM will have everything it needs.

---

# CRITIQUE PROMPT (paste this at the top — sets the LLM's role)

You are a senior game-design + game-engineering reviewer with shipping credits in puzzle-adventure (Layton-likes), narrative roguelikes (Inscryption-likes), and casual mobile word games (Wordlike, Spellatro, Word Play). You also know the technical-art layer cold — Pixi.js, GSAP, Rive/Lottie, audio bus design, mobile WebGL perf budgets.

I'm planning a story-driven puzzle-adventure web game called **Word Vault**. Below you'll find the COMPLETE plan: world, characters, story arc, all 5 chapter outlines with room-by-room detail for Chapter 1, all 8 riddle types with examples, inventory + economy, full tech architecture, the "feel alive" plan, perf budget, risks, and phasing.

**My ask:** tear this apart. Every form of critique welcome — game design, narrative, tech, polish, scope, audience-fit, monetization, accessibility. Be specific, name names, cite real games where their patterns do what mine should.

Format your critique as:
- **Top 5 things that will sink this** (most important kills)
- **Top 3 architecture bombs** (will hurt in 12 months)
- **Top 5 missing "alive and well" details** I should add
- **Top 3 features I should cut** to ship
- **Story / narrative critique** (separate section)
- **Riddle design critique** (separate section)
- **The 1 sentence I should print on the wall**

Don't soften. The goal is to find what's wrong before we commit 10 weeks.

---

# 1. PRODUCT OVERVIEW

**Word Vault** is a single-player web game (Next.js App Router on Railway, mobile + desktop web, future Capacitor Android wrap, iOS later).

**Genre:** story-driven puzzle-adventure. Reference DNA: Professor Layton + Inscryption + escape-room. Bookworm Adventures was the wrong reference — this is NOT a combat-driven word-RPG.

**Core loop:** Player is **MELO**, a sticker-illustrated marshmallow-cube mascot. Travels chamber-by-chamber through a corrupted Vault. Each chamber has a **room** containing a **riddle**. Solving the riddle advances the story, unlocks rooms, drops items, accumulates an inventory. Bosses are story-redemption moments, not fights.

**Riddle variety:** ~8 types — word constraint puzzles, cipher decoding, logic/sequence (lever orders), memory (recall after flash), spatial (slide tiles), audio (melody match), lateral riddles, pattern recognition.

**Structure:** 5 "books" × 8-10 rooms each = ~50 rooms total. Linear progression with mild branching inside chapters. NO permadeath. NO run resets. Every solved room is permanent.

**Hero arc:** redeem 4 corrupted "cousin" mascots (each a chapter "boss") by *understanding* them through story-riddles, not by fighting them. Final chapter confronts the source of corruption.

**Tone:** eerie fairytale. Whimsical-but-melancholy. Inscryption-meets-Layton mood.

**Locales:** English + Hebrew (RTL) primary v1. Swedish + Japanese + Spanish later. Localized via existing `next-intl` + `i18n/` infrastructure.

**Tech:** runs on the existing LexiClash codebase (~30k LoC) which already has Pixi.js 8.17, GSAP 3.14, Howler 2.2, Zustand, Supabase, Vitest+Jest+Playwright, full 5-locale i18n, dictionary trie, word validators, and the mascot asset library.

**Audience:** casual mobile players, word-game fans wanting a story format, puzzle gamers, Layton fans who never tried word games.

**Monetization (post-MVP):** Chapter 1 free (~90 min demo); all-chapters bundle ~$5-10 IAP.

---

# 2. THE WORLD — LORE & SETTING

## Origin myth

In the beginning, the **Marshmellow Realm** was a gentle, sticky, warm land where words held physical power. Letters were tangible — picked up like flowers, arranged into spells. The realm's heart was **THE WORD VAULT**, a many-chambered library carved into a vast cube-shaped mountain.

The Vault was tended by the **Five Cousins** — five marshmallow-cube siblings born from the same first word. Each carried one of the five Letter-Songs that bound the Realm together.

Deep in the Vault, sealed behind 1,000 locks, was **THE TWIN VOICE** — a forbidden tome with two mouths. Its book spoke not in words, but in *contradictions*. Anyone who heard it began to forget which mouth was true.

## The Fall

One eve, the youngest cousin **VEX** found the seal weakening. Curious as always, Vex peeked. A whisper escaped. By morning, four cousins were CHANGED:

- **CAEL** the warm-hearted, who tended kitchen fires, became **THE CINDER** — consumed by hunger, charred cube wreathed in lava-cracks.
- **SILVA** the gentle one, who whispered everyone to sleep, became **THE FROST-MUTE** — frozen in her own silence, locked in cracking ice.
- **HARO** the elder, keeper of the Vault's stories, became **THE FORGOTTEN** — rotting away, memories leaking out as moss and cobwebs.
- **VEX** herself, the playful trickster, became **THE CIPHERMASTER** — half-dissolved into glitching letters and numbers.

Only one cousin remained whole: **MELO**, the middle sibling — neither youngest nor eldest, neither loudest nor quietest. The keeper of *balance*. Whatever quirk of being-in-the-middle protected him.

## The Quest

Melo wakes to find his four cousins sealed in their corrupted chambers. The Vault's central staircase is broken; he must travel **down**, chamber by chamber, gathering Word Fragments to repair the path that leads to the Twin Voice itself.

**The player plays as Melo.**

## Theme

It's NOT about defeat. It's about **understanding**. Melo doesn't fight his cousins. Each chapter ends with a special story-riddle that proves Melo *knows* who that cousin was before corruption — and the knowing is what redeems them.

---

# 3. CHARACTERS

## Heroes / NPCs

### MELO (player character)
- Cream-white marshmallow cube
- Pink blush, tiny black dot eyes (matches LexiClash brand mascot — sticker-illustrated 2D, NOT 3D-rendered)
- Calm, observant, a quiet kindness
- Speaks in short, simple sentences
- Carries a small wooden lantern that lights up letters in the dark

### THE LIBRARIAN (NPC, hub)
- An elder cousin who escaped to the surface
- White marshmallow with reading-glasses + tiny scholar's cap
- Provides hints, lore, item shop
- Calls Melo "little keeper"

### THE WICK (NPC, recurring)
- A small living candle (not a marshmallow)
- Found mid-chapter; can re-light cursed letters
- Comic relief
- Voiced as a tiny crackling flame

## The Four Corrupted Cousins (chapter "bosses" — actually redemption arcs)

### Book 1: THE CINDER (formerly CAEL)
- Charred-black cube with glowing lava-crack body, spiked iron crown
- Eyes: angry red embers (still cute proportions, not horror)
- **Was:** warm-hearted cook who fed everyone, knew every recipe by heart
- **Is:** hungry, raging, but flashes of his old self when offered the right ingredients
- **Domain:** *The Hearth Halls* — burned-down kitchen, ash-covered counters, embers in air

### Book 2: THE FROST-MUTE (formerly SILVA)
- Marshmallow encased in cracked ice, blue tint, frozen tears, icicle horns
- Eyes: pale-cyan, sad-evil frown
- **Was:** gentle, whispered everyone to sleep with bedtime stories
- **Is:** cannot speak, communicates through frozen letters that crack and fall
- **Domain:** *The Lullaby Vault* — frozen library, ice-locked storybooks, snow falling indoors

### Book 3: THE FORGOTTEN (formerly HARO)
- Decayed cube with moss, cobwebs, missing chunks, hollow sunken eyes glowing sickly green
- **Was:** keeper of the Vault's stories, knew every soul's name
- **Is:** forgets mid-sentence, asks the same question three times, weeps softly
- **Domain:** *The Forgetting Wing* — overgrown library where books rewrite themselves; pages crumble at touch

### Book 4: THE CIPHERMASTER (formerly VEX)
- Pixelated/glitching cube, half-dissolved into letters & numbers, magenta corruption artifacts
- Eyes: flickering ERROR screens
- **Was:** playful trickster who left riddle-notes for everyone
- **Is:** speaks only in ciphers and substitutions; can't remember plain language
- **Domain:** *The Cipher Atrium* — geometric room of rotating glyph-walls; runes float and re-arrange

## The Final: THE TWIN VOICE (Book 5)
- Two mirrored marshmallows conjoined back-to-back
- One side smiles sweetly (kawaii), one side grins malevolently (fanged)
- Prismatic crown floating above, inverted-color body
- Speaks with two contradicting mouths simultaneously
- The corrupting book itself, given form
- **Domain:** *The Mirror Sanctum* — recursive room of infinite mirrors, each a different "what-if Melo was corrupted instead"

---

# 4. GAME STRUCTURE

## Macro

```
HUB (Library Foyer)
  │  ─ Talk to Librarian (hints, lore)
  │  ─ Inventory check (items, charms, fragments, coins)
  │  ─ Shop (spend Memory Coins → Hint Lanterns / Rewind Hourglasses / Wick Sparks)
  │  ─ Memory Theatre (replay collected story flashbacks)
  │
  ├─ BOOK 1: The Hearth Halls (THE CINDER) — fire/cooking theme
  ├─ BOOK 2: The Lullaby Vault (THE FROST-MUTE) — silence/ice theme
  ├─ BOOK 3: The Forgetting Wing (THE FORGOTTEN) — memory/decay theme
  ├─ BOOK 4: The Cipher Atrium (THE CIPHERMASTER) — code/geometry theme
  └─ BOOK 5: The Mirror Sanctum (THE TWIN VOICE) — final confrontation
```

Books unlock sequentially; book 5 requires gathering 4 redeemed Letter-Songs (one per cousin redemption).

## Per-book template (8-10 rooms)

1. **Threshold room** — establishes theme, easy intro riddle. Cousin appears in shadow.
2. **Riddle Room A** — first proper puzzle, teaches book's signature mechanic.
3. **Memory Coin Room** — small story flashback unlocked by completing a riddle.
4. **Riddle Room B** — different mechanic, slightly harder.
5. **Item Vault** — earn the chapter's signature collectible item.
6. **Riddle Room C** — combines mechanics from A + B.
7. **Cousin's Quarters** — non-puzzle, story room. Cousin's shadow narrates a memory.
8. **Riddle Room D** — hardest puzzle, gates the final room.
9. **(Optional) Riddle Room E** — bonus puzzle for completionists.
10. **Redemption Chamber** — story-riddle that proves Melo *understands* the cousin. Resolves with cinematic.

## Macro pacing

- Whole game: ~6-10 hours
- Each book: ~60-90 minutes
- Each room: 3-10 minutes (varies by riddle type)
- Save anywhere. Quit anywhere. Resume anywhere.

---

# 5. THE 8 RIDDLE TYPES — WITH EXAMPLES

## Type A — Word Constraint
Player drag-spells a word from a tile slate (Boggle-style adjacency). **Constraint** modifies the rule.

Examples:
- "Spell a 5-letter word"
- "No vowels allowed"
- "Word must contain Q"
- "Use ONLY tiles in the diagonal"
- "Spell 3 words in a row without repeating a letter"

Engine reuses the v2 prototype's drag-adjacent input + dictionary trie. Locale-aware (en + he base-form Hebrew).

## Type B — Cipher / Substitution
Decode a hidden message.

Examples:
- Caesar shift: `DPEF JT GVO` → `CODE IS FUN` (shift -1)
- Symbol-letter substitution: ☆=A, ♦=E, ♥=R, etc.
- Anagram unscramble: `TASE` → `EATS` / `TEAS` / `SEAT`

UI: tile-rotate to "decode" each letter. Real-time preview.

## Type C — Logic / Sequence
Pull levers / press buttons / open locks in correct order.

Examples:
- "Open levers based on a rhyme: green first, gold last, pink between but not blue"
- "Light four candles in the order they were extinguished in the diary"
- "Press the four chimes in the order their pitches descend"

UI: chunky tap-to-toggle controls. Real lever pull animation. Wrong-order resets.

## Type D — Memory
Letters/symbols flash for ~3 seconds, then must spell or arrange from memory.

Examples:
- "Recite the 5 letters in correct order"
- "Place 4 candles where they used to stand"
- "Arrange the books in the order they were on the shelf"

UI: Pixi flash + countdown + empty input slots. Memory-based; gentle on time pressure.

## Type E — Spatial
Move tiles, fit shapes, complete a path.

Examples:
- "Slide letter blocks until the path spells a word top-to-bottom"
- "Rotate a tile-grid so all matching letters are adjacent"
- "Fit 5 puzzle pieces into the keyhole shape — only one rotation works"

UI: drag-and-snap. Visual feedback when piece is "close enough."

## Type F — Audio (Suno-generated melodies)
Listen → identify / match.

Examples:
- "Three lullabies played; which belongs to which cousin?"
- "Match the rhythm with the correct sequence of tile taps"
- "Hum the missing 4th note — pick from 4 options"

Implementation: short audio sprites via Howler. Subtitled for accessibility.

## Type G — Lateral Thinking / Riddle-as-text
Read a riddle, pick the correct answer from 3-4 options.

Examples:
- "I have keys but open no locks. I have space but no room. What am I?" → KEYBOARD
- "I am light but I cannot be lifted." → LANTERN
- "What word becomes shorter when you add two letters to it?" → SHORT (add "er")

UI: text-only with elegant typography. No tile manipulation needed.

## Type H — Pattern Recognition
Find the odd one out / next in sequence.

Examples:
- "Which doesn't belong: APPLE, BREAD, CHEESE, CURRY, DUMPLING?" (only DUMPLING isn't bake-related)
- "Complete the pattern: A B D G ?" (skip 1, skip 2, skip 3 → answer K)
- "Which symbol appears in 4 of 5 rooms in this chapter?" (callbacks to earlier rooms)

UI: side-by-side comparison view, tap to select.

**Distribution per chapter:** each book has ~6-8 riddles spread across ≥4 of the 8 types. Book signature mechanic dominates; variety enforced.

---

# 6. INVENTORY & ECONOMY

Inventory persists across the whole run. No resets. Some items are story-gates; some are consumables.

## Currencies

- **MEMORY COINS** (gold) — earned by clearing rooms (10-30 each, more for perfect solves). Spent at Librarian's shop on consumables.
- **WORD FRAGMENTS** (purple shards) — earned at the redemption chamber of each book. Required to unlock next book.
- **LETTER TOKENS** (rare, lime sparkle) — Q, X, Z, J letters, insertable as wildcards in any word puzzle.

## Consumables (use once, refresh in shop)

- **HINT LANTERN** — burns through one fog-of-puzzle, reveals one letter or symbol
- **REWIND HOURGLASS** — undo last 3 moves on a sequence puzzle
- **WICK SPARK** — relight a single cursed letter (if puzzle locks letters)

## Permanent items (story-gated)

- **MELO'S LANTERN** — start item, lights all words
- **CAEL'S RECIPE BOOK** (after Book 1) — auto-completes ingredient sequences
- **SILVA'S LULLABY SHEET** (after Book 2) — passes audio riddles by humming the correct tune
- **HARO'S DIARY** (after Book 3) — re-reads memory rooms, reveals lore
- **VEX'S CIPHER WHEEL** (after Book 4) — auto-decodes one cipher per book
- **THE TWIN KEY** (final) — opens the Mirror Sanctum

## Charms (passive effects, max 3 equipped)

- **CINDER CHARM** (after Book 1) — extra Memory Coin from each fire-themed riddle
- **FROST-MUTE CHARM** — once per chapter, freeze a timer for 5 sec
- **FORGOTTEN CHARM** — re-read any past riddle's hint
- **CIPHER CHARM** — auto-show first letter of any cipher
- **TWIN CHARM** (after final) — unlocks New Game+ mode with harder riddle variants

---

# 7. CHAPTER 1 — DETAILED ROOM-BY-ROOM SCRIPT

## Theme: *The Hearth Halls*

Burned-down kitchen. Embers floating. Charred recipe books. Faint smell of cinnamon underneath the smoke. Music: Suno-composed slow accordion + crackling fire ambience. SFX: ember pops, paper-crinkle, distant sizzling.

## Cousin: THE CINDER (formerly CAEL)
- Mood: enraged but flickers of warmth
- Speaks in short barked phrases ("HOT! HUNGRY! BURN!")
- Old self appears in flashbacks: a soft-spoken cook humming while stirring a pot

## Room-by-room

### Room 1.1 — THRESHOLD: *The Cracked Door*
**Type:** Word Constraint (intro tutorial)
**Setup:** Burnt wooden door. Only 4 tiles visible: F-I-R-E (glowing orange).
**Riddle:** "Drag the tiles to spell a word. Open the door."
**Solution:** Spell FIRE → door opens.
**Story beat:** Melo enters, lantern lights up. Distant roar. Cinder calls out: "GO BACK, LITTLE ONE!"
**Earn:** First MEMORY COIN, controls intro.

### Room 1.2 — RIDDLE A: *The Recipe Wall*
**Type:** Sequence + Word Constraint
**Setup:** Six fading recipe cards on a wall, each missing an ingredient. Cards are out of order.
**Riddle:** Arrange cards in order using the hint rhyme + spell each missing ingredient.
**Hint rhyme:** "First we boil, then we knead, last we bake — that's all we need."
**Solution:** Order: BOIL → KNEAD → BAKE; missing words: WATER, FLOUR, BREAD.
**Story beat:** As cards align, faint humming melody plays — Cael's old cooking song.
**Earn:** 2 Memory Coins + flashback fragment ("Cael once cooked for the whole Realm").

### Room 1.3 — MEMORY COIN ROOM: *The Burnt Diary*
**Type:** Lateral riddle / dialogue
**Setup:** Blackened diary on a stove. Click to read 4 entries; each is a riddle from Cael's past.
**Riddle:** "What rises when you knead it, falls when you slice it?" → BREAD.
**Solution:** Pick correct answer from 4 options.
**Story beat:** Each correct answer reveals a sentence of Cael's old self ("I cook because the Realm needs warmth, and warmth is just love made warm").
**Earn:** Memory Coin + Cael flashback unlocked in Memory Theatre.

### Room 1.4 — RIDDLE B: *The Cipher Pantry*
**Type:** Cipher (substitution / anagram)
**Setup:** Pantry of jars; each label is a scrambled ingredient name.
**Riddle:** Unscramble: `RUGAS` / `RUFLO` / `TAESM` / `GAOR`.
**Solution:** SUGAR, FLOUR, STEAM, ROAR (last is a red herring; identify it).
**Story beat:** When 3 correct labels are placed, the pantry door opens.
**Earn:** Q-LETTER TOKEN + Memory Coin.

### Room 1.5 — ITEM VAULT: *The Smouldering Vault*
**Type:** Logic / sequence (lever puzzle)
**Setup:** 4 levers labeled with cooking utensils (KNIFE, POT, FORK, OVEN). Pull in correct order based on a rhyme.
**Hint rhyme:** "First it heats, then it slices, then it lifts, then it serves."
**Solution:** OVEN → KNIFE → FORK → POT.
**Story beat:** Vault opens, reveals **CAEL'S RECIPE BOOK** — first permanent item.
**Earn:** Cael's Recipe Book (auto-completes future ingredient sequences).

### Room 1.6 — RIDDLE C: *The Fire-Pit Match*
**Type:** Word + spatial hybrid
**Setup:** 4×4 tile slate where each tile is an ingredient name. Drag a path through tiles whose first letters spell a chant: F-E-A-S-T.
**Solution:** Path through FIG → EGG → APPLE → SPICE → THYME.
**Story beat:** Fire pit lights, Cael's voice softens for a moment ("a feast... I remember...").
**Earn:** Memory Coin.

### Room 1.7 — COUSIN'S QUARTERS: *Cael's Old Kitchen*
**Type:** Story-only (no riddle)
**Setup:** A cleaned, untouched kitchen frozen in time before the corruption.
**Action:** Walk through; click 5 objects (apron, ladle, cookbook, hat, photograph) to read short memories.
**Story beat:** The fifth object — a family photo — shows all 5 cousins together. Melo sheds a tear.
**Earn:** WORD FRAGMENT (1 of 4 needed for redemption).

### Room 1.8 — REDEMPTION CHAMBER: *The Last Recipe*
**Type:** Hybrid (memory + word + emotional choice)
**Setup:** Cinder appears, ENRAGED and RAVENOUS. He demands a meal.
**Riddle:** "Cook" by spelling 3 ingredient words IN ORDER — the order Cael used to make his signature dish (revealed via Memory Coins gathered earlier).
**Solution:** WATER → FLOUR → HONEY. Each correct word makes Cinder calmer; a softer voice cuts through. Third correct word: he transforms back into Cael for a moment, weeps, hugs Melo, then vanishes — leaving his Recipe Book + Letter-Song.
**Story beat:** Cael's redemption cinematic. He says: "Thank you, brother. Find the others. They are scared too."
**Earn:** CINDER CHARM (passive: +1 Memory Coin from fire-themed riddles), 1st of 4 Letter-Songs, Cael's Recipe Book fully unlocked.

**Chapter 1 estimated playtime: 60-90 min.**

---

# 8. CHAPTERS 2-5 — OUTLINES

## Book 2 — *The Lullaby Vault* (THE FROST-MUTE / SILVA)
- **Theme:** Frozen library, falling snow, lullaby music boxes
- **Signature mechanic:** Audio + memory puzzles. Melodies play; player matches.
- **Item earned:** Silva's Lullaby Sheet (passes audio riddles)
- **Charm earned:** Frost-Mute Charm (freeze a timer once per chapter)
- **Sample rooms:**
  - Room 2.1: Threshold — match 3 chimes to their cousins (audio)
  - Room 2.4: Memory — recall 5 letters that flashed in melody order
  - Room 2.7: Cousin's Quarters — Silva's bedroom, music box plays unfinished lullaby
- **Redemption:** Compose Silva's bedtime lullaby by arranging 5 melody-tiles in correct order. When played correctly, ice cracks; Silva returns.

## Book 3 — *The Forgetting Wing* (THE FORGOTTEN / HARO)
- **Theme:** Overgrown library, books rewriting themselves, moss everywhere
- **Signature mechanic:** Memory rooms (letters flash, recall) + lateral-thinking riddles where the question changes mid-puzzle
- **Item earned:** Haro's Diary (re-reads any past memory)
- **Charm earned:** Forgotten Charm (re-read any hint)
- **Sample rooms:**
  - Room 3.2: a riddle whose question text fades letter-by-letter; you must answer before it's gone
  - Room 3.5: classic memory grid — 12 tiles, find 6 matching pairs (with a twist: pair definitions, not images)
  - Room 3.8: the deepest room — riddle requires recalling a fact from Room 3.2 that the player has presumably forgotten
- **Redemption:** Re-tell Haro's most-loved bedtime story. Player reconstructs it from memory fragments scattered across earlier rooms. He smiles, "ah… that was a good one," and rests.

## Book 4 — *The Cipher Atrium* (THE CIPHERMASTER / VEX)
- **Theme:** Geometric room of rotating glyph-walls, magenta glitch effects
- **Signature mechanic:** Cipher + spatial + pattern riddles. Walls rotate; player decodes shifting messages.
- **Item earned:** Vex's Cipher Wheel (auto-decode one cipher per book)
- **Charm earned:** Cipher Charm (show first letter of any cipher)
- **Sample rooms:**
  - Room 4.3: Caesar shift cipher with rotating glyph wheel
  - Room 4.6: pattern riddle — 5 shapes appear; pick the next one
  - Room 4.8: nested cipher — outer cipher decodes to a riddle, inner riddle decodes to the answer
- **Redemption:** Solve Vex's playful "ultimate riddle" she left for Melo BEFORE the corruption — found in Book 1 as a sealed envelope, unsealed in Book 4. Riddle is layered: cipher + word + lateral. Solving brings Vex back.

## Book 5 — *The Mirror Sanctum* (THE TWIN VOICE)
- **Theme:** Recursive infinite-mirror room. Each mirror shows a different "what-if Melo was corrupted instead." Music: distorted lullaby + warped recipe theme + frozen choir + glitched voices layered.
- **Signature mechanic:** Player must use ALL 4 redeemed siblings' powers — each riddle requires a different one of the items earned.
- **Sample rooms:**
  - Room 5.2: requires Cael's Recipe Book to autocomplete a fire-themed sequence
  - Room 5.4: requires Silva's Lullaby Sheet to identify a melody buried in noise
  - Room 5.6: requires Haro's Diary to recall a fact from Book 1
  - Room 5.7: requires Vex's Cipher Wheel to decode the final riddle
- **Final riddle:** The Twin Voice asks Melo a question with TWO contradicting "true" answers. Player must answer with BOTH simultaneously — by spelling two valid words on a split slate (one half = the literal-true answer, other half = the kind-true answer). Both must be valid, both must contradict, both must be Melo's choice.
- **Outcome:** Twin Voice cracks; siblings reappear; Vault is restored. Closing cinematic.

---

# 9. UI / UX FLOW

## Screen sequence (in order of player encounter)

1. **Splash / Title** — animated WORD VAULT logo with corrupted edges flickering
2. **Hub Foyer** — Librarian, Memory Theatre, Shop, Inventory, Book selection (Books 2-5 locked initially)
3. **Book Map** — vertical scroll showing 8-10 rooms of the current book with star ratings, current room highlighted
4. **Room** — full-screen Pixi scene with the puzzle
5. **Memory Theatre** — replay collected story flashbacks (text + still art + voice-over)
6. **Shop** — spend Memory Coins on consumables
7. **Inventory** — view items + charms; equip up to 3 charms
8. **Settings** — language, audio, accessibility
9. **Pause overlay** — accessible from any room

## Star-rating per room

3 stars per room: 1 for solving, 1 for solving fast (chapter-relative), 1 for solving without hints. Replayable for max stars.

## Tutorial threading

NO tutorial wall. Mechanic taught in the room itself via constraint design (Baba Is You / Knotwords approach):
- Room 1.1 introduces tile-drag in the simplest possible context (only 4 tiles, only 1 valid word)
- Room 1.2 introduces sequence-ordering
- Room 1.4 introduces cipher mechanic
- And so on — one new mechanic per room

---

# 10. TECH STACK

| Concern | Library | Why |
|---|---|---|
| App framework | Next.js 16 App Router | Already on it; SSR + dynamic routes |
| Canvas rendering | **Pixi.js 8.17** | High-perf 2D, WebGL+WebGPU, mature |
| Tween / timeline | **GSAP 3.14** | Best-in-class easing + sequencing |
| Skeletal cinematic | **Lottie** (free) | Exported After Effects scenes |
| Reactive characters | **Rive** ($14/mo) | State-machine driven mascot moods |
| Audio | **Howler 2.2** | Cross-browser sprite support |
| State (global) | **Zustand** | Lightweight, persistable |
| State (riddle FSM) | **XState** | Each riddle has clean state-machine |
| Persistence | **localStorage** + **Supabase** | Tier-2 cloud sync |
| i18n | **next-intl** + ICU MessageFormat | Already wired, 5 locales |
| Testing | Vitest + Jest + Playwright | Already wired |
| Telemetry | Sentry + PostHog | Already wired |

## Asset pipeline (NOT generating yet, decided)

- **Sprites + backgrounds:** fal-ai Flux 2 Pro (image-to-image with existing mascot file as visual anchor — locks brand consistency)
- **Music:** user-generated via Suno (5 chapter themes + hub + redemption stinger)
- **SFX:** CassetteAI Sound Effects via fal-ai (~30 clips, ≤30s each)
- **Voice (optional v1):** ElevenLabs API (narration + cousin barks); deferred unless API key exists in env
- **Cinematic moments:** Lottie .json for stamp intros; Rive .riv for reactive mascot states

---

# 11. ARCHITECTURE

## Module layout

```
fe-next/
├── app/[locale]/word-vault/
│   ├── page.tsx                  ← server component
│   └── PageClient.tsx            ← client wrapper
├── components/word-vault/
│   ├── HubFoyer.tsx              ← hub screen
│   ├── BookMap.tsx               ← chapter map
│   ├── RoomShell.tsx             ← root container for a single room
│   ├── riddles/                   ← one component per riddle type (8)
│   ├── overlays/                  ← cinematic + transition layers
│   │   ├── CharacterDialogue.tsx
│   │   ├── MemoryFlashback.tsx
│   │   ├── RedemptionCinematic.tsx
│   │   └── RoomTransition.tsx
│   ├── inventory/                 ← drawer, item cards, charms
│   └── pixi-scenes/               ← Pixi-side renderers
├── lib/word-vault/
│   ├── types.ts                   ← Riddle, RoomConfig, Item, Cousin, Charm
│   ├── content/                   ← per-chapter authored data
│   │   ├── book1-hearth.ts
│   │   ├── book2-lullaby.ts
│   │   ├── book3-forgetting.ts
│   │   ├── book4-cipher.ts
│   │   └── book5-mirror.ts
│   ├── engine/
│   │   ├── riddleStateMachine.ts  ← XState definition
│   │   ├── inventoryEngine.ts
│   │   ├── progressionGate.ts
│   │   └── solvers/                ← shared solver utilities
│   ├── state/
│   │   ├── gameStore.ts            ← Zustand: progress, inventory, settings
│   │   ├── runtimeStore.ts         ← transient state
│   │   └── persistence.ts
│   ├── audio/
│   │   ├── musicBus.ts
│   │   ├── sfxBus.ts
│   │   └── ambientLayers.ts
│   └── animation/
│       ├── lottiePlayer.ts
│       ├── rivePlayer.ts
│       └── gsapTimelines.ts
└── public/word-vault/              ← static assets, lazy-loaded by chapter
```

## State management — two-store split

**`gameStore` (Zustand, persisted via localStorage + Supabase):**
- `progress: { currentBook, currentRoom, solvedRooms: Set, redeemedCousins: Set }`
- `inventory: { coins, fragments, items[], charms[], equippedCharms[] }`
- `settings: { locale, audio, accessibility }`
- `lexicon: { uniqueWordsSpelled: Set, milestonesUnlocked }`

**`runtimeStore` (Zustand, NOT persisted):**
- `currentRiddleId: string | null`
- `riddleFsmState: FsmState`
- `dialoguePending: DialoguePayload | null`
- `cinematicInFlight: CinematicId | null`
- `inputLocked: boolean`

## Riddle state machine (XState, per riddle)

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

Each riddle type provides its own `solve(input)` function but shares the FSM shell.

## Pixi scene graph

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

DOM/React layer overlays Pixi for: dialogue boxes, inventory drawer, hint UI, settings. `pointer-events: none` on canvas; React UI on top.

## GSAP + Pixi ticker — single-clock pattern

Pixi `Ticker` is the game-clock. GSAP runs on its own RAF (browser-native). For cinematic timing, `gsap.timeline()` with explicit durations. Pixi's `app.ticker.speed = 0.5` for slow-mo.

## Audio architecture (Howler)

3 buses with ducking:
- **Music bus** (single track, crossfaded between chapters, ~30-60s loops)
- **SFX bus** (interactive sounds, sprite-loaded for low latency)
- **Ambient bus** (chapter-specific atmosphere)

Music ducks 30% during dialogue. SFX has its own pool (3 instances per critical SFX to avoid retrigger cutoff).

## Persistence

**Tier 1 — localStorage** (immediate writes): every gameStore mutation writes JSON snapshot. Survives reload + offline.

**Tier 2 — Supabase** (debounced + on milestones): sync on chapter complete, item earned, room solved, settings change. 30-second debounce for low-priority writes. Conflict resolution: last-write-wins per key.

## Localization

- All player-facing strings via `t('word-vault.<chapter>.<room>.<key>')`
- Chapter content authored as TypeScript objects with locale keys baked in
- RTL: chrome mirrors automatically; Pixi scenes don't mirror — Hebrew text inside Pixi auto-handles bidi via platform text rasterizer

---

# 12. THE "FEEL ALIVE" PLAN

This is the user's central concern. Every section here exists to make the game feel responsive, breathing, present.

## A. Reactive mascot state machine (Rive)

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

Implementation: Rive .riv file with state machine. React component subscribes to game events + sets Rive inputs. ~100KB, runs at 60fps.

NPCs (Librarian, Wick) get the same treatment — each their own Rive file with 3-5 states.

## B. Idle ambient life

Even when the player isn't doing anything, the room has motion:

- **Particles:** every chapter has its signature ambient (embers / snow / dust motes / glitch artifacts / mirror shards). ~50 particles max, ParticleContainer.
- **Background parallax:** 3 layers per room, slow drift. Gives depth.
- **Lantern flicker:** Melo's lantern flickers warm light periodically.
- **Letter-tile breathing:** unselected tiles in word puzzles have a gentle ~3-second scale pulse (0.97-1.03×) so the slate never looks "dead."
- **Cousin shadow at chapter borders:** the cousin's silhouette occasionally glides in the background — a teasing presence even before the redemption room.
- **Memory coins glint:** newly-earned coins have a slow rotation + glint sweep until viewed in inventory.

## C. Micro-interactions everywhere

Every player action gets felt feedback within 50ms:

| Action | Visual | Audio |
|---|---|---|
| Tap tile | Scale-pop 1.15→1.0 in 80ms | tile_tap.wav (3 random variants) |
| Drag continues | Lime trail line follows finger | tile_continue.wav (subtle pitch up) |
| Drag back to undo | Tile scale-down 0.9 with sad bend | tile_undo.wav |
| Word valid (preview) | Tile glow pulse, dmg counter ticks | (silent) |
| Word submit valid | Whole word flash + projectile if combat | word_submit.wav |
| Word submit invalid | Glyph shake-x 6 frames, red flash | word_invalid.wav |
| Riddle solved | Gold star burst + ROOM CLEARED banner | solved_chime.wav |
| Item earned | Item flies to inventory icon, drawer pulse | coin_drop.wav |
| Hint lantern used | Fog parts in 1s sweep, hint reveals | hint_chime.wav |
| Cousin appears | Silhouette darkens, ambient music swells | cousin_voice_growl.wav |

GSAP timelines for every animation. Reusable factory functions.

## D. Transitions never feel abrupt

- **Room → room:** 600ms crossfade with Pixi scene swap. No instant cut.
- **Hub → book:** zoom-in animation, book opens, page-turn sound, pause, transition.
- **Riddle solved → next room:** triumph pose + 500ms hold, door opens with creak sfx, walk-through.
- **Cousin redemption:** 5-8 second cinematic. Camera zooms, music swells, color shifts to redemption-tone, Lottie character animation plays. Unskippable on first viewing, skippable on replay.

## E. Sound layering — depth without overload

5 layers:
1. **Chapter music** (always playing, lowpass on idle)
2. **Ambient loop** (chapter-specific: fire crackle, ice wind, paper rustle)
3. **Interactive SFX** (player actions)
4. **Narrative stingers** (cousin appearances, redemption moments)
5. **Voice/narration** (where used)

When dialogue plays, layers 1+2 duck 30%. When cinematic plays, 1+2 fade out and replaced with cinematic music.

Rule: no two layers occupy the same frequency band.

## F. Accessibility = respect

- **Reduce motion** — kills all parallax, particles, screen shake. Solid color background.
- **Color-blind palette** — protanopia / deuteranopia / tritanopia presets via shader filter.
- **Large text** — bumps font size 30%, reflows.
- **Subtitle / closed-caption** — for ALL voice + cinematic SFX.
- **Slow-mode** — timed riddles get +50% duration.
- **Skip cinematics** after first viewing.
- **Keyboard navigation** — full focus-visible support, ARIA live regions for game events.
- **Screen reader** — Pixi-rendered scenes get DOM mirror-content with aria-labels.

## G. Persistence that respects the player

- Save after EVERY meaningful action (room solved, item earned, dialogue advanced).
- Resume EXACTLY where the player left — including which dialogue line was visible.
- "Continue" button on splash takes you straight back, no menu navigation.
- Cloud-sync silent in background.

## H. Fail states that don't punish

- No HP, no permadeath in puzzle rooms.
- Wrong answer = small wobble + soft buzz, no progression loss.
- Hint Lantern available after 3 wrong attempts.
- "I'm stuck" button after 5 minutes of inactivity — Librarian appears, offers free hint.
- Even chapter "boss" redemption can't be lost. If the player struggles, the cousin softens further to make it solvable.

---

# 13. PERFORMANCE BUDGET

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

# 14. RISKS

1. **Asset coherence at scale.** AI-generated art tends to drift in style across many prompts. Mitigation: image-to-image with single mascot anchor, 1-2 hero "style guide" prompts, manual curation.
2. **Riddle authoring is the bottleneck.** ~50 unique riddles × story ≈ 80-120 hours of design work minimum. Mitigation: chapter 1 first, then validate before authoring 2-5.
3. **Localization quality (Hebrew especially).** AI translation for narrative text is shaky. Mitigation: hand-translate critical story beats, AI for one-off riddle text; flag "needs native review."
4. **Audio mixing.** Five layers can muddy. Mitigation: dedicated 1-week audio polish phase before public ship.
5. **Save corruption.** localStorage can be cleared, Supabase can fail. Mitigation: triple-redundant save (in-memory + localStorage + Supabase), versioned schema with migrations.
6. **Mobile portrait stacking.** Inventory + dialogue + Pixi canvas competing for screen. Mitigation: design mobile-first, drawer-based inventory, full-screen dialogues.
7. **Sound assets pre-load size.** All chapter music + SFX could balloon initial load. Mitigation: lazy-load per chapter, ambient streams instead of preload, audio-sprite SFX.
8. **Rive state-machine debugging.** New tech for the team. Mitigation: start with Lottie for v1 cinematics, only adopt Rive for Melo + cousins where state-reactivity matters.

---

# 15. PHASING

**Phase A — Foundation (1 week, no asset gen):** module skeleton, type defs, Zustand stores, XState riddle FSM, hub + book map + room shell skeleton, hot-reload dev story.

**Phase B — First two riddle types (1 week):** WordConstraintRiddle, LogicSequenceRiddle, FSM integration, solve / fail / hint flows, inventory animation.

**Phase C — Engine completeness (1 week):** add Cipher, Memory, Spatial riddles. Audio layering. Reactive mascot scaffolding. Cinematic transition system. Hint Lantern. Memory Theatre skeleton.

**Phase D — Chapter 1 content (2 weeks):** all 8 rooms of Book 1, Cinder redemption cinematic, FTUE tutorial, mobile responsive polish, RTL polish.

**Phase E — Polish (1 week):** real Suno music for hub + chapter 1, CassetteAI SFX (~30 clips), optional ElevenLabs narration, Lottie cinematics, internal playtest, iterate.

**Phase F — Chapters 2-5 (4-5 weeks, one chapter per week):** each chapter follows Phase B-D pattern. Engine reused.

**Total v1: ~10 weeks for full game. Chapter 1 demo: ~5 weeks.**

---

# 16. SPECIFIC CRITIQUE QUESTIONS

## Game design / story
1. The "redemption not defeat" pattern for chapter bosses — is this satisfying for a casual audience, or does removing combat-tension lose the climax-feel?
2. The Twin Voice mechanic in Book 5 (answer with two contradicting truths simultaneously) — is this clever enough to be a final-boss moment, or pretentious?
3. 5 books × 8-10 rooms = ~50 rooms. Too short, too long, or right for $5-10 mobile/web title?
4. The eerie-fairytale tone with kawaii corrupted villains — does the contrast work, or is it tonally confused?
5. Linear chapter order vs branching — does linear hurt replayability? Should chapters offer optional rooms or branching paths?

## Riddle design
6. 8 riddle types feels rich; will players actually engage with audio + spatial + memory if they came in for word puzzles?
7. Audio riddles (Suno-generated melodies) — is this a barrier to deaf/HoH players even with subtitles? Should we make every audio riddle visual-equivalent?
8. The "reuse cousin items in Book 5" mechanic — does it feel earned, or just like a key-collection chore?
9. Rom-by-room mechanic introduction (Baba Is You-style) without tutorial walls — works for casual mobile or too obscure?
10. Hint economy (3 wrong attempts → hint available, "stuck" auto-hint after 5 min) — too generous or right?

## Tech / architecture
11. Two-store Zustand split (game + runtime) vs single store with persistence selectors — worth the complexity?
12. XState for per-riddle FSM — overkill for a puzzle game, or essential for the 8 riddle types?
13. Rive for reactive characters vs Lottie everywhere — for a story-puzzle game with reactive mascots, where's the line?
14. Pixi 8 + React DOM hybrid (canvas with `pointer-events: none`, React UI on top) — best practice or trap? Should puzzle rooms be DOM-only and Pixi reserved for cinematics?
15. localStorage + Supabase tier-2 with last-write-wins — too naive? Should we use proper conflict resolution / CRDTs?
16. Howler vs Tone.js vs Web Audio API directly — for music ducking + sprite SFX + ambient streams, which fits?

## Aliveness
17. The 9-state mascot state machine — too many or just right for a 2D puzzle game?
18. Idle ambient particles + 3-layer parallax — am I over-promising visual richness that will tank perf on mid-Android?
19. 5-bus audio with ducking — overkill for a puzzle game vs just music + SFX?
20. What "alive" details does Inscryption / Disco Elysium / Layton do that I'm not?

## Scope / production
21. ~50 rooms × authored riddles × 5 locales × ≥3 review passes = ~120-200 hours of content authoring. Realistic for solo + AI tools, or do we need a co-designer?
22. Phasing puts polish in Phase E (1 week) — is that enough for "alive and well"? Should it be 2 weeks?
23. Monetization: free demo + paid bundle — does this format work for puzzle adventures, or should we do per-chapter unlock (bigger initial conversion friction)?

## North Star
24. The current candidate wall sentence: **"Every room must teach or reveal one thing. If a room exists only to fill space, cut it."** Is this the right kill criterion for a story-puzzle game? If not, what's sharper?

---

# 17. THE END — ONE-PARAGRAPH PITCH (FOR YOUR TEST OF UNDERSTANDING)

Word Vault is a story-driven puzzle-adventure where Melo, a small marshmallow-cube hero, journeys chamber by chamber through a corrupted Vault to redeem his four sibling-cousins (Cinder/Frost-Mute/Forgotten/Ciphermaster) by understanding who they were before corruption — solving word, cipher, logic, memory, spatial, audio, lateral, and pattern riddles, collecting Memory Coins, items, and charms across 5 chapters of ~10 rooms each. No combat, no permadeath, no run resets. The "boss" of each chapter is a story-redemption moment, not a fight. The game ends with a final confrontation against the Twin Voice — the source of corruption — using the abilities of all four redeemed siblings. Built on Pixi.js 8 + GSAP + Rive + Howler with eerie-fairytale tone, sticker-illustrated 2D mascot art, and AI-generated assets curated for brand consistency. Mobile + desktop web, en + he locales, ~10-week build, target audience casual puzzle players, $5-10 IAP after free chapter 1 demo.

---

# 18. WHAT I WANT FROM YOU

Tear this apart. The user explicitly asked for *critique to share with multiple LLMs*. Be opinionated. Don't soft-pedal.

Specifically:
- Tell me if the **story is too convoluted**, the **scope is too big**, the **tech stack is over-engineered**, the **riddle distribution is wrong**, the **tone clashes**, the **monetization won't work**, the **timeline is fantasy**, or the **audience is too narrow**.
- Tell me **what would make this feel alive in ways I haven't planned**.
- Cite real games — **Inscryption** for narrative shock, **Layton** for puzzle pacing, **Monument Valley** for cinematic moments, **Disco Elysium** for dialogue depth, **Hades** for replay polish — wherever those games do better what I'm planning.
- Give me a **1-sentence north star** to print on the wall.

End of plan. Critique away.
