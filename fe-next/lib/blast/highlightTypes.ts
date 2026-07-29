import type { BlastTileType, BlastTileState } from '@/shared/types/blast';

export type GridCoord = { row: number; col: number };

type HighlightEventBase = { t: number /* ms since game start */ };

export type WordSubmitEvent = HighlightEventBase & {
  kind: 'word';
  word: string;
  path: GridCoord[];
  score: number;
  combo: number;
  specialTilesHit: BlastTileType[];
  preGrid: BlastTileState[][];
  postGrid: BlastTileState[][];
  effectsFired: string[];
  rngSeed?: number;
};

export type EffectEvent = HighlightEventBase & {
  kind: 'effect';
  preset: string;
  origin: GridCoord;
  rngSeed?: number;
};

export type CascadeTickEvent = HighlightEventBase & {
  kind: 'cascade';
  step: number;
  tilesCleared: GridCoord[];
};

export type GameEndEvent = HighlightEventBase & {
  kind: 'end';
  reason: 'cleared' | 'deadEnd';
  finalScore: number;
};

export type HighlightEvent =
  | WordSubmitEvent
  | EffectEvent
  | CascadeTickEvent
  | GameEndEvent;

export type CaptionTag =
  | 'biggestWord'
  | 'tripleCombo'
  | 'specialChain'
  | 'finalClear'
  | 'none';

export type RankedMoment = {
  event: WordSubmitEvent;
  epicness: number;
  caption: CaptionTag;
  isFinalClear: boolean;
};

export type Clip = {
  moment: RankedMoment;
  rampDurationMs: number;
};
