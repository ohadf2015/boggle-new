export type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

export type Letter = string; // single grapheme; locale-specific glyph

export type CellId = `c${number}r${number}`; // c=column index, r=row index from bottom (0-based)

export type TileFlag = 'coin' | 'gem' | 'frozen' | 'double_bonus';

export type ThemeKey =
  | 'onboarding'
  | 'fruits' | 'animals' | 'food' | 'ocean' | 'space'
  | 'nature' | 'sports' | 'colors' | 'transport' | 'body'
  | 'home' | 'school' | 'tools' | 'weather' | 'music'
  | 'jobs' | 'family' | 'numbers' | 'feelings'
  | 'mythology' | 'science' | 'travel' | 'art' | 'time'
  // Mood-tilted themes: organized around a feeling/mode rather than a noun
  // category. Author hand-picks short evocative words so each level reads as
  // a vibe instead of a vocabulary drill.
  | 'joy' | 'cozy' | 'spooky' | 'magic' | 'adventure';

export type BlastColumn = {
  index: number;        // 0 = leftmost (rendered rightmost in HE RTL — render layer concern)
  tiles: Letter[];      // index 0 = BOTTOM of column
};

export type BlastLevel = {
  id: string;
  levelNumber: number;
  theme: ThemeKey;
  locale: Locale;
  words: string[];
  columns: BlastColumn[];
  resolvableOrder: string[];
  tileFlags: Partial<Record<CellId, TileFlag[]>>;
  difficulty: number;
  gravityMode?: 'standard' | 'lateral-slide';
  hasPivot?: boolean;
  interestingnessScore?: number;
  /** Optional per-run random twist — boosts one tile-flag rate; surfaces in intro card. */
  modifier?: 'gem_rush' | 'coin_bonanza' | 'bonus_storm';
};

export type ChainLevelSpec = {
  id: string;
  levelNumber: number;
  theme: ThemeKey;
  locale: Locale;
  /** Number of board columns. Must be >= the longest word in the chain. */
  columns: number;
  /** Count of decoy tiles that never complete a theme word. */
  decoyTiles: number;
  /** Ordered words; chain[0] is found first, chain[last] last. */
  chain: string[];
};

export type MechanicSet = {
  coinOverlay: boolean;
  reverseSelection: boolean;
  shuffleButton: boolean;
  gemTiles: boolean;
  frozenTiles: boolean;
  cascadeWords: boolean;
  doubleBonusTile: boolean;
  revealLetterHint: boolean;
  bonusDictionary: boolean;
  revealWordHint: boolean;
  lateralSlideGravity: boolean;
  multiWordReveal: boolean;
};
