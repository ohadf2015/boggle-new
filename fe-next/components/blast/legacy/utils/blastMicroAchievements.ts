/**
 * Blast Micro-Achievements — mid-run "juice" achievements that fire during
 * gameplay (not at run-end like {@link BLAST_BADGES}). Pure reducer over a
 * snapshot of run state. The hook layer (`useBlastMicroAchievements`) diffs
 * sequential snapshots to surface toasts exactly once per run.
 *
 * Persistence: NONE. These reset every run by design — they exist to make
 * gameplay feel reactive, not to track meta-progression.
 */

export type BlastMicroId =
  | 'firstCombo'
  | 'tripleChain'
  | 'megaChain'
  | 'bigWord'
  | 'hugeWord'
  | 'demolisher'
  | 'gemHoarder'
  | 'specialist'
  | 'waveClearer';

export type BlastMicroTier = 'bronze' | 'silver' | 'gold' | 'legendary';

export interface BlastMicroState {
  maxCombo: number;
  wordsSubmitted: number;
  longestWordLen: number;
  /** Largest single clear event (tiles in one word/cascade step). */
  biggestSingleClear: number;
  gemsCollected: number;
  specialTilesCleared: number;
  wavesCompleted: number;
}

export interface BlastMicroDef {
  id: BlastMicroId;
  /** lucide-react icon name (resolved at render time) */
  icon: string;
  /** i18n key under `blast.micro.*` */
  labelKey: string;
  tier: BlastMicroTier;
  isEarned: (s: BlastMicroState) => boolean;
}

export const BLAST_MICRO_ACHIEVEMENTS: readonly BlastMicroDef[] = [
  { id: 'firstCombo',  icon: 'Flame',     labelKey: 'blast.micro.firstCombo',  tier: 'bronze',    isEarned: (s) => s.maxCombo >= 2 },
  { id: 'tripleChain', icon: 'Link',      labelKey: 'blast.micro.tripleChain', tier: 'silver',    isEarned: (s) => s.maxCombo >= 3 },
  { id: 'megaChain',   icon: 'Zap',       labelKey: 'blast.micro.megaChain',   tier: 'legendary', isEarned: (s) => s.maxCombo >= 7 },
  { id: 'bigWord',     icon: 'BookOpen',  labelKey: 'blast.micro.bigWord',     tier: 'silver',    isEarned: (s) => s.longestWordLen >= 6 },
  { id: 'hugeWord',    icon: 'Crown',     labelKey: 'blast.micro.hugeWord',    tier: 'gold',      isEarned: (s) => s.longestWordLen >= 8 },
  { id: 'demolisher',  icon: 'Bomb',      labelKey: 'blast.micro.demolisher',  tier: 'gold',      isEarned: (s) => s.biggestSingleClear >= 8 },
  { id: 'gemHoarder',  icon: 'Gem',       labelKey: 'blast.micro.gemHoarder',  tier: 'silver',    isEarned: (s) => s.gemsCollected >= 5 },
  { id: 'specialist',  icon: 'Sparkles',  labelKey: 'blast.micro.specialist',  tier: 'gold',      isEarned: (s) => s.specialTilesCleared >= 10 },
  { id: 'waveClearer', icon: 'Waves',     labelKey: 'blast.micro.waveClearer', tier: 'bronze',    isEarned: (s) => s.wavesCompleted >= 1 },
] as const;

/** Pure reducer: all micro IDs earned by the current run state. */
export function computeMicroAchievements(state: BlastMicroState): BlastMicroId[] {
  return BLAST_MICRO_ACHIEVEMENTS.filter((m) => m.isEarned(state)).map((m) => m.id);
}

/** Return IDs in `curr` that are not in `prev` (i.e. just unlocked). */
export function diffMicroAchievements(
  prev: ReadonlySet<BlastMicroId>,
  curr: readonly BlastMicroId[],
): BlastMicroId[] {
  return curr.filter((id) => !prev.has(id));
}

export function getMicroDef(id: BlastMicroId): BlastMicroDef | undefined {
  return BLAST_MICRO_ACHIEVEMENTS.find((m) => m.id === id);
}
