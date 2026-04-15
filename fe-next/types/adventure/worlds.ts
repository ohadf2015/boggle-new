/**
 * World name constants. Each entry is a translation key for a themed world.
 */

export const WORLD_NAMES = [
  'alphabetMeadows',
  'synonymSprings',
  'rootCaverns',
  'idiomArchipelago',
  'compoundCanyon',
  'anagramLabyrinth',
  'mirrorPalace',
  'neologismNebula',
  'polyglotPeaks',
  'lexiconThrone',
] as const;

export type WorldName = (typeof WORLD_NAMES)[number];
