/**
 * Adventure world definitions — themed worlds 1-10 with mechanics and colors.
 * Split from levelConfig.ts to keep that file focused on per-level assembly.
 */

import { WORLDS_COUNT } from './constants';

/**
 * Configuration for a themed world
 */
export interface WorldConfig {
  /** World number (1-10) */
  id: number;
  /** Translation key for world name */
  name: string;
  /** Visual theme identifier */
  theme: string;
  /** Special mechanic for this world (null for tutorial) */
  mechanic: string | null;
  /** Translation key for boss name */
  bossName: string;
  /** Primary Tailwind color class */
  colorPrimary: string;
  /** Secondary Tailwind color class */
  colorSecondary: string;
  /** World description key */
  description: string;
}

/**
 * All world configurations
 */
export const WORLD_CONFIGS: WorldConfig[] = [
  {
    id: 1,
    name: 'alphabetMeadows',
    theme: 'sunny-pastoral',
    mechanic: null, // Tutorial - no special mechanic
    bossName: 'msGrammar',
    colorPrimary: 'neo-lime',
    colorSecondary: 'neo-lime-light',
    description: 'worldDescAlphabetMeadows',
  },
  {
    id: 2,
    name: 'synonymSprings',
    theme: 'waterfalls',
    mechanic: 'synonymPairs', // +25% for synonym pairs
    bossName: 'spellingBee',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-cyan-light',
    description: 'worldDescSynonymSprings',
  },
  {
    id: 3,
    name: 'rootCaverns',
    theme: 'crystal-caves',
    mechanic: 'etymologyRoots', // Bonus for Latin/Greek roots
    bossName: 'professorThesaurus',
    colorPrimary: 'neo-purple',
    colorSecondary: 'neo-purple-light',
    description: 'worldDescRootCaverns',
  },
  {
    id: 4,
    name: 'idiomArchipelago',
    theme: 'tropical-islands',
    mechanic: 'idioms', // Hidden idiom challenges
    bossName: 'captainMetaphor',
    colorPrimary: 'neo-orange',
    colorSecondary: 'neo-yellow',
    description: 'worldDescIdiomArchipelago',
  },
  {
    id: 5,
    name: 'compoundCanyon',
    theme: 'desert-cliffs',
    mechanic: 'compounds', // +30% for compound words
    bossName: 'baronBuildaword',
    colorPrimary: 'neo-red',
    colorSecondary: 'neo-orange',
    description: 'worldDescCompoundCanyon',
  },
  {
    id: 6,
    name: 'anagramLabyrinth',
    theme: 'escher-maze',
    mechanic: 'anagrams', // Solve anagrams for bonuses
    bossName: 'puzzleMaster',
    colorPrimary: 'neo-pink',
    colorSecondary: 'neo-pink-light',
    description: 'worldDescAnagramLabyrinth',
  },
  {
    id: 7,
    name: 'mirrorPalace',
    theme: 'reflective-glass',
    mechanic: 'palindromes', // +50% for palindromes
    bossName: 'reflectionKing',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-white',
    description: 'worldDescMirrorPalace',
  },
  {
    id: 8,
    name: 'neologismNebula',
    theme: 'space-stars',
    mechanic: 'rareWords', // +40% for rare/new words
    bossName: 'cosmicWordsmith',
    colorPrimary: 'neo-purple',
    colorSecondary: 'neo-pink',
    description: 'worldDescNeologismNebula',
  },
  {
    id: 9,
    name: 'polyglotPeaks',
    theme: 'mountain-aurora',
    mechanic: 'multilingual', // Multi-language word bonuses
    bossName: 'linguistSage',
    colorPrimary: 'neo-cyan',
    colorSecondary: 'neo-lime',
    description: 'worldDescPolyglotPeaks',
  },
  {
    id: 10,
    name: 'lexiconThrone',
    theme: 'golden-library',
    mechanic: 'allMechanics', // All mechanics combined
    bossName: 'lexiconDragon',
    colorPrimary: 'neo-yellow',
    colorSecondary: 'neo-orange',
    description: 'worldDescLexiconThrone',
  },
];

/**
 * Get configuration for a specific world.
 * world=0 is a sentinel for endless/weekly modes — returns the World 1 config.
 *
 * @throws Error if world number is outside 0..WORLDS_COUNT
 */
export function getWorldConfig(world: number): WorldConfig {
  if (world === 0) {
    return WORLD_CONFIGS[0];
  }
  if (world < 1 || world > WORLDS_COUNT) {
    throw new Error(
      `Invalid world: ${world}. Must be between 1 and ${WORLDS_COUNT}.`
    );
  }
  return WORLD_CONFIGS[world - 1];
}

/**
 * Get a copy of all world configurations
 */
export function getAllWorldConfigs(): WorldConfig[] {
  return [...WORLD_CONFIGS];
}
