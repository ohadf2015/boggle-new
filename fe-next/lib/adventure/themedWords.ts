/**
 * Themed word pools for Adventure Mode worlds.
 *
 * Each world contains 35-50 common English words (ALL CAPS, 3-8 letters)
 * that can be seeded into the grid generator so players can find themed words.
 * Finding a themed word awards a score bonus via `bonusMultiplier`.
 */

export interface WorldThemeConfig {
  /** Human-readable display name for the theme */
  theme: string;
  /** i18n key, e.g. "adventure.world.1.theme" */
  themeKey: string;
  /** Word pool — ALL CAPS, 3-8 letters each */
  words: string[];
  /** Score multiplier applied when a themed word is found (default 1.25 = +25%) */
  bonusMultiplier: number;
}

/**
 * Themed word pools for all 10 Adventure Mode worlds.
 *
 * Used by the grid generator to seed ~30-50% of grid tiles with letters
 * that make themed words discoverable.
 */
export const WORLD_THEMED_WORDS: Record<number, WorldThemeConfig> = {
  1: {
    theme: 'Alphabet Meadows',
    themeKey: 'adventure.world.1.theme',
    bonusMultiplier: 1.25,
    words: [
      'BLOOM', 'LEAF', 'RAIN', 'NEST', 'SEED', 'TREE', 'VINE', 'FERN',
      'MOSS', 'ROOT', 'PETAL', 'STEM', 'BUD', 'POND', 'BIRD', 'ROSE',
      'LILY', 'OAK', 'ELM', 'PINE', 'HERB', 'WEED', 'GROW', 'SOIL',
      'DIRT', 'SUN', 'DEW', 'BEE', 'ANT', 'HIVE', 'THORN', 'BARK',
      'SAP', 'LAWN', 'PARK', 'FIELD',
    ],
  },
  2: {
    theme: 'Synonym Springs',
    themeKey: 'adventure.world.2.theme',
    bonusMultiplier: 1.25,
    words: [
      'STREAM', 'TIDE', 'FLOW', 'POUR', 'SURGE', 'WAVE', 'POOL', 'LAKE',
      'RAIN', 'DROP', 'MIST', 'FOG', 'DRIP', 'GUSH', 'RUSH', 'FLOOD',
      'CREEK', 'BROOK', 'SPRING', 'DAMP', 'MOIST', 'WET', 'ICE', 'FROST',
      'STEAM', 'SPRAY', 'SPLASH', 'RINSE', 'WASH', 'BATH', 'DIVE', 'SWIM',
      'FLOAT', 'DRIFT', 'SINK', 'DEEP',
    ],
  },
  3: {
    theme: 'Root Caverns',
    themeKey: 'adventure.world.3.theme',
    bonusMultiplier: 1.25,
    words: [
      'STONE', 'CAVE', 'MINE', 'ROCK', 'GEM', 'COAL', 'IRON', 'GOLD',
      'LEAD', 'ZINC', 'TIN', 'ORE', 'CLAY', 'SAND', 'DUST', 'SILT',
      'LAVA', 'QUARTZ', 'JADE', 'RUBY', 'OPAL', 'ONYX', 'CRUST', 'CORE',
      'DEPTH', 'DEEP', 'DARK', 'DAMP', 'ECHO', 'SHAFT', 'DRILL', 'DIG',
      'CHIP', 'CRACK', 'VEIN', 'SEAM',
    ],
  },
  4: {
    theme: 'Idiom Archipelago',
    themeKey: 'adventure.world.4.theme',
    bonusMultiplier: 1.25,
    words: [
      'SAIL', 'WAVE', 'CORAL', 'SHORE', 'PORT', 'DOCK', 'PIER', 'HULL',
      'MAST', 'DECK', 'CREW', 'SHIP', 'BOAT', 'FISH', 'CRAB', 'CLAM',
      'REEF', 'KELP', 'TIDE', 'WIND', 'GUST', 'STORM', 'ISLE', 'BEACH',
      'COAST', 'SAND', 'SHELL', 'PEARL', 'NET', 'ROPE', 'KNOT', 'HELM',
      'CHART', 'MAP', 'VOYAGE', 'ANCHOR',
    ],
  },
  5: {
    theme: 'Compound Canyon',
    themeKey: 'adventure.world.5.theme',
    bonusMultiplier: 1.25,
    words: [
      'BUILD', 'FORGE', 'CRAFT', 'WELD', 'BOLT', 'NAIL', 'BEAM', 'ARCH',
      'WALL', 'ROOF', 'DOOR', 'GATE', 'BRICK', 'TILE', 'WOOD', 'STEEL',
      'WIRE', 'PIPE', 'TOOL', 'SAW', 'DRILL', 'CLAMP', 'GLUE', 'PAINT',
      'SAND', 'PLAN', 'DRAW', 'MOLD', 'CAST', 'CUT', 'FIT', 'JOIN',
      'BIND', 'FRAME', 'SHED', 'BARN',
    ],
  },
  6: {
    theme: 'Anagram Labyrinth',
    themeKey: 'adventure.world.6.theme',
    bonusMultiplier: 1.25,
    words: [
      'CLUE', 'MAZE', 'TWIST', 'SOLVE', 'CODE', 'LOCK', 'TRAP', 'HINT',
      'RIDDLE', 'QUEST', 'SEARCH', 'FIND', 'HIDE', 'SEEK', 'PATH', 'TRAIL',
      'TURN', 'DEAD', 'END', 'LOST', 'FOUND', 'KEY', 'DOOR', 'ROOM',
      'HALL', 'DARK', 'LIGHT', 'TORCH', 'SPELL', 'RUNE', 'GLYPH', 'SIGN',
      'MARK', 'TRICK', 'GAME', 'PLAY',
    ],
  },
  7: {
    theme: 'Mirror Palace',
    themeKey: 'adventure.world.7.theme',
    bonusMultiplier: 1.25,
    words: [
      'PRISM', 'GLOW', 'SHINE', 'GLEAM', 'GLASS', 'BEAM', 'RAY', 'SPARK',
      'FLASH', 'BRIGHT', 'CLEAR', 'PURE', 'CRYSTAL', 'LENS', 'FOCUS', 'BLUR',
      'FADE', 'DIM', 'SHADE', 'LIGHT', 'MIRROR', 'TWIN', 'COPY', 'MATCH',
      'PAIR', 'SAME', 'FLIP', 'TURN', 'ANGLE', 'EDGE', 'FACE', 'SIDE',
      'SMOOTH', 'FLAT', 'POLISH', 'SHEEN',
    ],
  },
  8: {
    theme: 'Neologism Nebula',
    themeKey: 'adventure.world.8.theme',
    bonusMultiplier: 1.25,
    words: [
      'ORBIT', 'NOVA', 'STAR', 'COMET', 'PULSE', 'VOID', 'DARK', 'DUST',
      'GAS', 'RING', 'MOON', 'SUN', 'MARS', 'GLOW', 'BEAM', 'WARP',
      'DRIFT', 'SPIN', 'CORE', 'ATOM', 'CELL', 'WAVE', 'FLUX', 'ION',
      'MASS', 'FORCE', 'FIELD', 'CHARGE', 'BOLT', 'SPARK', 'LASER', 'PROBE',
      'SCAN', 'DATA', 'LINK', 'SIGNAL',
    ],
  },
  9: {
    theme: 'Polyglot Peaks',
    themeKey: 'adventure.world.9.theme',
    bonusMultiplier: 1.25,
    words: [
      'SPEAK', 'VOICE', 'WORD', 'TONE', 'SONG', 'TALE', 'LORE', 'MYTH',
      'SAGE', 'POEM', 'VERSE', 'RUNE', 'TEXT', 'BOOK', 'PAGE', 'INK',
      'PEN', 'QUILL', 'SCROLL', 'CHANT', 'HYMN', 'CALL', 'NAME', 'SIGN',
      'READ', 'WRITE', 'LEARN', 'TEACH', 'KNOW', 'WISE', 'MIND', 'THINK',
      'DREAM', 'PEAK', 'CLIMB', 'RISE',
    ],
  },
  10: {
    theme: 'Lexicon Throne',
    themeKey: 'adventure.world.10.theme',
    bonusMultiplier: 1.25,
    words: [
      'CROWN', 'REIGN', 'SAGE', 'LORE', 'THRONE', 'KING', 'QUEEN', 'LORD',
      'DUKE', 'KNIGHT', 'REALM', 'LAND', 'RULE', 'LAW', 'OATH', 'BOND',
      'SEAL', 'CREST', 'SHIELD', 'SWORD', 'BLADE', 'STEEL', 'POWER', 'MIGHT',
      'GLORY', 'HONOR', 'PRIDE', 'BOLD', 'BRAVE', 'NOBLE', 'GRAND', 'VAST',
      'GREAT', 'APEX', 'PRIME', 'FINAL',
    ],
  },
};

/**
 * Returns the word pool for a given world number.
 * Returns empty array if the world does not exist.
 */
export function getThemedWords(world: number): string[] {
  return WORLD_THEMED_WORDS[world]?.words ?? [];
}

/**
 * Case-insensitive check whether a word belongs to a world's themed pool.
 * Returns false for invalid world numbers.
 */
export function isThemedWord(world: number, word: string): boolean {
  const entry = WORLD_THEMED_WORDS[world];
  if (!entry) return false;
  return entry.words.includes(word.toUpperCase());
}

/**
 * Returns the score bonus multiplier for themed words in a world.
 * Returns 1 (no bonus) for invalid world numbers.
 */
export function getThemeBonusMultiplier(world: number): number {
  return WORLD_THEMED_WORDS[world]?.bonusMultiplier ?? 1;
}

/**
 * Returns the i18n translation key for the world's theme display name.
 * Returns empty string for invalid world numbers.
 */
export function getThemeDisplayKey(world: number): string {
  return WORLD_THEMED_WORDS[world]?.themeKey ?? '';
}
