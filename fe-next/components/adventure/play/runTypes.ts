/**
 * The shapes `useAdventureRun` speaks: the phase machine, what /complete hands
 * back for one node (result + ecosystem gains), and the run-wide constants.
 * Split out of the hook so the hook file stays under the 500-line limit;
 * everything here is re-exported from `useAdventureRun` for existing importers.
 */
import type { CombatFx } from '@/lib/adventure/play/combat';
import type { OfferItem, PublicRun } from '@/lib/adventure/play/runToken';
import type { NodeKind } from '@/lib/adventure/play/runMap';
import type { RelicId } from '@/lib/adventure/play/relics';

export type RunPhase = 'loading' | 'error' | 'draft' | 'ready' | 'playing' | 'saving' | 'done' | 'map' | 'node';
export type SubmitResult = 'ok' | 'dup' | 'short' | 'invalid' | 'chain' | 'idle';

export interface RunResult {
  score: number;
  stars: number;
  bestStars: number;
  won: boolean;
  rewards: string[];
  validWords: string[];
  totalStars: number;
  points?: number[];
  targetsFound?: string[];
  nextRunToken?: string;
  nextRun?: PublicRun;
  offer?: OfferItem[];
  runOver?: boolean;
  runComplete?: boolean;
  /** Elite kill: the relic minted into the next run link. */
  trophy?: RelicId;
  /** Which map node this attempt was. */
  nodeKind?: NodeKind;
  /** Run over: the next run's carry, signed AFTER this fight (spent potions stay spent). */
  carryToken?: string;
  /** Run over: leftover gold banked into the app wallet as coins. */
  purseCoins?: number;
  // --- Ecosystem payload (see lib/adventure/play/ecosystem.ts). Always present, may be zero.
  xpGained?: number;
  levelUp?: { newLevel: number; levelsGained: number; newTitles: string[] };
  coinsGained?: number;
  leaderboardPoints?: number;
  streak?: { current: number; longest: number };
  achievementsUnlocked?: string[];
}

/** What a finished node moved elsewhere in the game — for the celebration beat. */
export interface EcosystemGains {
  xpGained: number;
  coinsGained: number;
  leaderboardPoints: number;
  levelUp?: RunResult['levelUp'];
  streak?: RunResult['streak'];
  achievementsUnlocked: string[];
}

/**
 * The server's attempt clock starts at the deal (/start), the player's at Start. Lingering on
 * the chapter / rule cards longer than this re-deals on the same run token before playing,
 * so the save can't land outside the server window (409 'expired') and fight stars stay fair.
 */
export const STALE_DEAL_MS = 8_000;
/** Normal level: once the foe (HP = top-star score) is K.O.'d, the level ends after this beat (letters land, K.O. stamp). */
export const FOE_KO_FINISH_MS = 1400;
export interface CombatFxEntry { id: number; fx: CombatFx[] }
/** One analytics mode label for the whole adventure, per the growth-tracking convention. */
export const ADVENTURE_MODE = 'adventure';
