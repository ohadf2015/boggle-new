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
  | 'mythology' | 'science' | 'travel' | 'art' | 'time';

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
