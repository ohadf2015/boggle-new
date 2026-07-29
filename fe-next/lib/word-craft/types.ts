export type PremiumKind = 'DL' | 'TL' | 'DW' | 'TW';

export interface ScoringTile {
  letter: string;
  value: number;
  premium: PremiumKind | null;
}

export interface RackTile {
  id: string;
  letter: string;
  value: number;
  isBlank: boolean;
}

export type Direction = 'across' | 'down';

export interface PlacedTile {
  row: number;
  col: number;
  letter: string;
  value: number;
  isBlank: boolean;
  rackTileId: string;
}

export interface PlayerState {
  id: string;
  name: string;
  score: number;
  rack: RackTile[];
  isBot: boolean;
}

export type SquareKind = PremiumKind | 'CENTER' | null;
