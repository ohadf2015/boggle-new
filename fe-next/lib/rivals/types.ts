export type ResultsMode = 'daily' | 'quickPlay' | 'multiplayer' | 'blast' | 'tower' | 'single' | 'edu';

export type RivalKind = 'h2h' | 'daily' | 'league' | 'ghost' | 'classroom' | 'self' | 'related';

export type RivalWhyKind = 'friend' | 'playedTogether' | 'friendOfFriend' | 'sameCountry' | 'closeScore' | 'closeRecord';

export interface RivalWhy {
  kind: RivalWhyKind;
  count?: number;
  /** ISO country code, for the 'sameCountry' chip. */
  country?: string;
}

export interface RivalRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface RivalSummary {
  kind: RivalKind;
  userId?: string;
  name: string;
  avatar?: unknown;
  title?: string | null;
  theirScore?: number;
  myScore?: number;
  gap?: number;
  record?: RivalRecord;
  pingedMeAt?: string | null;
  /** The strongest reason this player is your rival. */
  why?: RivalWhy;
}
