# Word Vault — Magic Grid Redesign (Design Spec)

**Date**: 2026-05-03
**Status**: Design — pending user approval, then implementation plan
**Replaces**: Current Book 1 scene-bespoke puzzles (DarkDoor 5×5 trace, CipherPantry tap-sequence, etc.) and the verb-hook system (`useReveal`/`useSequence`/`useCompose`).
**Preserves**: All scene art, story beats, items, characters (אש / אורי / גחלת), `HubFoyer`, `RoomShell` discriminator, `EmberOverlay` Pixi pattern, ItemId stable union (player saves intact).

## 1. Why redesign

Current Word Vault Book 1 shipped after 4 critique-and-polish rounds yet the user reports it is **not fun**: too easy, doesn't feel like a real escape room, missing skill expression, stakes, surprise, reward, and real word play (gaps A–E on the brainstorm).

Root cause: the **verb is wrong**. The build is an escape-room game with word **skin**, not word **core**. Polish cycles optimized for "no friction" — affordance glow, whisper hints, auto-snap items — which deleted exactly the friction (deduce, get stuck, "aha") that defines the genre.

Fix is **not** more polish. Fix is replacing the puzzle verb with one designed for word-skill expression, comprehension, and escape-room cognition.

## 2. Concept — The Magic Grid

The vault contains a magical letter grid the player can summon at any time via a HUD button. Each room presents a problem (frozen door, dead stove, locked book…) communicated through scene art and tappable clues. The player must:

1. **Read the room** — gather clues from scene objects (whispers, icons, glyphs, memories)
2. **Form a hypothesis** — synthesize clues into "this room needs a word for ___"
3. **Summon the grid** — magical letter pool materializes over the scene
4. **Find the right word** — Boggle-trace or anagram-pick (per beat config)
5. **Beat resolves** — scene transforms, possibly grants item/codex fragment
6. **Repeat** — most rooms require 2–5 grid summons per the room's beat structure

The grid is a **single React component** with a rich config surface. Variety per room comes from composition of small modifiers, not bespoke per-scene UI.

### Core loop (precise)

```
Enter room
  → Scene shows a problem (visual)
  → Tap objects → ClueLine emits → accumulates in Notebook (HUD)
  → Player synthesizes hypothesis
  → Tap VAULT button (always present)
  → VaultGrid materializes per current beat config
  → Player selects/traces a word
  → Submit:
      target-hit  → big payoff: scene transforms, beat solved, possibly item/story
      bonus-hit   → small chime + currency, grid stays open
      invalid     → soft buzz, retry
  → If beat solved AND more beats → next clue scatter unlocks
  → If all beats solved → door opens → next room
```

### Design rules

- Player is **never told** the exact target word. Clues describe meaning.
- Multiple valid solves per beat where natural; **rare words score higher** (vocabulary depth = score depth).
- Wrong-target valid words = side reward, never punishment. Encourages grid exploration.
- Grid is **always available** — no charge, no cooldown for v1.
- **No automatic affordance glow / whisper / auto-snap.** Real escape-room friction is preserved.
- Optional **idle-aware nudge** (notebook glows at 90s, vault button pulses at 3 min). Nudges what to *do*, never what *answer*.

## 3. The VaultGrid component

```ts
type VaultGridConfig = {
  size: 3 | 4 | 5;                      // grid dimension
  letterSource: 'pool' | 'pangram' | 'forced';
  letters?: string[];                    // when letterSource='forced'
  themeBias?: 'kitchen'|'cold'|'soot'|'memory'|'final';
  traversal: 'adjacent' | 'anytap';     // boggle-trace vs anagram-pick
  modifiers?: GridModifier[];           // composable rule+visual overlays
  targets: TargetWord[];                // accepted answers (1+)
  bonusBucket?: BonusBucket;            // off-target valid HE words for currency
  semanticGate?: SemanticGate;          // optional theme-lock
};
```

### Letter sources

- **`pool`** — random themed letters with guaranteed coverage of all `targets`. Used in most rooms.
- **`pangram`** — exact letter set spelling every target. Tighter, harder, used in tutorials and climactic beats.
- **`forced`** — designer-specified letter set. Used for cipher rooms and final-beat compose.

### Traversal modes

- **`adjacent`** (Boggle) — must drag through neighboring tiles. Default for skill-forward beats.
- **`anytap`** (Anagram) — any-order pick. Used for tutorial, memory rooms, and the final climax beat (no time pressure on the payoff).

### GridModifier (sophistication via composition)

Each modifier is a small rule + visual + audio cue. Stack 0–4 per beat.

| Modifier | Rule | Visual | Used in |
|---|---|---|---|
| `frozen(n)` | `n` tiles iced over; thaw on adjacent-correct or item use | ice crust | 1.4 thaw beat, boss HP1 |
| `mirror` | Tile glyphs render mirrored — read carefully | flipped chars | 1.5 memory beats |
| `shadow(n)` | `n` tiles obscured until adjacent tile selected | soot wisp | 1.3 sooted-wall beats |
| `decay(ms)` | Tiles dim over `ms`; fully dim = unreadable. Encourages quick read. NOT a hard timer | brightness fade | boss HP2/HP3 |
| `swap(period)` | Two random tiles swap every `period` ms | flip animation | boss HP3 |
| `lock(letter)` | Answer must include this letter | golden tile | cipher rooms |
| `bind(letterA→letterB)` | Selecting A auto-chains B | drawn link | sequence vibe (1.4 light beat) |
| `sigil(target)` | Tiles arrange in a shape hinting at target's length/shape | grid layout | accessibility/easy mode |

### SemanticGate (the comprehension gate — where word-skill lives)

Beyond "valid Hebrew word", an optional **meaning-class** filter:

```ts
type SemanticGate = {
  class: 'fire' | 'water' | 'fuel' | 'name-male' | 'family' | 'food' | 'time' | 'memory' | 'warmth' | 'cold' | ...;
  acceptList: string[];           // hand-curated HE synonyms
  rareBonusList?: string[];       // poetic/archaic words that fit, score higher
};
```

Example — "needs fuel" beat in 1.4:
- `acceptList`: עץ, פחם, גחלת, קש, זרדים
- `rareBonusList`: בעירה, שלהבת
- Any acceptList word solves the beat. Rare-bonus = same solve + bonus reward.

**This is the replayability lever.** Vocabulary-rich players are rewarded; minimal vocabulary still finishes.

### Submit result classifier

```ts
type SubmitResult =
  | { kind: 'target-hit'; target: TargetWord; rewards: Reward[] }
  | { kind: 'bonus-hit'; word: string; rarity: 1|2|3; coin: number }
  | { kind: 'invalid'; reason: 'not-word'|'wrong-class'|'used' };
```

### Visual contract

- Grid is a **glowing slab that floats up from the scene** when summoned (Pixi/CSS overlay above scene art, scene dimmed but visible underneath — diegetic, not modal).
- Letters tinted in room theme color (lime/cold/red/etc.).
- Modifiers each have signature visuals (frozen = ice crust; shadow = soot wisp).
- Word-trace draws a glowing ribbon. On target-hit, ribbon **flies into the scene** to where the change happens (e.g., word "אש" flies into the stove).

## 4. Room "Needs" model

Rooms are declarative data; scenes are art + clue emitters.

```ts
type RoomBeat = {
  id: string;
  hint: ClueSet;
  grid: VaultGridConfig;
  onSolve: SceneTransform;
  unlocks?: BeatId[];
};

type Room = {
  id: 'r1.1' | ... | 'r1.6';
  beats: RoomBeat[];
  beatOrder: 'sequential' | 'free' | 'graph';
  exitCondition: 'all-beats' | 'final-beat-only';
};
```

### ClueSet — the comprehension primitive

```ts
type ClueSet = {
  ambient: string;                    // shown on enter
  objects: Array<{
    sceneObjectId: string;            // tappable in scene art
    onTap: ClueLine;                  // emits when tapped
  }>;
  notebookHint?: string;              // appears after all objects tapped
  carryClue?: { fromRoom: RoomId; required: ClueFragmentId };
};

type ClueLine =
  | { kind: 'whisper'; text: string }
  | { kind: 'sense'; icon: 'cold'|'dark'|'empty'|'name'|'echo' }
  | { kind: 'memory'; text: string }
  | { kind: 'glyph'; glyph: string };
```

### Notebook (HUD)

Always-open mini-panel showing aggregated clues. Player can re-read what they've gathered without re-tapping. The **synthesis surface** that turns scattered clues into a hypothesis.

### Beat-order modes

- **`sequential`** — beats locked until prior solved. Used in tutorial + 1.4.
- **`free`** — all beats open at once. Used in 1.5 (memory room — pick which to chase).
- **`graph`** — beat A unlocks B+C; D needs both. Used in boss + 1.3.

### Cross-room callbacks (the unified-vault feel)

Some beats require a `carryClue` from a prior room:

```ts
hint: {
  ambient: '...',
  objects: [...],
  carryClue: { fromRoom: 'r1.2', required: 'cipher-mem-מ' }
}
```

Without the carry-clue, notebook shows "something is missing here…" and the door politely refuses. Player backtracks via hub revisit.

Two carry-clue dependencies in Book 1:
- **1.2 → 1.5**: letter-mapping found in cipher pantry needed for memory unlock
- **1.1 → 1.3**: glyph **א** found at door needed for sooted-wall assemble beat

## 5. Item system (decision: I3 — modifier-disablers + 2 story alt-targets)

### I1-style (default for all items)

Items are tactical modifier-disablers, applied automatically when player owns the item:

| Item | Effect | Beat affected |
|---|---|---|
| `defrost-candle` | Next `frozen` modifier loses 2 ice tiles | 1.4 thaw, boss HP1 |
| `melo-lantern` | Next `shadow` modifier reveals all tiles | 1.3 wipe beats |
| `cinder-charm` | Next `decay` modifier doubles fade duration | boss HP2/HP3 |
| `broom` | Next `shadow` reveals corners | 1.3 east beat |

### I2-style (2 story items only)

Two story items unlock SECRET alt-target beats:

| Item | Alt-beat | Reward |
|---|---|---|
| `brass-key` | 1.4 hidden beat: target אורי instead of אש | Codex story fragment "the night Uri left" |
| `cael-recipe-book` | 1.6 hidden beat: target גחלת in mercy form | Codex story fragment "the boss was once family" |

These fragments only viewable in Codex post-game. Pure narrative reward, doesn't trivialize puzzles.

## 6. Per-room beat sketches

### 1.1 Cracked Door (TUTORIAL)
- **Beats**: 1 (`open-door`)
- **Clues**: door tap → "needs a name." Lantern tap → glyph **א** revealed.
- **Grid**: `size: 3, traversal: anytap, letterSource: pangram, targets: ['אש'], modifiers: []`
- **Why tutorial**: tiniest grid, anagram pick, single target, glyph in notebook. Loop learned in 30s.

### 1.2 Cipher Pantry
- **Beats**: 2 (`reveal-cipher`, `unlock-pantry`) sequential
- **Beat 1**: 4 jars, each tap reveals a glyph→letter mapping. Grid `modifier: lock(letter)` requires a decoded letter.
- **Beat 2**: target = answer to a riddle on the pantry door ("what feeds the family but never eats" → לחם). Grid `semanticGate: 'food'`.

### 1.3 Sooted Wall
- **Beats**: 3 (`wipe-east`, `wipe-west`, `assemble-name`) graph
- **Beats 1–2**: `4×4` grids with `shadow(8)`. Targets = names of two objects from earlier rooms (carry-clues from 1.1, 1.2).
- **Beat 3**: `pangram` grid using ONLY the letters discovered in beats 1+2. Target = brother's name **אורי** emerges from combination.

### 1.4 Cold Stove
- **Beats**: 3 (`thaw`, `fuel`, `light`) sequential
- **Beat 1 (thaw)**: `frozen(6) + semanticGate: 'warmth'` (אש/חום/דבש/שמש)
- **Beat 2 (fuel)**: `semanticGate: 'fuel'` (עץ/פחם/גחלת/קש/זרדים)
- **Beat 3 (light)**: `bind(א→ש)` — target verb (להבעיר / להדליק)

### 1.5 Uri's Old Kitchen (MEMORY)
- **Beats**: 4 (`remember-1`, `remember-2`, `remember-3`, `assemble-photo`) free
- **Beats 1–3**: tap memento → memory clue → grid `modifier: mirror`. Target = noun from memory.
- **Beat 4**: 3 found words become positional clues for final 4-letter target **אורי**. `forced` letter set. Signature reveal.

### 1.6 The Last Recipe (BOSS)
- **Beats**: 5 (`break-seal`, `boss-hp-1`, `boss-hp-2`, `boss-hp-3`, `true-name`) graph
- **Beat 1**: ritual seal — `pangram` spelling **אש** opens combat
- **Beats 2–4**: escalating boss combat
  - HP1: `frozen(2)`
  - HP2: `frozen(2) + decay(8000ms)`
  - HP3: `frozen(2) + decay(6000ms) + swap(2000ms)`
  - Each grants one glyph in notebook
- **Beat 5 (true-name)**: small `forced` grid containing only the 5 collected glyphs + 2 distractors. Target **גחלת**. Anagram-pick — pure deduction climax.

## 7. Architecture

### Files survived from current Book 1

- All BG art (4 mcp-image generated)
- `EmberOverlay` Pixi component
- `HubFoyer`, `RoomShell` discriminator + revisit
- `gameStore` Zustand (refactor item/codex/notebook slices)
- ItemId union (stable, preserves localStorage saves)
- Story content (אש / אורי / גחלת frame)

### Files dying in rebuild

- 6 bespoke scene puzzle layers (CipherPantry 619 lines, ColdStove 583, SootedWall 670, DarkDoor 745, OldKitchen 452, LastRecipe 423)
- 3 verb hooks (`useReveal`, `useSequence`, `useCompose`)
- Affordance glow / whisper hint / auto-snap systems
- Per-room item-use bespoke handlers

### New code surface

```
fe-next/components/word-vault/grid/
  VaultGrid.tsx                ─ ~400 lines
  GridTile.tsx                 ─ ~120 lines
  modifiers/
    frozen.ts shadow.ts decay.ts swap.ts mirror.ts bind.ts lock.ts sigil.ts
  letterSource.ts              ─ pool/pangram/forced
  semanticGate.ts              ─ class → acceptList lookup w/ rarity bonus
  submit.ts                    ─ validate + classify
  __tests__/                   ─ contract tests per modifier + integration

fe-next/components/word-vault/
  Notebook.tsx                 ─ HUD clue accumulator
  Codex.tsx                    ─ post-game story-fragment viewer
  RoomShell.tsx                ─ refactored: art + clue tap routing + grid summon

fe-next/lib/word-vault/
  beats/
    r1.1.ts ... r1.6.ts        ─ pure data, easy to iterate
  state/
    notebookSlice.ts
    codexSlice.ts
    progressSlice.ts           ─ refactor existing
  semantic/
    classes.he.ts              ─ HE word classes per gate
    rarityScore.ts             ─ frequency-based bonus
```

### Dependencies

- Existing `lib/dictionary/he` for word validation
- Existing `lib/dictionary/rarity` (or new `rarityScore` if missing) for bonus scaling
- Existing AdMob hooks unaffected
- Existing PostHog analytics — add `word_vault_grid_summon`, `word_vault_beat_solved`, `word_vault_bonus_word_found`, `word_vault_invalid_attempt` events

## 8. Build sequence (room-by-room ship behind feature flag)

| Phase | Output | Days |
|---|---|---|
| 0. Spike | VaultGrid + `frozen` + `pangram`/`pool` + 1 SemanticGate. Storybook with 1.4 thaw beat | 2 |
| 1. Tutorial | 1.1 fully on new system. Validate end-to-end. Flag-gated. | 1 |
| 2. Notebook + Codex | HUD primitives + story-fragment unlock | 1 |
| 3. Rooms 1.2 → 1.5 | Each room = ~1 day (beats are data) | 4 |
| 4. Boss room 1.6 | Modifier stacking + glyph-collection notebook + final compose | 2 |
| 5. Cross-room callbacks | Wire 2 carry-clue deps (1.2→1.5, 1.1→1.3) | 1 |
| 6. Polish + balance | Difficulty tuning, rare-word lists, audio cues, RTL pass, native HE review | 2 |
| 7. Flag flip | Remove old scene puzzle code | 0.5 |

**Total: ~13.5 days** (~2.5 weeks normal pace).

## 9. Testing strategy

- **Vitest contract tests per modifier** (frozen unfreezes correctly, shadow reveals on adjacency, decay timer fires, swap doesn't drop selection state, etc.)
- **Vitest beat-runner**: pure-state simulation of full room (input clues + grid submits → expect beat-solved transitions). Replaces current scene-by-scene test suite.
- **Playwriter E2E**: 1 happy-path test per room (tap clues → summon grid → submit target → assert door opens).
- **RTL/HE checks**: snapshot test that mirror modifier flips correctly under HE locale.
- **PostHog instrumentation** for live-tuning (rejection rates per gate, completion rates per beat, time-to-solve distributions).

Net: ~30 high-coverage tests replacing ~50 scene-bespoke tests.

## 10. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Players don't know what room "needs" → frustrate-quit | Notebook always-visible; idle 90s → notebook glows; idle 3 min → vault button pulses. Nudges *what to do*, never *the answer*. |
| Semantic gate rejects valid synonyms | Curate generously; log rejected attempts to PostHog; weekly add-to-acceptList loop |
| Boss modifier stack feels unfair | Per-beat intensity flag; tune via PostHog completion rates |
| HE-only blocks broader audience | Architect SemanticGate with i18n-ready shape from day 1 (class → acceptList **per locale**); EN/SV/JA/ES rollout post-validation |
| Carry-clue confusion ("why door refuses?") | Notebook explicitly says "you sense something is missing — perhaps from another room" with hub-back affordance |
| Cipher difficulty too high for casual | Cipher concentrated in 1.3, 1.5, 1.6 (escalation curve). Rooms 1.1, 1.2, 1.4 = no cipher. |
| Player saves break on rebuild | ItemId union stable; `progressSlice` migration shim drops legacy keys safely |

## 11. What this design does NOT include (deliberate scope cut)

- Multi-book carry-over (Book 2 will reuse the engine; that design lives in `word-vault-book2-design-2026-05-03.md` and adapts after Book 1 ships)
- Daily Vault Challenge layer (post-Book-1 follow-up; engine ready for it)
- Hint economy with currency cost (v1 = idle-aware nudges only; rewarded-ad hint is a v1.1 add)
- Adjustable difficulty toggle (D3 from brainstorm; deferred — ship one curve, tune via PostHog)
- EN/SV/JA/ES localization (architecture i18n-ready, content rollout deferred)

## 12. Success criteria

- Internal playtest: testers report "I felt stuck and figured it out" at least once per room
- PostHog: median time-per-beat in 60–180s range; <15% beat-abandon rate
- Replay rate: ≥30% of completers re-enter at least one room (chasing rare-word bonuses or alt-target story fragments)
- Codex completion: ≥60% of completers unlock both story-item secret beats over time
- Subjective: user (project owner) plays through and says "yes this is fun" without invoking a 5th critique round

## 13. Implementation plan

To be authored next via `superpowers:writing-plans` skill once this design is approved.
