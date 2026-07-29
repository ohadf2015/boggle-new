# Blast Mode Redesign — Design Spec

**Date:** 2026-05-12
**Status:** Draft — pending user review
**Author:** Brainstorming session with @lexiclash.game
**Replaces:** Legacy Blast mode (waves + bombs + color-power + objectives)

---

## Executive Summary

Blast is being redesigned from an open-grid arcade-style word-find with bombs and color-power tiles into a **themed predefined-word puzzle** with stacked-column tiles, gravity-collapse on word clear, irregular silhouettes, in-tile coins and gems, frozen-tile gates, cascade discoveries, and a **chest-every-10-levels** meta-progression with deterministic preview. Visual inspiration is taken from Word Crush / Word Blocks, with the warm-wood aesthetic translated to LexiClash's neo-brutalist brand (dark navy + electric mode-color + hard pixel shadows + bold uppercase tiles).

The redesign ships behind a feature flag (`blast.v2`) alongside legacy Blast, with staged rollout and a 5-minute rollback path. All 5 locales (EN, HE, SV, JA, ES) are supported from day one through a per-locale config object. Tutorials drip-feed mechanics across the first ~40 levels.

---

## Core Loop

**One-sentence pitch:** A themed-word puzzle where each level shows a stacked-column tower of letters; find every word in the theme by swiping H or V across straight lines; cleared word tiles burst and gravity collapses the tower, exposing new word adjacencies; every 10 levels opens a treasure chest whose contents you can see in advance.

**Per-level loop (30s-3min depending on level):**

1. Intro card: `"Level N · Theme: FRUITS · 3 words"` (1.5s)
2. Board reveals — irregular columns rest on a neon shelf, ~10-30 tiles depending on level
3. Player selects: swipe-drag OR tap+double-tap, straight H or V, forward or reversed
4. Match: tile burst → coin/gem detach to HUD → gravity drop above
5. No match: gentle shake + microcopy, no penalty
6. All words found → level-complete card (stars 1-3, coins, gems, chest bar +10%, next chest preview)
7. Every 10th level → chest opens, contents already known

**Failure state:** none. Always shuffleable. Hints (lvl 18+) consume coins.

**Feel adjectives:** calm, satisfying, predictable progression, occasional gem-tile delight spike.

---

## Data Model + Content Sources

### Level shape

```ts
type BlastLevel = {
  id: string;                        // "lvl-001" or "pack-fruits-03"
  levelNumber: number;               // 1..∞
  theme: ThemeKey;                   // 'onboarding' | 'fruits' | ...
  locale: Locale;                    // 'en' | 'he' | 'sv' | 'ja' | 'es'
  words: string[];                   // ordered hardest → easiest for hint priority
  columns: BlastColumn[];            // visual board, bottom-up
  resolvableOrder: string[];         // proven solve order (validation only)
  tileFlags: Record<CellId, TileFlag[]>;
  difficulty: number;                // 1..50, drives FX intensity
  gravityMode?: 'standard' | 'lateral-slide';
  hasPivot?: boolean;                // multi-word reveal flag
};

type BlastColumn = {
  index: number;                     // 0 = leftmost (visually rightmost in HE)
  tiles: Letter[];                   // bottom-up
};

type CellId = `c${number}r${number}`;
type TileFlag = 'coin' | 'gem' | 'frozen' | 'double_bonus';
```

### Two content sources behind one interface

```ts
interface LevelSource {
  resolve(levelNumber: number, locale: Locale): Promise<BlastLevel>;
}

class CuratedPackSource implements LevelSource {
  // reads /content/blast/packs/<locale>/pack-<theme>.json
}

class GeneratedLevelSource implements LevelSource {
  // theme→word-pool lookup + constraint placement solver
}

function getLevelSource(n: number): LevelSource {
  return n <= 30 ? curated : generated;
}
```

### Day-1 content footprint

- 30 curated levels per locale × 5 locales = 150 hand-authored level JSONs (~300 KB total in repo)
- Generator handles 31+
- Per-locale theme inventory: ~20 themes × ~50 words each = ~1000 curated theme words per locale

### Storage

- Curated packs: shipped in repo at `content/blast/packs/<locale>/*.json`, no DB
- Generated levels: computed client-side, deterministic by `(levelNumber, locale, userId-bucket)`
- Player progress: `blast_progress` table (see Chest section)

### Generator algorithm

1. Pick K theme words (K = difficulty curve, 3 → 8)
2. Place first word in a random row OR column
3. For each next word: find a placement overlapping ≥1 already-placed letter
4. Fill empty cells with locale-frequency-weighted random letters
5. Forward-simulate: pop each placed word in candidate order, check next placement still reachable. If yes, save `resolvableOrder`. If no, regen
6. Roll tile flags per Mechanic Unlock Ladder rules
7. **Score interestingness** (see Engine section); reject if below threshold

### Column-silhouette policy (image-inspired)

Generator enforces variance: ≥1 tall column (height ≥ max-1), ≥2 columns shorter than max/2. Never uniform-height tower. Target the irregular wave shape from the reference image.

- Column count by level: 3-4 (lvl 1-5) → 5-6 (lvl 6-20) → 6-7 (lvl 21+)
- Column heights: 1-3 (lvl 1-5) → 1-5 (lvl 6-20) → 1-7 (lvl 21+)

---

## Visual Identity + Backgrounds

### Aesthetic translation

| Reference image element | New Blast equivalent |
|---|---|
| Wood-grain bg | Dark navy `#0b1530` + dotted-grid overlay |
| Warm wooden tiles | Mode-colored solid tiles + 4-6px hard pixel shadow |
| Overhead spotlight | Radial mode-color glow, Pixi, breathes 3s loop |
| Wood shelf bottom | Neon-strip "shelf" w/ 8px hard shadow |
| Beige tile + brown letter | Mode-tinted tile + ink-black bold letter (Fredoka 700 / Rubik 800) |
| Top HUD: back / level / coin | Same (matches image layout) |
| Bottom HUD: stars / sound / shuffle | Same + hint button |

### Tile sizing

| Level range | Cols | Tile px (phone) | Tile px (tablet+) |
|---|---|---|---|
| 1-5 | 3-4 | 88 | 112 |
| 6-15 | 4-5 | 76 | 100 |
| 16-30 | 5-6 | 68 | 92 |
| 31+ | 6-7 | 60 | 84 |

Min touch target enforced at 60px. Gap 6-8px.

### Layer composition

1. Theme bg image (`opacity 0.55`)
2. Navy gradient overlay (`opacity 0.4`)
3. Mode-color spotlight glow (Pixi, breathing)
4. Dotted-grid project pattern (`opacity 0.08`)
5. Shelf neon bar
6. Tiles + selection layer
7. Pixi FX overlay

### Tile state visuals

- **Normal:** solid tile, bold letter, hard shadow
- **Coin overlay:** small gold chip top-right (~10×10px)
- **Gem overlay:** small electric gem chip top-right, gentle pulse
- **Frozen:** ice-blue tint + crystal corners + faded letter; cannot select until adjacent clear
- **Double-bonus:** rainbow border-pulse (~5% of levels carry one)
- **Selected (in-progress):** lifts +4px, scale 1.05, brightens
- **Just-cleared:** scale-up → spritesheet shatter → particles → chip detach to HUD

### Themed background art

Per-theme hero illustration (NOT per-level). ~20-30 themes × 1 image = ~3-4 MB total content.

- Stylized flat-color illustration, NOT photoreal
- Edges soft, center vignetted to keep tiles primary visual focus
- Generation pipeline: offline script `scripts/gen-blast-theme-art.ts` calling `fal-ai/flux` with locked brand-style prompt template per theme
- Lazy-loaded via `<link rel="preload">` on level intro
- Per-level palette/time-of-day tint via CSS hue-rotate + opacity, runtime

| Theme | Background concept |
|---|---|
| onboarding | Empty navy room w/ single spotlight |
| fruits | Stylized orchard |
| animals | Cartoon savanna silhouette |
| food | Kitchen counter (closest to reference image) |
| ocean | Underwater coral |
| space | Starfield + nebula |
| nature | Pine forest at dusk |
| ...up to ~25 themes |

---

## Selection + Collapse Engine + Interestingness

### Selection state machine

```ts
type SelectionState =
  | { kind: 'idle' }
  | { kind: 'active', cells: CellId[], axis: 'H'|'V', mode: 'drag'|'tap' };

// pointerdown / tap1 → idle → active(cells=[c0], axis=undecided)
// pointermove / tap2 → axis decides on 2nd cell; reject if not straight H/V
// pointerup (drag) → submit
// dblclick (tap mode) → submit
// escape / outside-tap → cancel → idle
```

### Validation order on submit

1. `cells.length >= 2`, else cancel
2. All cells on one axis (row OR column), else reject + shake
3. Cells adjacent in axis (no gaps), else reject
4. No frozen tile in path, else reject + ice-shake
5. Word = letters joined (forward AND reversed), uppercase + locale-folded
6. Match `level.words - foundWords` → SUCCESS path
7. Else: check `bonusDictionary` (lvl 25+ only) → BONUS path
8. Else: REJECT path (shake + microcopy)

### Word-clear pipeline

```ts
async function clearWord(cells: CellId[]) {
  lockInput();
  await playShatter(cells, stagger: 40ms);
  detachOverlaysToHud(cells);  // coin + gem chips arc to HUD
  removeFromColumns(cells);
  await framerMotionGravity();  // surviving tiles auto-animate
  await checkFrozenThaw(cells);
  while (cascade = detectCascade()) {
    foundWords.add(cascade.word);
    awardCoins(scoreFor(cascade.word) * 2);
    await playCascadeFx(cascade);
    await collapse(cascade.cells);
  }
  unlockInput();
}
```

### Interestingness scoring (generator quality gate)

```ts
function interestingnessScore(level: BlastLevel): number {
  const w = {
    chain: 0.35,       // cascade opportunity count
    silhouette: 0.20,  // variance of column heights
    dependency: 0.20,  // depth of word-collapse dependency chain
    diversity: 0.15,   // letter frequency spread
    surprise: 0.10,    // multi-reveal opportunity count
  };
  return weighted sum normalized to [0,1];
}
// threshold: 0.55 — below = regen
```

This is the single most important quality gate. Without it, generator ships flat boring boards.

### Cascade words

Engine re-scans board after each collapse for any unrequested theme word that now exists. If found: bigger FX, 2× coin payout, "CASCADE!" callout, counts toward level completion. Some solve orders trigger 0 cascades, some trigger 2 → 3-star replay incentive.

### Multi-word reveal (lvl 40+)

Rare "pivot" levels: single collapse exposes 2 different valid theme words simultaneously. Player chooses which to solve first → ordering matters for chain cascades. Flagged `level.hasPivot = true`.

### Bonus dictionary words (lvl 25+)

Selecting a valid non-theme dictionary word pays +10 bonus coins (no chest progress, no cascade). Encourages exploration without breaking theme-puzzle promise. Validation uses existing per-locale dict loader.

### Asymmetric lateral-slide gravity (lvl 35+)

Rare (1 in 8 late levels). When a column empties below a remaining tile, the orphan slides one column laterally (left preferred, then right) over 220ms ease-out. Flagged `level.gravityMode = 'lateral-slide'`. Tutorial card introduces.

---

## Locale Strategy (All 5 Languages)

### Per-locale config — single source of truth

```ts
// lib/blast/locale-config.ts
type LocaleConfig = {
  locale: Locale;
  rtl: boolean;
  normalize: (s: string) => string;       // selection-match folding
  displayChar: (c: string, posInWord: number, wordLen: number) => string;
  letterFrequency: Record<string, number>;
  tilePool: string[];
  wordLengthRange: { min: number; max: number };
  themes: Record<ThemeKey, ThemeDef>;
  bonusDictionary: () => Promise<Set<string>>;
  fontStack: string;
  tileExtraPadding?: number;
};

const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = { en, he, sv, ja, es };
```

All engine code reads `LOCALE_CONFIGS[level.locale]`. No language-specific branching in components.

### Per-locale rules

| Aspect | EN | HE | SV | JA | ES |
|---|---|---|---|---|---|
| Case | uppercase | n/a | uppercase | n/a | uppercase |
| Folding (match) | uppercase | NFC + final→non-final | uppercase, å/ä/ö preserved | NFC | uppercase + **fold accents** |
| Final-form letters | n/a | render non-final on tile; final form in display only | n/a | n/a | n/a |
| Distinct extras | — | — | å ä ö | hiragana set | ñ |
| Tile pool size | 26 | 22 (no finals) | 29 | ~46 hiragana (V1) | 27 |
| Word length range | 3-7 | 3-5 | 3-7 | 2-4 | 3-7 |
| RTL board | no | YES | no | no | no |
| Font stack | Fredoka/Rubik | Rubik | Fredoka/Rubik | Noto Sans JP | Fredoka/Rubik |
| Tile padding bump | 0 | 0 | 0 | +2px | +2px |

### Locale specifics

- **HE**: RTL board via `direction: rtl` at render layer; engine cell IDs unchanged. Tiles always show non-final form; selection match folds final↔non-final. `HE_AMBIGUOUS_BLOCKLIST` for visually ambiguous stacked words.
- **JA**: V1 hiragana only (~46 base tiles). Word length 2-4. Theme pools hand-curated by JA speaker. No case folding beyond NFC. Katakana/kanji deferred to V1.5.
- **ES**: Tile renders accented glyph. Match folds accents (MURCIELAGO matches MURCIÉLAGO). Tile padding +2px.
- **SV**: å/ä/ö as first-class tiles in pool. No accent folding (ä ≠ a).

### Authoring strategy

- 30 curated packs × 5 locales = 150 authored level JSONs at launch
- Admin CLI `npm run blast:author -- --locale <l> --theme <t> --level <n>` wizards level authoring, validates with solver before write
- Re-usable for live-ops seasonal packs

### Cross-locale level numbering

Player's level number persists across locale switches. Level 12 EN ≠ level 12 HE in content, but same difficulty curve. Chest progress + previews keyed on level number, locale-independent. Coins, gems, avatar parts shared across locales.

### Testing

- Engine tests run against all 5 LocaleConfigs in CI
- 1 curated level per locale solver-validated in CI
- Hebrew RTL screenshot regression (Playwright)
- JA hiragana tile-glyph regression

### Translation keys

New `blast.*` namespace: ~80 keys × 5 locales = ~400 string translations. Authored, not machine-translated. HE/SV/JA/ES flagged for native review.

---

## Incremental Mechanic Unlock Ladder

| Level | Unlocks | Mini-tutorial card |
|---|---|---|
| 1 | Swipe-drag, ONBOARDING theme | Full FTUE overlay |
| 2 | Tap-tap + double-tap confirm | "Or tap each letter, double-tap to confirm" |
| 3 | Coin-overlay tiles (~20% spawn) | "Collect coins on every clear" |
| 4 | Reverse-direction selection | "Words can read backward too" |
| 5 | Shuffle button (1 free, then 50c) | "Stuck? Shuffle reorders remaining tiles" |
| 6 | Gem tiles (~2% spawn) | "Gems = +2% to next chest" |
| 7 | First column-of-4 | (no card — passive) |
| 8 | Frozen tile (1 per level) | "Ice blocks thaw when neighbor clears" |
| 10 | **Chest #1** + preview UI | "Open chest! Peek at your next reward →" |
| 12 | Cascade words | "CASCADE! Order matters — chase combos" |
| 15 | Double-word-bonus tile | "Rainbow tile = 2× coins" |
| 18 | Reveal-Letter hint (100c) | "Stuck? Hint reveals one letter" |
| 20 | **Chest #2** | Preview shifts to #3 |
| 22 | 2-word compound themes | (no card) |
| 25 | Bonus dictionary words (+10c) | "Real words pay bonus coins now" |
| 30 | **Chest #3** + Reveal-Word hint (300c) | "Reveal Word: pricey but instant solve" |
| 35 | Asymmetric lateral-slide gravity | "Twist level: tiles can slide sideways" |
| 40 | Multi-word reveal pivot levels | "Choose your order — picking matters" |
| 50 | Theme-pack rotation (seasonal hooks) | (soft surface in preview) |
| 60+ | Pure difficulty curve | — |

### Mini-tutorial card structure

- `<BlastUnlockCard mechanic={key} />` modal
- Appears once per mechanic per user, on level it unlocks
- Modal blocks input until dismissed
- Persistence: `blast_progress.unlocks_seen` jsonb
- Replayable: Settings → Game → Blast → "Replay Tutorials"

### Bypass for veterans

- Player w/ legacy `max_level_cleared >= 5` gets "Welcome back" card on lvl 1 instead of full FTUE
- "Skip future tutorials" link on card #2 onward (NOT on #1)
- Skip writes `unlocks_seen.skip_all = true`; future cards auto-dismiss
- Replay UI still works

### Mechanic flags (single source)

```ts
function mechanicsForLevel(n: number): MechanicSet {
  return {
    coinOverlay: n >= 3,
    reverseSelection: n >= 4,
    shuffleButton: n >= 5,
    gemTiles: n >= 6,
    frozenTiles: n >= 8,
    cascadeWords: n >= 12,
    doubleBonusTile: n >= 15,
    revealLetterHint: n >= 18,
    bonusDictionary: n >= 25,
    revealWordHint: n >= 30,
    lateralSlideGravity: n >= 35,
    multiWordReveal: n >= 40,
  };
}
```

Generator + UI read this. Locked features = invisible (not greyed). Adding a new mechanic = add entry + tutorial card + generator support.

### No-overlap rule

Never two cards in the same level. Pre-staggered schedule above guarantees gap of ≥1 level between tutorials.

---

## Chest + Meta Progression

### Chest tier system

| Chest # | Range | Tier | Coins | Boost drops | Avatar part chance | Frame skin |
|---|---|---|---|---|---|---|
| 1 | 1-10 | Wood | 200 | 0 | 0% | Wood |
| 2 | 11-20 | Wood | 250 | 1 | 0% | Wood |
| 3 | 21-30 | Silver | 400 | 1 | 8% common | Silver |
| 4 | 31-40 | Silver | 500 | 1 | 10% common | Silver |
| 5 | 41-50 | **Gold** | 800 | 2 | 20% uncommon | Gold |
| 6 | 51-60 | Silver | 600 | 1 | 12% common | Silver |
| 7 | 61-70 | Gold | 1000 | 2 | 25% uncommon | Gold |
| 8 | 71-80 | Silver | 700 | 1 | 15% | Silver |
| 9 | 81-90 | Gold | 1200 | 2 | 30% uncommon | Gold |
| 10 | 91-100 | **Legendary** | 2000 | 3 | 50% rare guaranteed | Legendary |
| 11-19 | cycle wood/silver/gold per row above | … | … | … | … | … |
| 20 | every 10th | **Legendary** | 2200+ | 3 | 50%+ rare guaranteed | Legendary |
| 21+ | repeats 1-20 pattern with +5% coin scaling per cycle | … | … | … | … | … |

Pattern law: chest number `n` resolves tier via `tierForChestNumber(n)` where every multiple of 10 = Legendary, every multiple of 5 (not also of 10) = Gold, others alternate Wood/Silver by `n % 2`. Tunable in `lib/blast/chest-config.ts`.

### Deterministic preview seeding

```ts
function rollChest(userId: string, chestNumber: number, locale: Locale): ChestContents {
  const seed = hashSha256(`${userId}:${chestNumber}`);
  const prng = seededPRNG(seed);
  const tier = tierForChestNumber(chestNumber);
  return {
    tier,
    coins: tier.coinBase + prng.intRange(tier.coinVariance),
    boosts: prng.pickN(BOOST_POOL, tier.boostCount),
    avatarPart: prng.chance(tier.avatarPartChance) ? prng.pick(AVATAR_POOL[locale]) : null,
    frameSkin: tier.frame,
  };
}
```

Chest contents committed server-side at chest-creation time (player reaches level `N % 10 == 1`). Preview shows actual contents. Client can't swap.

### Database schema

```sql
CREATE TABLE blast_progress (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  current_level int NOT NULL DEFAULT 1,
  max_level_cleared int NOT NULL DEFAULT 0,
  current_chest_number int NOT NULL DEFAULT 1,
  current_chest_progress numeric(3,2) NOT NULL DEFAULT 0.00,
  total_gems_collected int NOT NULL DEFAULT 0,
  total_coins_earned_blast int NOT NULL DEFAULT 0,
  unlocks_seen jsonb NOT NULL DEFAULT '{}',
  last_played_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE blast_chests (
  user_id uuid REFERENCES profiles(id),
  chest_number int NOT NULL,
  tier text NOT NULL CHECK (tier IN ('wood','silver','gold','legendary')),
  contents jsonb NOT NULL,
  opened_at timestamptz,
  PRIMARY KEY (user_id, chest_number)
);

CREATE TABLE blast_level_clears (
  user_id uuid REFERENCES profiles(id),
  level_number int NOT NULL,
  locale text NOT NULL,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 3),
  coins_earned int NOT NULL DEFAULT 0,
  gems_collected int NOT NULL DEFAULT 0,
  hints_used int NOT NULL DEFAULT 0,
  cascades_triggered int NOT NULL DEFAULT 0,
  time_seconds int NOT NULL,
  cleared_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, level_number)
);
```

RLS: each row scoped to `auth.uid() = user_id`. Server writes via `/api/blast/clear-level`. **No realtime publication** (no consumer needed).

### Star scoring per level

- 3 stars: 0 hints + ≤3 wrong attempts + cleared in target time
- 2 stars: ≤1 hint OR ≤5 wrong attempts
- 1 star: cleared (always)

Target time = `30s × wordCount`. Replay can upgrade record; doesn't re-fill chest bar (anti-grind).

### Chest open ceremony

1. Camera pans to chest tile (1s)
2. Tier-matching VFX (wood = soft burst → legendary = particle storm + slow-mo)
3. Contents reveal staggered: coins → boosts → avatar part
4. Next chest preview slides in as old fades out
5. Returns to level N+1

### Chest preview UI

Permanent badge top-right of HUD next to coin counter:

```
┌─────────────────┐
│  Chest #4  🏆   │
│  ▓▓▓▓░░░░ 4/10  │
│  Silver tier    │
│  +500 coins     │
│  +1 boost       │
│  10% avatar     │
└─────────────────┘
```

Tappable → full-screen preview shows exact contents (avatar part name + tier + boost icons).

### Anti-cheat

- Level clear request: server re-derives level from `(levelNumber, locale, userId-bucket)`, validates `wordsFound ⊆ level.words`, `timeSeconds >= minTimeFor(level)`, idempotent on `submissionId UUID`
- Chest open: requires `current_chest_progress == 1.00`; atomic increment

### Integration

- Coins via existing `economy/grantCoins`
- Boosts via existing `boostStore.grant()` (BoostPicker pool)
- Avatar parts via existing avatar-builder grant pipeline
- Notifications via existing `notification.system`

### Failure recovery

- Mid-level close: progress unchanged, resume next session
- DB outage at chest seeding: client-side fallback w/ same seeded PRNG, reconciles on next write
- Duplicate avatar part: "Duplicate → 50 coins" payout merge

---

## FX / Animation Catalog

Reuse-first. Pixi + Framer Motion + GSAP + existing `usePracticeJuice({ fxRef, burstColor })` hook.

### FX layers

| Layer | Tech | Purpose |
|---|---|---|
| L1 atmosphere | Pixi canvas | Spotlight, ambient dust |
| L2 tiles | React DOM + Framer Motion | Render, drag, collapse |
| L3 selection path | SVG overlay | Connecting line |
| L4 burst | Pixi canvas | Shatter, gem, coin, cascade |
| L5 HUD | DOM + Framer Motion | Counters, chest, found-list |

### FX catalog

| Trigger | Composition | Duration | Haptic |
|---|---|---|---|
| Word selected | L3 path draws; L2 tiles lift; L1 spotlight +20% | ongoing | light tick per tile |
| Word valid (theme) | L2 flash → shatter; L4 burst; chips arc to HUD | 800ms | medium success |
| Word valid (CASCADE) | Above + L4 radial pulse + callout + screen shake 4px | 1100ms | heavy double-pulse |
| Word valid (BONUS dict) | L2 shimmer (no shatter); L4 gold sparkle; +10 coins | 500ms | light single |
| Double-bonus tile in word | Above + L4 rainbow shockwave + "×2" callout | +400ms | medium triple |
| Gem collected | Layer over: L4 prismatic burst + gem arc + chest bar surge | +200ms | distinct heavy ping |
| Word INVALID | L2 shake 6px; L3 path red flash; microcopy toast | 400ms | error tick |
| Frozen blocks select | L2 cyan pulse + "❄" bounce | 300ms | none |
| Frozen auto-thaws | L4 crystal-crack sprite + ice particles | 700ms | medium single |
| Gravity collapse | L2 Framer Motion layout, ~80ms/tile | 200-600ms | none |
| Lateral slide | L2 lateral 220ms ease-out + 8° wobble | 220ms | light tick |
| Level complete | L1 bloom; L4 confetti; L5 card slide; stars pop | 2500ms | success chord |
| Chest progress fill | L5 bar segment sweep + shimmer | 600ms | light pulse |
| Chest unlock | L5 bar glow + chest shake + callout | 1000ms | medium pulse |
| Chest open (wood) | Soft burst + lid lift + staggered reveal | 3500ms | medium |
| Chest open (silver/gold) | Above + larger burst + screen shake + light flash | 4500ms | heavy |
| Chest open (legendary) | Above + slow-mo 0.5× + particle storm + rainbow rim | 6000ms | heavy + continuation |
| Avatar part drop | Item zoom from chest + collection toast | 1500ms | distinct triple |
| Hint: Shuffle | L2 cross-fade swap stagger 30ms | 800ms | light pulse |
| Hint: Reveal Letter | L2 tile pulse gold + arrow 2s | 2000ms | medium ping |
| Hint: Reveal Word | L2 auto-select word path slow → clear | 1800ms | medium success |
| Spotlight breath (idle) | L1 opacity 0.4↔0.55, 3s loop | continuous | none |

### Reduced-motion

`useReducedMotion()` gated:
- Particles → reduced
- Screen shakes → off
- Slow-mo (legendary) → off
- Spotlight breath → static
- Callout scale anims → off

Gameplay-essential FX (shatter, frozen-thaw indicator) preserved in simplified form.

### Asset budget

- Tile shatter spritesheet: 8 frames, ~12 KB PNG mode-tintable
- Frozen-crack: 6 frames, ~8 KB
- Coin + gem chip overlays: ~4 KB each
- Chest tier sprites: 4 tiers × 2 states = ~40 KB total
- Pixi particle textures: 3 × ~3 KB
- Total NEW: ~80 KB

### Sound (V1.5)

V1 reuses Practice word-found chime + Adventure coin SFX. Authoring new chest-open + cascade SFX deferred.

---

## Tutorial Implementation

### Level 1 FTUE — 6 steps

Theme = ONBOARDING. Board 3×3. Words = CAT, SUN, EGG (en) / pre-authored equivalents in other locales.

| Step | Content | Required action | Auto-advance |
|---|---|---|---|
| 1 | Arrow on leftmost tile + "Drag across letters to spell a word" | start drag | on `pointerdown` |
| 2 | Finger-icon traces CAT slow → "Try it: drag from C to T" | complete drag through 3+ tiles | on submit |
| 3 | After 1st found: freeze + "Letters above fall to fill the space" (slow-motion collapse 800ms) | observation | timer 2s |
| 4 | Theme reveal: "Find 3 ANIMAL-related words." Silhouette pips ●○○ | find 2nd word | on submit |
| 5 | After 2nd: "Or tap each letter, then double-tap to confirm" + finger demo | find 3rd via EITHER mode | on submit |
| 6 | Level-complete variant: "Level 1! Watch your chest bar →" highlights chest preview | tap NEXT LEVEL | on tap |

### Per-mechanic mini-tutorial cards

```
┌────────────────────────────┐
│ ✨ NEW: FROZEN TILES        │
│   [icon]                   │
│ Ice blocks won't fall.     │
│ Clear an adjacent tile     │
│ to thaw them.              │
│       [ Got it ]           │
└────────────────────────────┘
```

- Trigger from `BlastGame` on level-start when new mechanic detected vs `unlocks_seen`
- Content from `messages/<locale>.json` keys `blast.tutorial.mechanic.<key>.{title,body}`
- Persists dismiss to `unlocks_seen`
- Reduced-motion uses fade-only entry

### Skip path

- "Skip future tutorials" link on card #2+
- Writes `unlocks_seen.skip_all = true` → future cards auto-dismiss
- Replay UI ignores skip-all flag (opt-in re-viewing always works)

### String budget

- L1 FTUE: 30 strings (6 × 5 locales)
- Mechanic cards: ~120 strings (12 × 5 locales × {title,body})
- Replay UI: ~25 strings
- **Total ~175 new tutorial strings** — HE/SV/JA/ES native-speaker review required

---

## Telemetry + Migration + Flag Rollout

### PostHog event taxonomy

```ts
// Per-level lifecycle
blast_level_started   { level, locale, theme, mechanics: string[] }
blast_word_found      { level, word, axis, length, isCascade, isBonus }
blast_word_rejected   { level, attempted_word, length, reason }
blast_hint_used       { level, hint_type, coin_cost }
blast_level_completed { level, locale, theme, time_seconds, hints_used, cascades, stars, coins_earned, gems_collected }
blast_level_abandoned { level, locale, time_in_level_seconds, words_found_count }

// Meta
blast_chest_opened    { chest_number, tier, coins, boosts_count, avatar_part?, is_duplicate }
blast_chest_previewed { chest_number, tier, level }

// Tutorial
blast_ftue_step       { step_number, advance_reason }
blast_tutorial_seen   { mechanic, level, dismiss_via }

// Canonical funnel
game_started          { mode: 'blast', level }
game_completed        { mode: 'blast', level, success }
```

All events include `is_cg` super-prop.

### Key dashboards

- FTUE funnel: lvl 1 start → 1 complete → 5 → 10
- Chest open rate by chest #
- Hint usage by level (identifies too-hard levels)
- Cascade trigger rate (target 0.3-0.6 per cleared level)
- Tutorial skip rate by card N
- Avatar part drop → profile-view-within-1h (excitement proxy)

### Migration phases

**Phase 0 — pre-launch (1 sprint):** legacy Blast ships. New code under `components/blast/v2/` behind flag `blast.v2 = off`.

**Phase 1 — internal (1 day):** flag on for `role IN ('admin','tester')`. Smoke on real devices.

**Phase 2 — staged (1 week):** PostHog flag rollout 10% → 25% → 50% → 100%. Each step gated on:
- Lvl 1 → lvl 5 retention ≥ legacy
- Crash rate ≤ baseline
- Avg session length ≥ legacy

**Phase 3 — legacy deprecation (1 release after 100%):** delete `components/blast/legacy/`, `backend/modules/blastModeManager.ts`, `blastWaveConfig.ts`, all wave-based tests. Single PR.

### Player progress migration

- `profiles.blast_access` continues to gate Blast entry — no change
- Legacy `blast_*` analytics tables: keep historical, no migration
- **Fresh-start design choice:** v2 starts every existing player at v2 level 1. Communicated via in-app banner: "Blast is back — totally redesigned. Start at Level 1 for fresh chests."
- **Veteran bonus:** legacy players with any prior Blast play history (detected via `blast_access = true` AND prior `game_completed` event with `mode='blast'`) get a one-time +500 coin bonus on their first v2 level clear. Bookkeeping flag `unlocks_seen.veteran_bonus_granted = true` ensures it fires exactly once.

### Feature-flag wiring

```ts
// lib/blast/flags.ts
export function useBlastVersion() {
  const v2Enabled = usePostHogFlag('blast.v2');
  return v2Enabled ? 'v2' : 'legacy';
}
```

Used at `/app/[locale]/blast/page.tsx` to route to BlastV2PageClient or legacy.

### Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Generator flat boring boards | Retention drop | Interestingness gate + manual audit of first 50 generated per locale |
| Tutorial copy missed in HE/JA native review | Confusing FTUE | Native review gate before Phase 2 rollout |
| Chest preview RNG exposed | Economy abuse | Server-commit at chest creation; client can't regen |
| Backlash vs old Blast | Engagement drop | PostHog flag flip restores legacy in <5min |
| Cascade rate too low → meh | Engagement decay | Telemetry dashboard + tunable interestingness weights |
| Curated authoring slow per locale | Day-1 content gap | Generator handles all 1..N day-one; curated replaces when authored |

### Success criteria (3 months post-launch)

- DAU on Blast ≥ 110% of legacy peak
- Day-7 retention ≥ 25% of new Blast players
- Avg session length ≥ 8 min
- Chest open count per DAU per week ≥ 0.8
- L1 FTUE completion ≥ 85%
- Avatar part contribution from Blast ≥ 15% of new parts collected

---

## File Structure (new code)

```
fe-next/
├── app/[locale]/blast/
│   ├── page.tsx                       # routes v1/v2 by flag
│   ├── PageClient.tsx                 # legacy (unchanged)
│   └── v2/
│       └── BlastV2PageClient.tsx      # NEW entry
├── components/blast/
│   ├── legacy/                        # current code moved here
│   └── v2/
│       ├── BlastGame.tsx              # orchestrator
│       ├── BlastBoard.tsx             # columns + tiles
│       ├── BlastTile.tsx              # single tile + state visuals
│       ├── BlastSelectionPath.tsx     # SVG path overlay
│       ├── BlastFxOverlay.tsx         # Pixi L4 burst layer
│       ├── BlastAtmosphereOverlay.tsx # Pixi L1 ambient layer
│       ├── BlastHud.tsx               # top + bottom HUD
│       ├── BlastChestBadge.tsx        # preview pill
│       ├── BlastChestOpenModal.tsx    # ceremony
│       ├── BlastUnlockCard.tsx        # per-mechanic tutorial
│       ├── BlastFtueOverlay.tsx       # L1 6-step FTUE
│       ├── BlastLevelCompleteCard.tsx
│       └── __tests__/
├── lib/blast/
│   ├── level-source.ts                # interface + curated + generated impls
│   ├── generator.ts                   # constraint solver + interestingness
│   ├── locale-config.ts               # 5 LocaleConfigs
│   ├── themes.en.ts / he.ts / sv.ts / ja.ts / es.ts
│   ├── selection.ts                   # state machine
│   ├── collapse.ts                    # gravity + cascade detection
│   ├── chest.ts                       # chest tier + rolling + open
│   ├── mechanic-flags.ts              # mechanicsForLevel()
│   ├── flags.ts                       # useBlastVersion()
│   └── telemetry.ts                   # PostHog event helpers
├── content/blast/packs/
│   ├── en/pack-onboarding.json
│   ├── en/pack-fruits.json
│   ├── ... (× 5 locales × ~6 packs)
├── public/blast/themes/
│   ├── fruits.webp
│   ├── animals.webp
│   ├── ... (~25 themes)
└── scripts/
    └── gen-blast-theme-art.ts         # offline image gen
```

DB migrations:

```
migrations/
└── 2026XXXX_blast_v2_tables.sql       # blast_progress, blast_chests, blast_level_clears
```

Translation keys (~400 new entries across `translations/{en,he,sv,ja,es}.js`).

---

## Open Questions (resolve during implementation planning)

1. Mode color for Blast — keep current Blast mode color (likely electric pink/cyan) or pick fresh? Defer to UI implementation.
2. Premium pack pricing model — if monetized, defer to live-ops decision.
3. Sound design budget — V1 reuses; V1.5 deferred. Confirm before launch.
4. Generator backfill: should it pre-generate next 5 levels in advance for instant intro card? Likely yes for perf.

---

## Recommended Implementation Sequence

Once user approves this spec, hand off to `writing-plans` skill. Plan should split into the following independent build streams:

1. **Stream A: Foundations** — Locale config, level data shape, generator core, interestingness scoring
2. **Stream B: Rendering** — Tile, Board, SelectionPath, BlastGame orchestrator, gravity/collapse anim
3. **Stream C: Engine** — Selection state machine, validation pipeline, cascade detection, bonus dict
4. **Stream D: Meta** — Chest tier system, DB schema + RLS, preview seeding, open ceremony
5. **Stream E: FX** — Pixi atmosphere + burst layers, all FX moments wired
6. **Stream F: Tutorial** — FTUE overlay, mechanic unlock cards, replay UI
7. **Stream G: Content** — 30 curated packs × 5 locales, theme bg art generation, translation authoring
8. **Stream H: Telemetry + Migration** — PostHog events, dashboards, flag rollout gates

Streams A → C → B can pipeline. Stream D depends on B. Streams E, F, G can run in parallel after B exists. Stream H is final cutover.

TDD applied per project standards (mandatory RED-GREEN-REFACTOR).
