# Word Vault — Full Game Script & Design

**Date:** 2026-05-02
**Working title:** *Word Vault: Tales of the Corrupted Cube*
**Tone:** Eerie fairytale (Inscryption + Layton, mascot-universe)
**Scope:** 5 books × ~10 rooms each = ~50 rooms total. Chapter 1 = playable demo (8 rooms).
**Visual anchor:** existing LexiClash mascot (`fe-next/public/mascot/*.webp`) — sticker-illustrated style, NOT 3D-rendered.
**Owner:** Ohad
**Locked direction:** Replaces all earlier Adventure-rebuild plans (roguelike crawler, tycoon engine).

---

## 1. Vision

> A story-driven puzzle-adventure where the friendly mascot's world has been corrupted by his four siblings, and the player travels chamber by chamber through a great Vault solving word + non-word riddles, collecting items and memory-fragments, redeeming each sibling, and ultimately confronting the source of the corruption.

**Pillars:**

1. **Story is the spine.** Every room exists in service of a narrative beat. Riddles are how the story unfolds.
2. **Variety beats grind.** ~8 distinct riddle types. No two rooms feel the same.
3. **Items accumulate visibly.** Inventory grows over the journey; nothing is permanent loss.
4. **Bosses are optional.** Chapter endings are *redemption moments*, not fights. The riddle IS the boss.
5. **One level above LexiClash polish.** Fal-ai art + Suno music + ElevenLabs/CassetteAI SFX + Pixi+GSAP runtime.

**Anti-goals:**

- Not a roguelike. No permadeath. No run-resets.
- Not a tycoon. No grindy stat tiers.
- Not a fighter. No boss HP bars (mostly).
- Not a word-only game. Words are *one* riddle type among many.

---

## 2. The World — *The Marshmellow Realm*

### Lore

In the beginning, the Marshmellow Realm was a gentle, sticky, warm land where words held power. Letters were physical things — picked up like flowers, arranged into spells. The realm's heart was **THE WORD VAULT**, a many-chambered library carved into a vast cube-shaped mountain.

The Vault was tended by the **Five Cousins** — five marshmallow-cube siblings born from the same first word. Each carried one of the five Letter-Songs that bound the Realm together.

But deep in the Vault, sealed behind 1,000 locks, was **THE TWIN VOICE** — a forbidden tome with two mouths. Its book spoke not in words, but in *contradictions*. Anyone who heard it began to forget which mouth was true.

### The Fall

One eve, the youngest cousin, **VEX**, found the seal weakening. Curious as always, Vex peeked. A whisper escaped. By morning, four of the cousins were CHANGED:

- **CAEL** the warm-hearted, who stoked the kitchen fires, became **THE CINDER** — consumed by hunger, now a charred cube wreathed in lava-cracks.
- **SILVA** the gentle one, who whispered everyone to sleep, became **THE FROST-MUTE** — frozen in her own silence, locked in a tomb of cracking ice.
- **HARO** the elder, keeper of the Vault's stories, became **THE FORGOTTEN** — rotting away, his memories leaking out as moss and cobwebs.
- **VEX** the playful, who solved riddles for fun, became **THE CIPHERMASTER** — half-dissolved into glitching letters and numbers, no longer remembering the difference.

Only one cousin remained whole.

### The Hero

**MELO** — the middle sibling, neither youngest nor eldest, neither loudest nor quietest. The keeper of *balance*. Melo was tending a small fire when the Twin Voice escaped. Whatever quirk of being-in-the-middle protected him.

Melo wakes to find his four cousins sealed in their corrupted chambers. The Vault's central staircase is broken; he must travel **down**, chamber by chamber, gathering Word Fragments to repair the path that leads to the Twin Voice itself.

**The player plays as Melo.**

Melo's powers:
- Spell words to break cursed locks
- Solve riddles left by his cousins (who, before corruption, were brilliant puzzlers)
- Collect Memory Coins to glimpse who his cousins *were*
- Eventually wield each sibling's redeemed Letter-Song as a power

### Theme

**It's not about defeat. It's about understanding.** Melo doesn't *fight* his cousins. Each chapter ends with a special riddle that proves Melo *knows* who that cousin was before corruption — and that knowing is what redeems them.

(Equivalent of a "boss fight" but resolved through a story-riddle, not damage.)

---

## 3. Characters

### Heroes / NPCs

#### MELO (player character)
- Cream-white marshmallow cube
- Pink blush, tiny black dot eyes (sticker style — same as `celebration.webp`)
- Calm, observant, a quiet kindness
- Speaks in short, simple sentences
- Carries a small wooden lantern that lights letters

#### THE LIBRARIAN (NPC, hub)
- An elder cousin who escaped to the surface, now manages the Vault entrance
- White marshmallow with reading-glasses + tiny scholar's cap
- Provides hints, lore, and item shop
- Calls Melo "little keeper"

#### THE WICK (NPC, recurring)
- A small living candle (not a marshmallow)
- Found mid-chapter; can re-light cursed letters
- Provides comic relief
- Voiced as a tiny crackling flame

### The Four Corrupted Cousins (chapter bosses)

#### Book 1: THE CINDER (formerly CAEL)
- Charred-black marshmallow with glowing lava-crack body
- Spiked iron crown
- Eyes: angry red embers (still proportionally cute, not horror)
- Personality before corruption: warm-hearted cook who fed everyone, knew every recipe by heart
- Personality now: hungry, raging, but flashes of his old self when offered the right ingredients
- Domain: **The Hearth Halls** — burned-down kitchen, ash-covered counters, embers in the air

#### Book 2: THE FROST-MUTE (formerly SILVA)
- Marshmallow encased in cracked ice, blue tint, frozen tears
- Icicle horns
- Eyes: pale-cyan, sad-evil frown
- Personality before corruption: gentle, whispered everyone to sleep with bedtime stories
- Personality now: cannot speak, communicates through frozen letters that crack and fall
- Domain: **The Lullaby Vault** — frozen library, ice-locked storybooks, snow falling indoors

#### Book 3: THE FORGOTTEN (formerly HARO)
- Decayed cube with moss, cobwebs, missing chunks
- Hollow sunken eyes glowing sickly green
- Personality before corruption: keeper of the Vault's stories, knew every soul's name
- Personality now: forgets mid-sentence, asks the same question three times, weeps softly
- Domain: **The Forgetting Wing** — overgrown library where books rewrite themselves; pages crumble at touch

#### Book 4: THE CIPHERMASTER (formerly VEX)
- Pixelated/glitching cube, half-dissolved into letters & numbers
- Magenta digital corruption artifacts
- Eyes: flickering ERROR screens
- Personality before corruption: playful trickster who left riddle-notes for everyone
- Personality now: speaks only in ciphers and substitutions; can't remember plain language
- Domain: **The Cipher Atrium** — geometric room of rotating glyph-walls; runes float and re-arrange

### The Final: THE TWIN VOICE (Book 5)
- Two mirrored marshmallows conjoined back-to-back
- One side smiles sweetly (kawaii), one side grins malevolently (fanged)
- Prismatic crown floating above
- Inverted-color body
- Speaks with two contradicting mouths simultaneously
- Origin: the corrupting book itself, given form
- Domain: **The Mirror Sanctum** — recursive room of infinite mirrors, each a different version of Melo

---

## 4. Game Structure

### Macro

```
HUB (Library Foyer)
  │  ─ Talk to Librarian
  │  ─ Inventory check
  │  ─ Shop (spend Memory Coins for hint lanterns / consumables)
  │  ─ Memory Theatre (replay collected story flashbacks)
  │
  ├─ BOOK 1: The Hearth Halls (THE CINDER) — fire/cooking theme
  ├─ BOOK 2: The Lullaby Vault (THE FROST-MUTE) — silence/ice theme
  ├─ BOOK 3: The Forgetting Wing (THE FORGOTTEN) — memory/decay theme
  ├─ BOOK 4: The Cipher Atrium (THE CIPHERMASTER) — code/geometry theme
  └─ BOOK 5: The Mirror Sanctum (THE TWIN VOICE) — final confrontation
```

Books unlock sequentially; book 5 requires gathering 4 redeemed Letter-Songs.

### Per-book structure

Each book = **8-10 rooms** in roughly this order:

1. **Threshold room** — establishes theme, easy intro riddle. Cousin appears in shadow, can be heard.
2. **Riddle Room A** — first proper puzzle, teaches book's signature mechanic.
3. **Memory Coin Room** — small story flashback unlocked by completing a riddle.
4. **Riddle Room B** — different mechanic, slightly harder.
5. **Item Vault** — earn the chapter's signature collectible item.
6. **Riddle Room C** — combines mechanics from A + B.
7. **Cousin's Quarters** — non-puzzle, story room. Cousin's shadow narrates a memory.
8. **Riddle Room D** — hardest puzzle, gates the final room.
9. **(Optional) Riddle Room E** — bonus puzzle for completionists.
10. **Redemption Chamber** — the chapter's "boss." NOT a fight. A special story-riddle that proves Melo *understands* the cousin. Resolves with cinematic.

### Macro pacing

- Whole game = ~6-10 hours playthrough
- Each book = ~60-90 minutes
- Each room = 3-10 minutes (varies by riddle type)

---

## 5. Riddle Catalogue (~8 types, ~50 puzzles total across 5 books)

### Type A — Word Constraint (the LexiClash core)
Player drag-spells a word from a tile slate. **Constraint** modifies the rule.
- "Spell a 5-letter word"
- "No vowels allowed"
- "Word must contain Q"
- "Use ONLY tiles in the diagonal"
- "Spell 3 words in a row without repeating a letter"

### Type B — Cipher / Substitution
Decode a hidden message.
- Caesar shift: "DPEF JT GVO" → "CODE IS FUN"
- Symbol-letter substitution
- Anagram unscramble: "TASE" → "EATS / TEAS / SEAT"

### Type C — Logic / Sequence
Pull levers / press buttons / open locks in correct order.
- "Open levers based on a rhyme: green first, gold last, pink between but not blue"
- "Light four candles in the order they were extinguished in the diary"

### Type D — Memory
Letters/symbols flash for 3 seconds, then must spell or arrange from memory.
- "Recite the 5 letters in correct order"
- "Place 4 candles where they used to stand"

### Type E — Spatial
Move tiles, fit shapes, complete a path.
- "Slide letter blocks until the path spells a word top-to-bottom"
- "Rotate a tile-grid so all matching letters are adjacent"

### Type F — Audio (uses Suno-generated melodies)
Listen → identify / match.
- "Three lullabies played; which one belongs to which cousin?"
- "Match the rhythm with the correct sequence of tile taps"

### Type G — Lateral Thinking / Riddle-as-text
Read a riddle, pick the correct answer from 3-4 options.
- "I have keys but open no locks. I have space but no room. What am I?" → KEYBOARD
- "I am light but I cannot be lifted." → LANTERN

### Type H — Pattern Recognition
Find the odd one out / next in sequence.
- "Which tile doesn't belong: APPLE, BREAD, CHEESE, CURRY, DUMPLING?"
- "Complete the pattern: A B D G ?"

**Distribution per chapter:** Each book has ~6-8 riddles spread across ≥4 of the 8 types. Book signature mechanic dominates but variety is enforced.

---

## 6. Inventory & Items

Inventory persists across the whole run. No resets. Some items are story-gates; some are consumables.

### Currencies (collectible, spendable)

- **MEMORY COINS** (gold) — earned by clearing rooms. Spent at Librarian's shop on hints, consumables.
- **WORD FRAGMENTS** (purple shards) — earned at the redemption chamber of each book. Required to unlock next book.
- **LETTER TOKENS** (rare, lime sparkle) — Q, X, Z, J letters that can be inserted into any word puzzle as a wildcard.

### Consumables (use once, refresh in shop)

- **HINT LANTERN** — burns through one fog-of-puzzle, reveals one letter or one symbol
- **REWIND HOURGLASS** — undo last 3 moves on a sequence puzzle
- **WICK SPARK** — relight a single cursed letter (if puzzle locks letters)

### Permanent items (story-gated)

- **MELO'S LANTERN** — start item, lights all words
- **CAEL'S RECIPE BOOK** (after Book 1) — auto-completes ingredient sequences
- **SILVA'S LULLABY SHEET** (after Book 2) — passes audio riddles by humming the correct tune
- **HARO'S DIARY** (after Book 3) — re-reads memory rooms, reveals lore
- **VEX'S CIPHER WHEEL** (after Book 4) — auto-decodes one cipher per book
- **THE TWIN KEY** (final) — opens the Mirror Sanctum

### Charms (passive effects, max 3 equipped)

Earned at end of each book. Each provides a passive bonus:
- **CINDER CHARM** — extra Memory Coin from each fire-themed riddle
- **FROST-MUTE CHARM** — once per chapter, freeze a timer for 5 sec
- **FORGOTTEN CHARM** — re-read any past riddle's hint
- **CIPHER CHARM** — auto-show first letter of any cipher
- **TWIN CHARM** (after final) — unlocks New Game+ mode

---

## 7. Chapter 1 Detailed Script — *The Hearth Halls*

### Theme & feel
Burned-down kitchen. Embers floating. Charred recipe books. Faint smell of cinnamon underneath the smoke. Music: Suno-composed slow accordion + crackling fire ambience. SFX: ember pops, paper-crinkle, distant sizzling.

### Cousin: THE CINDER (formerly CAEL)
- Mood: enraged but flickers of warmth
- Speaks in short barked phrases ("HOT! HUNGRY! BURN!")
- Old self appears in flashbacks: a soft-spoken cook humming while stirring a pot

### Room-by-room (8 rooms)

#### Room 1.1 — THRESHOLD: The Cracked Door
**Type:** Word Constraint (intro tutorial)
**Setup:** A burnt wooden door, only 4 tiles visible: F-I-R-E (glowing orange)
**Riddle:** "Drag the tiles to spell a word. Open the door."
**Solution:** Spell FIRE → door opens
**Story beat:** Melo enters, lantern lights up; we hear a distant roar. Cinder calls out: "GO BACK, LITTLE ONE!"
**Earn:** First MEMORY COIN, intro to controls

#### Room 1.2 — RIDDLE A: The Recipe Wall
**Type:** Sequence + Word Constraint
**Setup:** Six fading recipe cards on a wall, each with a missing ingredient (a word). The cards are out of order. Player must (a) order them correctly using a hint rhyme, and (b) spell each missing ingredient from a tile pool.
**Hint rhyme:** "First we boil, then we knead, last we bake — that's all we need."
**Solution:** Order: BOIL → KNEAD → BAKE; missing words: WATER, FLOUR, BREAD
**Story beat:** As cards order correctly, a faint humming melody plays — Cael's old cooking song
**Earn:** 2 Memory Coins + a flashback fragment ("Cael once cooked for the whole Realm")

#### Room 1.3 — MEMORY COIN ROOM: The Burnt Diary
**Type:** Lateral riddle / dialogue
**Setup:** A blackened diary on a stove. Click to read 4 entries; each is a riddle from Cael's past
**Riddle:** "What rises when you knead it, falls when you slice it?" → BREAD
**Solution:** Pick the correct answer from 4 options
**Story beat:** Each correct answer reveals a sentence of Cael's old self ("I cook because the Realm needs warmth, and warmth is just love made warm")
**Earn:** Memory Coin, Cael flashback unlocked in Memory Theatre

#### Room 1.4 — RIDDLE B: The Cipher Pantry
**Type:** Cipher (substitution)
**Setup:** A pantry full of jars; each jar has a label in scrambled letters. The labels are anagrams of ingredients.
**Riddle:** "RUGAS / RUFLO / TAESM / GAOR" — unscramble each
**Solution:** SUGAR, FLOUR, STEAM, ROAR (the last is fake, leave it)
**Story beat:** When 3 correct labels are placed, the pantry door opens
**Earn:** A LETTER TOKEN (Q wildcard) + Memory Coin

#### Room 1.5 — ITEM VAULT: The Smouldering Vault
**Type:** Logic / sequence (lever puzzle)
**Setup:** 4 levers labeled with cooking utensils (KNIFE, POT, FORK, OVEN). Pull in correct order based on a rhyme on the wall.
**Hint rhyme:** "First it heats, then it slices, then it lifts, then it serves."
**Solution:** OVEN → KNIFE → FORK → POT (heats → slices → lifts → serves)
**Story beat:** Vault opens, reveals **CAEL'S RECIPE BOOK** — first permanent item
**Earn:** Cael's Recipe Book (auto-completes future ingredient sequences)

#### Room 1.6 — RIDDLE C: The Fire-Pit Match
**Type:** Combines word + spatial
**Setup:** A 4x4 tile slate where each tile is a different ingredient name. Player must drag a path through tiles whose first letters spell a chant: F-E-A-S-T
**Solution:** Path through FIG → EGG → APPLE → SPICE → THYME tiles
**Story beat:** Fire pit lights, Cael's voice softens for a moment ("a feast... I remember...")
**Earn:** Memory Coin

#### Room 1.7 — COUSIN'S QUARTERS: Cael's Old Kitchen
**Type:** Story-only (no riddle)
**Setup:** A cleaned, untouched kitchen frozen in time before the corruption. Melo walks through; subtitled narration plays. Player can click 5 objects (apron, ladle, cookbook, hat, photograph) to read short memories
**Story beat:** The fifth object — a family photo — shows all 5 cousins together. Melo sheds a tear.
**Earn:** A WORD FRAGMENT (1 of 4 needed for redemption)

#### Room 1.8 — REDEMPTION CHAMBER: The Last Recipe
**Type:** Hybrid (memory + word + emotional choice)
**Setup:** Cinder appears, ENRAGED and RAVENOUS. He demands a meal. Player must "cook" by spelling 3 ingredient words IN ORDER, the order Cael used to make his signature dish (revealed via Memory Coins gathered earlier).
**Solution:** WATER → FLOUR → HONEY (or whichever 3 the chapter has been teaching). Each correct word makes Cinder calmer, a softer voice cuts through. The third correct word: he transforms back into Cael for a moment, weeps, hugs Melo, then vanishes (but leaves his Recipe Book + Letter-Song).
**Story beat:** Cael's redemption cinematic. He says: "Thank you, brother. Find the others. They are scared too."
**Earn:** CINDER CHARM (passive: +1 Memory Coin from fire-themed riddles), 1st of 4 Letter-Songs, and Cael's Recipe Book is fully unlocked.

### Chapter 1 — Estimated playtime: 60-90 min.

---

## 8. Chapters 2-5 Outlines

### Book 2 — The Lullaby Vault (THE FROST-MUTE / SILVA)
- **Theme:** Frozen library, falling snow, lullaby music boxes
- **Signature mechanic:** Audio + memory puzzles. Melodies play; player matches.
- **Item earned:** Silva's Lullaby Sheet (passes audio riddles)
- **Charm earned:** Frost-Mute Charm (freeze a timer once per chapter)
- **Redemption riddle:** Compose Silva's bedtime lullaby by arranging 5 melody-tiles in correct order. When played correctly, ice cracks; Silva returns.

### Book 3 — The Forgetting Wing (THE FORGOTTEN / HARO)
- **Theme:** Overgrown library, books rewriting themselves, moss everywhere
- **Signature mechanic:** Memory rooms (letters flash, recall) + lateral-thinking riddles where the question changes mid-puzzle
- **Item earned:** Haro's Diary (re-reads any past memory)
- **Charm earned:** Forgotten Charm (re-read any hint)
- **Redemption riddle:** Re-tell Haro's most-loved bedtime story. Player must reconstruct it from memory fragments scattered across earlier rooms. He smiles, "ah… that was a good one," and rests.

### Book 4 — The Cipher Atrium (THE CIPHERMASTER / VEX)
- **Theme:** Geometric room of rotating glyph-walls, magenta glitch effects
- **Signature mechanic:** Cipher + spatial + pattern riddles. Walls rotate; player decodes shifting messages.
- **Item earned:** Vex's Cipher Wheel (auto-decode one cipher per book)
- **Charm earned:** Cipher Charm (show first letter of any cipher)
- **Redemption riddle:** Solve Vex's playful "ultimate riddle" he left for Melo BEFORE the corruption — found in Book 1 as a sealed envelope. Unsealed in Book 4. Riddle is layered: cipher + word + lateral. Solving it brings Vex back.

### Book 5 — The Mirror Sanctum (THE TWIN VOICE)
- **Theme:** Recursive infinite-mirror room. Each mirror shows a different "what if Melo was corrupted instead." Music: distorted lullaby + warped recipe theme + frozen choir + glitched voices layered.
- **Signature mechanic:** Player must use ALL 4 redeemed siblings' powers. Each riddle requires a different one of the items earned.
- **Final riddle:** The Twin Voice asks Melo a question with two contradicting answers. Player must answer with BOTH simultaneously — by spelling two valid words at once on a split slate (one half spells the "true" answer, other half spells the "kind" answer).
- **Outcome:** The Twin Voice cracks; Melo's siblings reappear; the Vault is restored. Closing cinematic.

---

## 9. UI / UX flow

### Screens (in order of player encounter)

1. **Splash / Title** — animated "WORD VAULT" logo with corrupted edges flickering
2. **Hub Foyer** — Librarian, Memory Theatre, Shop, Inventory, Book selection (Books 2-5 locked initially)
3. **Book Map** — vertical scroll showing 8-10 rooms of the current book with star ratings, current room highlighted
4. **Room** — the puzzle screen (full-screen Pixi scene)
5. **Memory Theatre** — replay collected story flashbacks (text + still art + voice-over)
6. **Shop** — spend Memory Coins on Hint Lanterns, Rewind Hourglasses, Wick Sparks
7. **Inventory** — view collected items + charms; equip up to 3 charms
8. **Settings** — language, audio, accessibility (large text, color-blind palette, reduce motion)
9. **Pause overlay** — accessible from any room

### Key UI moments to nail (ranked by polish priority)

1. **Drag-spell feedback** — already prototyped, hardest to nail. Lime trail, satisfying tile-pop.
2. **Memory Coin drop animation** — satisfying coin-toss with glint, +1 ticker
3. **Riddle solved overlay** — gold star burst, soft chime, "ROOM CLEARED" banner
4. **Redemption chamber transition** — slow camera zoom, music swell, color shift
5. **Story flashback frames** — hand-illustrated panels with subtle animation (Lottie / Rive)
6. **Inventory open/close** — drawer slide, items visible with hover tooltip
7. **Hint Lantern usage** — fog parts in 1-second sweep
8. **Locked-room shimmer** — books that can't be entered yet glow softly with a "?" overlay

---

## 10. Sound design notes

### Music (Suno — user generates)

Suggested prompts per chapter:

- **Hub:** Warm, welcoming string-and-piano lullaby. ~90 BPM. Major key.
- **Book 1 Hearth:** Slow accordion + crackling fire ambience layer. Folk feel.
- **Book 2 Lullaby:** Music-box arpeggios + low choir + sparse harp. Ethereal, sad.
- **Book 3 Forgetting:** Dusty piano + tape-warble + mossy ambience. Melancholy.
- **Book 4 Cipher:** Glitch-electronic + 8-bit chiptune motifs + distortion. Playful-eerie.
- **Book 5 Mirror:** Layered version of all 4 previous themes playing simultaneously, slowly resolving into harmony.

### SFX (CassetteAI via fal-ai, OR ElevenLabs)

Core SFX library (~30 sounds):
- Tile tap (3 variants for chained drags)
- Tile-undo
- Word valid (chime)
- Word invalid (buzz)
- Riddle solved (gold burst)
- Memory Coin drop (coin chink)
- Door open (heavy wood)
- Cousin voice (4 variants — burning crackle / icy whisper / paper-crumble / digital glitch)
- Page turn
- Lantern click
- Ember pop, snow crunch, rotting creak, glitch buzz (chapter-specific ambience)
- Cinematic stinger (chapter end)
- Twin Voice contradicting whisper (final boss)

### Voice (ElevenLabs, optional v1)

- Narrator: warm older voice (think a kindly grandparent reading a bedtime story). Reads room intros + memory flashbacks.
- Cousin barks: 4 distinct voices for the 4 corrupted cousins (no full sentences, just 3-5 phrases per chapter).
- Twin Voice: one normal + one warped, layered.
- Hebrew narration: ElevenLabs supports HE; same character voices recorded in HE.

---

## 11. Tech stack & asset pipeline

### Runtime (already in repo)

- Next.js 16 App Router
- Pixi.js 8.17 (rendering)
- GSAP 3.14 (animation)
- Howler 2.2 (audio)
- Zustand (state)
- Vitest (tests)

### Visuals

- **fal-ai Flux 2 Max / Pro** for hero sprites + character art (image-to-image from existing mascot file as anchor)
- **fal-ai Flux 2 Turbo** for backgrounds + items + variants (cheaper, faster)
- **Lottie** (free) for cinematic moments + UI micro-animations
- **Rive** ($14/mo) — premium tier, optional — for state-machine character animations (mascot moods responsive to game state)

### Audio

- **Suno** (user generates) for music
- **CassetteAI Sound Effects Generator via fal-ai** for SFX
- **ElevenLabs** for narration + cousin voices (need API key, optional v1)

### Story / dialogue

- Claude (this session) writes drafts; user edits

### Localization

- Existing `i18n/` infrastructure. 5 locales — primary v1 = en + he. sv/ja/es later.

### Estimated asset budget for v1 (Chapter 1 + hub)

| Asset | Count | Tool | Cost |
|---|---|---|---|
| Backgrounds | 8 (one per room) | Flux 2 Pro | ~$0.40 |
| Mascot variants | ~15 (Melo moods, NPCs, cousins) | Flux 2 Max + img2img | ~$1.00 |
| Item icons | ~25 | Flux 2 Turbo | ~$0.50 |
| UI elements / frames | ~10 | Flux 2 Pro | ~$0.30 |
| SFX clips | ~30 | CassetteAI | ~$3.00 |
| Music tracks | ~5 | Suno (user) | $0 |
| Narration voice (en) | ~30 lines | ElevenLabs starter | ~$2.00 |
| Narration voice (he) | ~30 lines | ElevenLabs starter | ~$2.00 |
| **Chapter 1 total** | | | **~$10** |

Rough full-game estimate (5 chapters): ~$50 in API charges.

---

## 12. Production milestones

### Phase A — Foundation (week 1)
- [ ] Lock visual identity: regenerate 5 corrupted-cousin mascots via fal-ai img2img using `celebration.webp` as anchor
- [ ] Generate Chapter 1 background tile set (8 rooms)
- [ ] Generate item icon set (~25 collectibles)
- [ ] Set up `lib/adventure/v3/` directory (replaces v2, which becomes "combat-mode" archive)
- [ ] Write Chapter 1 dialogue + Memory Theatre script content

### Phase B — Engine (week 2)
- [ ] Inventory system (Zustand slice + persistence)
- [ ] Riddle abstraction: `Riddle` interface with kind, content, solveCheck, onSolve hook
- [ ] Implement 4 riddle types: Word Constraint, Cipher, Logic-Sequence, Memory
- [ ] Hub screen rebuild: Foyer with Librarian + Inventory + Memory Theatre + Shop
- [ ] Book Map screen
- [ ] Room transition animations

### Phase C — Chapter 1 content (week 3)
- [ ] Build all 8 rooms of Book 1 with their riddles
- [ ] Wire Cael's Recipe Book item effect
- [ ] Cinder corruption + redemption cinematic
- [ ] First-time-user tutorial threaded through Room 1.1 + 1.2

### Phase D — Audio + polish (week 4)
- [ ] Generate Suno music for Hub + Book 1
- [ ] Generate CassetteAI SFX library (30 clips)
- [ ] Optional: ElevenLabs narration if approved
- [ ] Lottie cinematic for redemption moment
- [ ] Mobile + desktop responsive polish
- [ ] Hebrew RTL polish

### Phase E — Playtest + iterate (week 5)
- [ ] Internal playtest with 3-5 testers
- [ ] Refine riddles that have low solve rates
- [ ] Fix audio mixing
- [ ] Fix typo / dialogue issues
- [ ] Write playtest report

### Phase F — Chapters 2-5 (weeks 6-10, one chapter per week)
- Each chapter follows the same Phase B-D template
- Reuses engine; adds chapter-specific riddle types

### Total v1 timeline: ~10 weeks for full game (5 chapters). Chapter 1 demo: 4 weeks.

---

## 13. Visual style locks

### MUST follow

- Sticker-illustrated 2D mascot style (NOT photoreal 3D, NOT anime)
- Subtle gradient shading (matches existing `celebration.webp`)
- Tiny dot eyes, NOT large anime eyes
- Bold dark outline (sticker style)
- Pink blush circles on cheeks
- Fredoka + Rubik fonts only
- Neo-Brutalist UI chrome: hard 4px black drop shadows, 3px solid borders, no gradients
- Dark navy (#1a1a2e) background base
- Lime / pink / cyan / yellow / magenta accent palette per chapter

### MUST NOT do

- No 3D rendered characters
- No photoreal lighting
- No glassmorphism / soft drop shadows
- No fonts beyond Fredoka + Rubik
- No story tone shifts mid-chapter

---

## 14. Open questions (track for resolution)

1. ElevenLabs API key — does the user have one set in env? If yes, narration can ship in v1. If no, narration deferred to v2.
2. Mobile-first or desktop-first MVP? Recommended: mobile-first (matches LexiClash audience).
3. Save-game cloud-sync via Supabase, or localStorage-only for prototype? Recommended: localStorage v1, Supabase v2.
4. New Game+ mode (after final): does it shuffle riddle answers, or unlock harder riddle variants, or both? Recommended: harder variants.
5. Hint Lantern economy: how many lanterns per chapter? Recommended: 3 free per chapter, +1 buyable for 50 Memory Coins.

---

## 15. The Wall Sentence (carry-forward from previous direction)

> **"Every room must teach or reveal one thing. If a room exists only to fill space, cut it."**

Replaces the previous wall sentence ("If spelling a word doesn't feel viscerally more magical than pressing Attack..."). The previous one was relevant to the combat-driven prototype. This new one is the right kill criterion for a story-driven puzzle game.

---

# END OF SCRIPT v1

Next action: confirm Q1-Q5 above, then start **Phase A — Foundation** (regenerate visual identity + set up engine skeleton).
