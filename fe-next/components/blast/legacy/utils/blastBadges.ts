/**
 * Blast Badges — achievement definitions + pure compute function.
 *
 * Registry of 8 in-run achievements. `computeEarnedBadges` is a stateless
 * reducer that maps a finished run's stats to the set of badge IDs earned.
 * Cross-run "first time" detection belongs in `stores/blastBadgeStore.ts`.
 *
 * Icons are lucide-react component names (string refs) — the UI layer
 * resolves them to React components to keep this module tree-shakable and
 * serializable (e.g. for telemetry, SSR).
 */
import type { BlastResultsData } from '../types';

export type BlastBadgeId =
  | 'firstBlast'
  | 'waveRider'
  | 'marathoner'
  | 'comboChain'
  | 'comboKing'
  | 'wordsmith'
  | 'clearMaster'
  | 'highScorer';

export interface BlastBadgeDef {
  id: BlastBadgeId;
  /** lucide-react icon component name (resolved in UI layer) */
  icon: string;
  /** i18n key under `blast.badges.*` */
  labelKey: string;
  /** i18n key for the tooltip explanation — sibling of `labelKey` */
  descKey: string;
  /** Pure predicate: was this badge earned on this run? */
  isEarned: (r: BlastResultsData) => boolean;
}

export const BLAST_BADGES: readonly BlastBadgeDef[] = [
  {
    id: 'firstBlast',
    icon: 'Sparkles',
    labelKey: 'blast.badges.firstBlast',
    descKey: 'blast.badges.firstBlastDesc',
    isEarned: (r) => r.wavesCompleted >= 1,
  },
  {
    id: 'waveRider',
    icon: 'Waves',
    labelKey: 'blast.badges.waveRider',
    descKey: 'blast.badges.waveRiderDesc',
    isEarned: (r) => r.wavesCompleted >= 3,
  },
  {
    id: 'marathoner',
    icon: 'Flag',
    labelKey: 'blast.badges.marathoner',
    descKey: 'blast.badges.marathonerDesc',
    isEarned: (r) => r.wavesCompleted >= 5,
  },
  {
    id: 'comboChain',
    icon: 'Link',
    labelKey: 'blast.badges.comboChain',
    descKey: 'blast.badges.comboChainDesc',
    isEarned: (r) => r.maxCombo >= 5,
  },
  {
    id: 'comboKing',
    icon: 'Crown',
    labelKey: 'blast.badges.comboKing',
    descKey: 'blast.badges.comboKingDesc',
    isEarned: (r) => r.maxCombo >= 10,
  },
  {
    id: 'wordsmith',
    icon: 'BookOpen',
    labelKey: 'blast.badges.wordsmith',
    descKey: 'blast.badges.wordsmithDesc',
    isEarned: (r) => r.wordsFound.length >= 20,
  },
  {
    id: 'clearMaster',
    icon: 'Target',
    labelKey: 'blast.badges.clearMaster',
    descKey: 'blast.badges.clearMasterDesc',
    isEarned: (r) => r.clearPercentage >= 90,
  },
  {
    id: 'highScorer',
    icon: 'Trophy',
    labelKey: 'blast.badges.highScorer',
    descKey: 'blast.badges.highScorerDesc',
    isEarned: (r) => r.finalScore >= 10000,
  },
] as const;

/** Pure reducer: return all badge IDs earned by this run (order = registry). */
export function computeEarnedBadges(results: BlastResultsData): BlastBadgeId[] {
  return BLAST_BADGES.filter((b) => b.isEarned(results)).map((b) => b.id);
}

/** Lookup helper (UI layer needs icon/label for a given id). */
export function getBadgeDef(id: BlastBadgeId): BlastBadgeDef | undefined {
  return BLAST_BADGES.find((b) => b.id === id);
}
