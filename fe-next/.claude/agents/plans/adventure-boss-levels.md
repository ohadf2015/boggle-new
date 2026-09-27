# Feature: Adventure Mode Boss Levels with Twist Gameplay

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Implement unique boss battles for each of the 10 adventure mode worlds. Each boss (level 7 of each world) will have distinctive "twist gameplay" mechanics, witty dialogue, and a generated boss character image. The bosses should feel like real game experiences with humor, personality, and engaging challenges.

## User Story

As a LexiClash player
I want to face unique boss battles at the end of each world
So that I experience memorable, challenging, and fun gameplay moments

## Problem Statement

Currently, boss levels (level 7 of each world) are marked with `isBossLevel: true` and have boss names defined, but they play identically to regular levels with no unique mechanics, visuals, or personality.

## Solution Statement

Implement a boss battle system that:
1. Adds unique "twist mechanics" to each boss fight
2. Displays boss character images (generated via MCP, later replaced with GIFs)
3. Shows boss dialogue/taunts during gameplay
4. Creates memorable victory/defeat experiences
5. Scales difficulty appropriately across worlds

## Feature Metadata

**Feature Type:** New Capability (major feature)
**Estimated Complexity:** High (multi-component, cross-cutting)
**Primary Systems Affected:**
- `types/adventure.ts` - New boss-specific types
- `lib/adventure/levelConfig.ts` - Boss twist mechanics configuration
- `lib/adventure/bossConfig.ts` - NEW: Boss personalities, dialogue, mechanics
- `components/adventure/BossIntro.tsx` - NEW: Boss introduction cutscene
- `components/adventure/BossDialogue.tsx` - NEW: In-game boss taunts
- `components/adventure/BossVictory.tsx` - NEW: Victory/defeat celebration
- `components/adventure/AdventureGame.tsx` - Integration of boss mechanics
- `translations/*.js` - Boss dialogue in 4 languages
- `public/images/adventure/bosses/` - NEW: Generated boss images
**Dependencies:** MCP image generation for boss visuals

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `types/adventure.ts` (lines 131-156)
  - **WHY:** Contains `LevelConfig` interface that needs boss twist properties
  - **PATTERN:** TypeScript interfaces with JSDoc comments

- `lib/adventure/levelConfig.ts` (lines 33-156)
  - **WHY:** Contains `WorldConfig` with `bossName`, need to extend for twist mechanics
  - **PATTERN:** Exported configs with getter functions

- `lib/adventure/constants.ts` (lines 100-143)
  - **WHY:** Defines `TILE_TYPES` and `OBJECTIVE_TYPES` for boss mechanics
  - **PATTERN:** Const objects with uppercase keys

- `components/adventure/AdventureGame.tsx`
  - **WHY:** Main game component that needs to integrate boss mechanics
  - **PATTERN:** Functional component with hooks, game state management

- `components/adventure/LevelCompleteModal.tsx` (lines 1-100)
  - **WHY:** Victory modal pattern to follow for BossVictory component
  - **PATTERN:** Framer Motion animations, InteractiveMascot integration

- `components/adventure/LevelGrid.tsx` (lines 42-53)
  - **WHY:** Shows how world images are mapped and loaded
  - **PATTERN:** Record mapping for image paths, WebP format

- `translations/en.js` (lines 3639-3820)
  - **WHY:** Adventure translation structure to follow
  - **PATTERN:** Nested objects with translation keys

### New Files to Create

- `lib/adventure/bossConfig.ts` - Boss personalities, twist mechanics, dialogue
- `types/boss.ts` - Boss-specific TypeScript types
- `components/adventure/BossIntro.tsx` - Boss intro cutscene component
- `components/adventure/BossDialogue.tsx` - In-game boss taunts overlay
- `components/adventure/BossVictory.tsx` - Victory/defeat celebration
- `hooks/useBossMechanics.ts` - Custom hook for boss twist logic
- `public/images/adventure/bosses/*.webp` - 10 boss character images

### Patterns to Follow

**Boss Config Pattern (based on WorldConfig):**

```typescript
// ✅ GOOD: Follows existing config pattern
export interface BossConfig {
  id: string;
  worldId: number;
  displayName: string; // Translation key
  personality: string; // Short description
  twistMechanic: BossTwistMechanic;
  taunts: BossTaunts;
  visualTheme: string;
  imagePath: string;
}

export const BOSS_CONFIGS: Record<number, BossConfig> = {
  1: {
    id: 'msGrammar',
    worldId: 1,
    displayName: 'adventure.bosses.msGrammar.name',
    // ...
  }
};
```

**Component Pattern (based on LevelCompleteModal):**

```typescript
// ✅ GOOD: Follows existing modal component pattern
const BossIntro = memo<BossIntroProps>(({ boss, onStart, onSkip }) => {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          'fixed inset-0 z-50',
          'flex items-center justify-center',
          'bg-neo-black/80 backdrop-blur-xs'
        )}
      >
        {/* Content */}
      </motion.div>
    </AnimatePresence>
  );
});
```

---

## BOSS DESIGNS

### World 1: Ms. Grammar (Tutorial Boss)

**Personality:** A prim owl schoolteacher who treats every game as a pop quiz. Secretly roots for players.

**Twist Mechanic: "Pop Quiz Protocol"**
- Ms. Grammar assigns word requirements ("Find a word with double letters!")
- Bonus points for meeting requirements
- "Red marks" (minor penalty) for off-target words
- Gold Star tiles appear on words matching current requirement

**Taunts:**
- "Did you even READ the assignment? I asked for FOUR letters, not three!"
- "Acceptable. Don't expect extra credit for the bare minimum."
- "That's not a word! This goes on your permanent record."

**Visual:** Owl with half-moon spectacles, graduation cap, red marking pen

---

### World 2: Spelling Bee

**Personality:** A giant bee who's annoyed people expect her to spell. Runs a honey empire.

**Twist Mechanic: "Hive Mind Havoc"**
- Honey tiles stick letters together - must include adjacent letters
- Find synonym pairs to "un-stick" honey tiles
- Worker bees temporarily block tiles on misses

**Taunts:**
- "Oh, you found 'big'? How about something that MEANS big? Synonyms, sweetheart."
- "Buzz buzz, that's the sound of me not being impressed. Also I'm a bee."
- "That word? Honey, please."

**Visual:** Queen bee the size of a corgi, tiny crown, "Bee-yond Words" sash

---

### World 3: Professor Thesaurus

**Personality:** Ancient tortoise academic who forgot more words than most will learn. Speaks in elaborate synonyms.

**Twist Mechanic: "Etymology Excavation"**
- Words with shared Greek/Latin roots create combos
- "Fossil Tiles" contain root fragments (bio-, graph-, tele-)
- Common letters (E, T, A) periodically get "Buried"

**Taunts:**
- "You found 'walk.' Pedestrian! Perhaps try 'perambulate'?"
- "Your lexicon appears... limited."
- "That word is from the 12th century. A bit modern, but I'll allow it."

**Visual:** Distinguished tortoise in tweed jacket, monocle, etymology scrolls

---

### World 4: Captain Metaphor

**Personality:** Theatrical pirate who ONLY speaks in idioms. Doesn't understand why this confuses people.

**Twist Mechanic: "Figurative Fleet Battle"**
- Captain shouts idioms ("It's raining cats and dogs!")
- Find literal words from idiom (RAIN, CATS, DOGS) to deflect attacks
- Anchor Tiles lock letters until idiom challenge completed

**Taunts:**
- "Avast! You're barking up the wrong tree! Which is strange because we're at SEA!"
- "Shiver me metaphors! You've got bigger fish to fry!"
- "Don't count your chickens! I need CHICKEN, COUNT, and BEFORE!"

**Visual:** Flamboyant parrot pirate captain, coat with idiom patches, question-mark hook

---

### World 5: Baron Buildaword

**Personality:** Steampunk inventor obsessed with word efficiency. Baffled that everything isn't a compound word.

**Twist Mechanic: "Assembly Line Assault"**
- Conveyor belts move letters
- Find component words separately (BUTTER + FLY) for triple score
- Machines combine random tiles into locked compound tiles

**Taunts:**
- "INEFFICIENT! You could be COMPOUNDING! Think BUTTER-FLY, not 'butter'!"
- "My Word-Assembly-Matic 3000 is faster! And it hasn't been invented yet!"
- "That's not compound! It's merely... a word. How un-engineered!"

**Visual:** Weasel in steampunk goggles, top hat with gears, wrench-dictionary combo

---

### World 6: Puzzle Master

**Personality:** Enigmatic cat in domino mask who speaks in riddles. Finds straightforward communication offensive.

**Twist Mechanic: "Scrambled Reality"**
- Letters visually scramble and unscramble when selected
- Anagram pairs (LISTEN/SILENT) trigger stability bonuses
- Riddle Tiles reveal true letter after solving quick puzzle

**Taunts:**
- "Rearrange 'NOTES' and tell me what you find. I'll wait. I have nine lives."
- "You found 'CARE.' But did you see 'RACE' and 'ACRE'?"
- "A straight answer? How BORING. ROBING. Figure it out."

**Visual:** Silver cat with heterochromatic eyes (? and !), domino mask, Rubik's cube

---

### World 7: Reflection King

**Personality:** Dramatic ice monarch who believes he's everyone's protagonist. Incredibly vain but not evil.

**Twist Mechanic: "Mirror Match Mayhem"**
- Grid is mirrored - left half actions affect right half
- Ice Tiles crack on touch, shatter after two uses
- Palindromes (RADAR, LEVEL) perform "Perfect Reflections" clearing ice on both sides

**Taunts:**
- "Behold my perfection! Also look for palindromes - the only words beautiful enough!"
- "You crack my ice? The TRAGEDY! Actually, do it again."
- "This battle shall be LEGENDARY! They'll write EPICS about... mainly me."

**Visual:** Peacock made of crystal/ice, elaborate crown of frozen letters, mirror tail feathers

---

### World 8: Cosmic Wordsmith

**Personality:** Ancient space entity who invented several languages. Deeply disappointed mortals "use words wrong."

**Twist Mechanic: "Stellar Word Forge"**
- Unstable Tiles cycle letters (A→E→I→O→U)
- Rare letters (Q, X, Z) create "Supernova Bursts" stabilizing nearby tiles
- Black Hole Tiles devour adjacent letters unless used in time

**Taunts:**
- "I was PRESENT when your ancestors grunted their first words. I expected more."
- "You use 'literally' to mean 'figuratively.' I INVENTED both. The irony is COSMIC."
- "That word? I workshopped seventeen versions. You're welcome."

**Visual:** Celestial jellyfish with letter tendrils, constellation eyes, orbiting word galaxies

---

### World 9: Linguist Sage

**Personality:** Wise mountain goat who achieved enlightenment through ALL languages. Mixes them together chaotically.

**Twist Mechanic: "Babel's Summit"**
- Loanword Tiles contain special characters (é, ñ, ü, ø) for bonus points
- Dictionary periodically switches languages
- Words valid in MULTIPLE languages trigger "Universal Understanding" bonuses

**Taunts:**
- "Ah, 'hello'! Or 'konnichiwa.' Or 'bonjour.' Or 'nuqneH.' All correct! Wait, what were we doing?"
- "Find universal TRUTH! Also the word 'TRUTH.' Unless Swedish activates. Then 'SANNING.'"
- "Every word is borrowed! 'Kindergarten' is German! 'Safari' is Swahili!"

**Visual:** Ancient goat with beard containing tiny nation flags, robes covered in alphabets

---

### World 10: Lexicon Dragon (Final Boss)

**Personality:** Ultimate word nerd transcended into dragon form. Anxious and overenthusiastic - wants to make friends!

**Twist Mechanic: "The Final Word"**
- Combines ALL previous mechanics in phases
- Phases cycle through each boss's twist
- "LEXICON STRIKE" meter charges through correct plays
- "DRAGON'S HOARD" showers board with golden tiles requiring longer words

**Taunts:**
- "OH WOW A CHALLENGER! Want to see my word journal? It's only 47 volumes!"
- "You found 'DRAGON'! THAT'S ME! Now find 'MAGNIFICENT' because that's ALSO me!"
- "I really hope you win so we can be friends! But winning is also fun! VERY CONFLICTING!"

**Visual:** Golden dragon with scales made of letters, dictionary page wings, tiny reading glasses

---

## IMPLEMENTATION PLAN

### Phase 1: Type Definitions & Configuration (Foundation)

**Goal:** Create type system and static configuration for all bosses

**Tasks:**
1. Create boss types in `types/boss.ts`
2. Create boss configuration in `lib/adventure/bossConfig.ts`
3. Extend `LevelConfig` for boss twist properties
4. Add boss translation keys

### Phase 2: Boss Visual Assets

**Goal:** Generate boss character images using MCP

**Tasks:**
1. Generate 10 boss images (one per world)
2. Optimize images for web (WebP, <200KB)
3. Set up image path mapping

### Phase 3: Boss UI Components

**Goal:** Create React components for boss presentation

**Tasks:**
1. BossIntro component (pre-battle cutscene)
2. BossDialogue component (in-game taunts)
3. BossVictory component (victory/defeat celebration)
4. Integration with AdventureGame

### Phase 4: Boss Mechanics Implementation

**Goal:** Implement twist gameplay mechanics

**Tasks:**
1. Create useBossMechanics hook
2. Implement each boss's unique mechanic
3. Integrate mechanics with game state
4. Add boss-specific objective types

### Phase 5: Testing & Polish

**Goal:** Ensure quality and fun factor

**Tasks:**
1. Unit tests for boss configuration
2. Integration tests for boss mechanics
3. Visual testing across screen sizes
4. Gameplay balance testing

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `types/boss.ts`

- **IMPLEMENT:** Boss-specific TypeScript interfaces
- **PATTERN:** Follow `types/adventure.ts` structure
- **IMPORTS:** Import from `@/types/adventure` for shared types
- **VALIDATE:** `npm run lint -- --fix && npm run build`

```typescript
// types/boss.ts
export type BossTwistType =
  | 'popQuiz'           // Ms. Grammar - category requirements
  | 'hiveMind'          // Spelling Bee - sticky tiles + synonyms
  | 'etymologyDig'      // Professor Thesaurus - root word chains
  | 'idiomBattle'       // Captain Metaphor - idiom challenges
  | 'assemblyLine'      // Baron Buildaword - compound construction
  | 'scrambledReality'  // Puzzle Master - anagram chaos
  | 'mirrorMatch'       // Reflection King - palindrome power
  | 'stellarForge'      // Cosmic Wordsmith - evolving letters
  | 'babelSummit'       // Linguist Sage - language switching
  | 'finalWord';        // Lexicon Dragon - all mechanics

export interface BossTaunts {
  onStart: string[];
  onGoodWord: string[];
  onBadWord: string[];
  onMechanic: string[]; // Triggered by boss mechanic
  onLowTime: string[];
  onVictory: string;
  onDefeat: string;
}

export interface BossTwistMechanic {
  type: BossTwistType;
  description: string; // For UI display
  params: Record<string, unknown>; // Mechanic-specific parameters
}

export interface BossConfig {
  id: string;
  worldId: number;
  displayName: string;
  personality: string;
  visualTheme: string;
  imagePath: string;
  twistMechanic: BossTwistMechanic;
  taunts: BossTaunts;
}

export interface BossGameState {
  currentTauntIndex: number;
  lastTauntTime: number;
  mechanicState: Record<string, unknown>;
  phase?: string; // For multi-phase bosses
}
```

---

### Task 2: CREATE `lib/adventure/bossConfig.ts`

- **IMPLEMENT:** Boss configurations for all 10 worlds
- **PATTERN:** Follow `levelConfig.ts` pattern with exported configs and getter functions
- **IMPORTS:** Import types from `@/types/boss`
- **VALIDATE:** `npm run test -- --testPathPattern=bossConfig`

```typescript
// Key structure - implement all 10 bosses
export const BOSS_CONFIGS: Record<number, BossConfig> = {
  1: {
    id: 'msGrammar',
    worldId: 1,
    displayName: 'adventure.bosses.msGrammar.name',
    personality: 'A prim owl schoolteacher who treats every game as a pop quiz',
    visualTheme: 'school-owl',
    imagePath: '/images/adventure/bosses/ms-grammar.webp',
    twistMechanic: {
      type: 'popQuiz',
      description: 'adventure.bosses.msGrammar.mechanic',
      params: {
        requirementTypes: ['doubleLetters', 'startsWith', 'exactLength', 'category'],
        requirementDuration: 20, // seconds per requirement
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.8,
      },
    },
    taunts: {
      onStart: [
        'adventure.bosses.msGrammar.taunts.start1',
        'adventure.bosses.msGrammar.taunts.start2',
      ],
      // ... more taunts
    },
  },
  // ... remaining 9 bosses
};

export function getBossConfig(worldId: number): BossConfig | null { ... }
export function getBossTaunt(worldId: number, event: keyof BossTaunts): string { ... }
```

---

### Task 3: UPDATE `types/adventure.ts`

- **IMPLEMENT:** Add boss-related properties to LevelConfig
- **PATTERN:** Extend existing interface, maintain backward compatibility
- **VALIDATE:** `npm run build`

```typescript
// Add to LevelConfig interface:
export interface LevelConfig {
  // ... existing properties

  /** Boss twist mechanic for boss levels */
  bossTwist?: BossTwistType;
  /** Whether to show boss intro cutscene */
  showBossIntro?: boolean;
}
```

---

### Task 4: ADD Boss Translations

- **IMPLEMENT:** Add boss dialogue to all 4 translation files
- **PATTERN:** Follow existing `adventure.` structure
- **FILES:** `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`
- **VALIDATE:** `npm run build`

```javascript
// Add to adventure object in each translation file
bosses: {
  msGrammar: {
    name: "Ms. Grammar",
    mechanic: "Pop Quiz Protocol - Find words matching my requirements!",
    taunts: {
      start1: "Class is in session! Let's see if you've been studying...",
      start2: "Pop quiz time! I hope you're prepared!",
      goodWord: "Acceptable. But don't expect extra credit for the bare minimum.",
      badWord: "That's not a word! This goes on your permanent record.",
      mechanic: "Did you even READ the assignment? I asked for {requirement}!",
      lowTime: "Time's almost up! Just like a student who didn't study...",
      victory: "Well, well... it seems you CAN follow instructions. A gold star for you!",
      defeat: "See me after class... for remedial vocabulary.",
    },
  },
  // ... remaining bosses
}
```

---

### Task 5: GENERATE Boss Images with MCP

- **IMPLEMENT:** Generate 10 boss character images
- **PATTERN:** Follow existing adventure image naming (`/images/adventure/bosses/`)
- **FORMAT:** WebP, quality 80, effort 6, <200KB
- **VALIDATE:** Visual inspection of generated images

**Image Generation Prompts (use MCP):**

1. **Ms. Grammar:** "A dignified owl character wearing half-moon spectacles and a graduation cap, holding a red marking pen. Neo-brutalist style, bold colors, dark background, character portrait for a word puzzle game"

2. **Spelling Bee:** "A fabulous queen bee the size of a corgi wearing a tiny crown and a sash reading 'Bee-yond Words', with shimmer letter-patterned wings. Neo-brutalist style, bold colors, dark background, character portrait"

3-10. (Similar prompts for remaining bosses based on visual descriptions above)

---

### Task 6: CREATE `components/adventure/BossIntro.tsx`

- **IMPLEMENT:** Pre-battle boss introduction cutscene
- **PATTERN:** Follow `LevelCompleteModal.tsx` for animation patterns
- **IMPORTS:** Framer Motion, cn utility, useLanguage, boss config
- **VALIDATE:** `npm run test -- --testPathPattern=BossIntro`

```typescript
interface BossIntroProps {
  boss: BossConfig;
  worldNumber: number;
  onStart: () => void;
  onSkip: () => void;
}
```

---

### Task 7: CREATE `components/adventure/BossDialogue.tsx`

- **IMPLEMENT:** In-game boss taunt overlay
- **PATTERN:** Toast-like overlay, positioned near game area
- **IMPORTS:** Framer Motion, AnimatePresence
- **VALIDATE:** `npm run test -- --testPathPattern=BossDialogue`

```typescript
interface BossDialogueProps {
  boss: BossConfig;
  currentTaunt: string;
  isVisible: boolean;
  position?: 'top' | 'bottom';
}
```

---

### Task 8: CREATE `components/adventure/BossVictory.tsx`

- **IMPLEMENT:** Victory/defeat celebration with boss reactions
- **PATTERN:** Extend `LevelCompleteModal` pattern with boss personality
- **IMPORTS:** InteractiveMascot, Framer Motion
- **VALIDATE:** `npm run test -- --testPathPattern=BossVictory`

---

### Task 9: CREATE `hooks/useBossMechanics.ts`

- **IMPLEMENT:** Custom hook managing boss twist gameplay
- **PATTERN:** Follow existing hooks in `/hooks/`
- **VALIDATE:** `npm run test -- --testPathPattern=useBossMechanics`

```typescript
interface UseBossMechanicsReturn {
  // Mechanic state
  isActive: boolean;
  currentRequirement?: string; // For popQuiz
  currentIdiom?: string; // For idiomBattle

  // Mechanic actions
  checkWord: (word: string) => BossMechanicResult;
  triggerTaunt: (event: keyof BossTaunts) => void;
  advancePhase: () => void; // For finalWord

  // UI state
  currentTaunt: string | null;
  showTaunt: boolean;
}

export function useBossMechanics(boss: BossConfig | null, gameState: AdventureGameState): UseBossMechanicsReturn;
```

---

### Task 10: UPDATE `components/adventure/AdventureGame.tsx`

- **IMPLEMENT:** Integrate boss mechanics into main game
- **PATTERN:** Add boss-specific state and effects
- **VALIDATE:** `npm run test -- --testPathPattern=AdventureGame`

**Changes:**
1. Import boss config and hooks
2. Add boss intro state (show before game starts on boss levels)
3. Integrate useBossMechanics hook
4. Add BossDialogue overlay
5. Replace LevelCompleteModal with BossVictory for boss levels

---

### Task 11: CREATE Unit Tests

- **IMPLEMENT:** Tests for boss configuration and mechanics
- **PATTERN:** Follow existing test patterns
- **FILES:**
  - `lib/adventure/__tests__/bossConfig.test.ts`
  - `hooks/__tests__/useBossMechanics.test.ts`
  - `components/adventure/__tests__/BossIntro.test.tsx`
  - `components/adventure/__tests__/BossDialogue.test.tsx`
  - `components/adventure/__tests__/BossVictory.test.tsx`
- **VALIDATE:** `npm run test`

---

## TESTING STRATEGY

### Unit Tests

**Scope:**
- Boss configuration validation
- Boss mechanic logic (each twist type)
- Translation key existence
- Image path validation

**Pattern:**
```typescript
describe('getBossConfig', () => {
  it('should return correct boss for each world', () => {
    for (let world = 1; world <= 10; world++) {
      const boss = getBossConfig(world);
      expect(boss).toBeDefined();
      expect(boss.worldId).toBe(world);
    }
  });

  it('should have valid twist mechanic for each boss', () => {
    const validTypes: BossTwistType[] = ['popQuiz', 'hiveMind', ...];
    for (let world = 1; world <= 10; world++) {
      const boss = getBossConfig(world);
      expect(validTypes).toContain(boss.twistMechanic.type);
    }
  });
});
```

### Integration Tests

**Scope:**
- Boss intro → game → victory flow
- Mechanic integration with game state
- Taunt timing and display

### Edge Cases

- Boss images not loading (fallback)
- Rapid word submission during boss mechanics
- Language switching mid-boss fight
- Screen size responsiveness

---

## VALIDATION COMMANDS

### Level 0: Environment Check

```bash
# Verify dev environment
npm run dev
# Should start without errors
```

### Level 1: TypeScript Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no type errors

### Level 2: Linting

```bash
npm run lint -- --fix
```

**Expected:** No errors, only warnings (if any)

### Level 3: Unit Tests

```bash
npm run test -- --testPathPattern="boss"
```

**Expected:** All boss-related tests pass

### Level 4: Full Test Suite

```bash
npm run test
```

**Expected:** All tests pass, no regressions

### Level 5: Visual Testing

```bash
npm run dev
# Navigate to Adventure Mode → World 1 → Level 7
# Verify boss intro displays
# Verify boss mechanics work
# Verify victory/defeat messages
```

---

## ACCEPTANCE CRITERIA

- [ ] All 10 bosses have unique twist mechanics implemented
- [ ] Boss images generated and displaying correctly
- [ ] Boss intro cutscene shows before boss levels
- [ ] Boss taunts appear during gameplay
- [ ] Victory/defeat messages show boss personality
- [ ] Translations exist for all 5 languages
- [ ] All validation commands pass
- [ ] No performance regressions
- [ ] Accessibility maintained (skip buttons, alt text)
- [ ] Boss mechanics are fun and balanced

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed
- [ ] All validation commands executed successfully
- [ ] Full test suite passes
- [ ] No linting or type errors
- [ ] Manual testing confirms feature works
- [ ] Translations added for all languages
- [ ] Code reviewed for quality

---

## NOTES

### Design Rationale

**Why unique twist mechanics?** Boss levels should feel special - not just "hard regular levels." Each twist creates a memorable gameplay moment tied to the boss's personality.

**Why generate images now?** Having visual placeholders establishes the character design direction. These can be replaced with animated GIFs later without changing the component structure.

**Why humor?** LexiClash has a playful, Jackbox-style tone. Bosses should be endearing antagonists that players want to face again, not frustrating obstacles.

### Trade-offs

1. **Complexity vs. Development Time:** Each unique mechanic requires custom logic. However, this creates replayability and memorable moments.

2. **Static images vs. animations:** Starting with static images allows faster iteration. GIF support can be added later without architectural changes.

3. **Full mechanics vs. simplified:** Some mechanics (like Linguist Sage's language switching) may be simplified initially based on dictionary availability.

### Future Considerations

- **Animated bosses:** Replace static images with GIFs
- **Boss difficulty modes:** Easy/Normal/Hard boss variants
- **Boss rush mode:** Special mode to fight all bosses consecutively
- **Boss unlockables:** Cosmetics/titles earned from boss defeats

### Implementation Priority

1. **P0 (Must have):** Type definitions, configs, translations, basic intro/victory
2. **P1 (Should have):** Twist mechanics for worlds 1-5, images, taunts
3. **P2 (Nice to have):** Twist mechanics for worlds 6-10, polish, balance

---

## Image Generation Checklist

All boss images have been generated using MCP `mcp__mcp-image__generate_image`, processed with background removal (rembg), and compressed to WebP:

| World | Boss | File | Size | Status |
|-------|------|------|------|--------|
| 1 | Ms. Grammar | ms-grammar.webp | 54 KB | ✅ |
| 2 | Spelling Bee | spelling-bee.webp | 93 KB | ✅ |
| 3 | Professor Thesaurus | professor-thesaurus.webp | 68 KB | ✅ |
| 4 | Captain Metaphor | captain-metaphor.webp | 73 KB | ✅ |
| 5 | Baron Buildaword | baron-buildaword.webp | 55 KB | ✅ |
| 6 | Puzzle Master | puzzle-master.webp | 44 KB | ✅ |
| 7 | Reflection King | reflection-king.webp | 32 KB | ✅ |
| 8 | Cosmic Wordsmith | cosmic-wordsmith.webp | 23 KB | ✅ |
| 9 | Linguist Sage | linguist-sage.webp | 70 KB | ✅ |
| 10 | Lexicon Dragon | lexicon-dragon.webp | 48 KB | ✅ |

**Location:** `public/images/adventure/bosses/`
**Processing Script:** `scripts/process-boss-images.py` (uses rembg + pillow for bg removal and WebP compression)
