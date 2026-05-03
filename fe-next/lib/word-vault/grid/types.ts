export type GridSize = 3 | 4 | 5;
export type Traversal = 'adjacent' | 'anytap';
export type LetterSourceMode = 'pool' | 'pangram' | 'forced';
export type ThemeBias = 'kitchen' | 'cold' | 'soot' | 'memory' | 'final';

export type SemanticClass = 'name-male' | 'warmth' | 'fuel' | 'food' | 'family';

export type SemanticGate = {
  class: SemanticClass;
  acceptList: string[];          // valid HE words for this class
  rareBonusList?: string[];      // poetic/rare; same solve, bonus reward
};

export type TargetWord = {
  word: string;                  // exact HE word that solves the beat
  bonus?: number;                // extra coins on solve
};

export type BonusBucket = {
  baseCoinsPerWord: number;
  rarityMultiplier?: (word: string) => 1 | 2 | 3;
};

export type FrozenModifier = { kind: 'frozen'; n: number };
export type GridModifier = FrozenModifier; // expand later

export type VaultGridConfig = {
  size: GridSize;
  letterSource: LetterSourceMode;
  letters?: string[];            // when letterSource='forced'
  themeBias?: ThemeBias;
  traversal: Traversal;
  modifiers?: GridModifier[];
  targets: TargetWord[];
  bonusBucket?: BonusBucket;
  semanticGate?: SemanticGate;
};

export type SubmitResult =
  | { kind: 'target-hit'; target: TargetWord; coins: number }
  | { kind: 'bonus-hit'; word: string; rarity: 1 | 2 | 3; coins: number }
  | { kind: 'invalid'; reason: 'not-word' | 'wrong-class' | 'used' | 'too-short' };

export type TileState = {
  index: number;
  letter: string;
  frozen: boolean;
  selected: boolean;
};
