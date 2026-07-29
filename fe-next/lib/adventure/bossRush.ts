/**
 * Boss Rush — fight bosses in sequence with escalating difficulty.
 * Health carries over. Rewards scale with bosses defeated and difficulty tier.
 * Full clear gives a large bonus.
 */

export type BossRushDifficulty = 'normal' | 'hard' | 'legendary';

export interface BossRushState {
  bossSequence: number[]; // world IDs of bosses to fight
  currentBossIndex: number;
  defeatedCount: number;
  totalBosses: number;
  isComplete: boolean;
  difficulty: BossRushDifficulty;
}

export interface BossRushReward {
  gold: number;
  xp: number;
  runeFragments: number;
}

const BOSS_RUSH_SEQUENCES: Record<BossRushDifficulty, number[]> = {
  normal: [1, 2, 3, 4, 5],
  hard: [3, 5, 6, 8, 10],
  legendary: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

const BOSS_RUSH_REWARD_MULTIPLIERS: Record<BossRushDifficulty, number> = {
  normal: 1,
  hard: 1.5,
  legendary: 2.5,
};

/** Create initial boss rush state with difficulty tier */
export function createBossRushState(difficulty: BossRushDifficulty = 'normal'): BossRushState {
  const seq = BOSS_RUSH_SEQUENCES[difficulty];
  return {
    bossSequence: seq,
    currentBossIndex: 0,
    defeatedCount: 0,
    totalBosses: seq.length,
    isComplete: false,
    difficulty,
  };
}

/** Advance boss rush after a fight result */
export function advanceBossRush(
  state: BossRushState,
  result: 'victory' | 'defeat',
): BossRushState {
  if (state.isComplete) return state;

  if (result === 'defeat') {
    return { ...state, isComplete: true };
  }

  const newDefeated = state.defeatedCount + 1;
  const newIndex = state.currentBossIndex + 1;
  const isComplete = newIndex >= state.totalBosses;

  return {
    ...state,
    currentBossIndex: newIndex,
    defeatedCount: newDefeated,
    isComplete,
  };
}

/** Calculate rewards based on bosses defeated and difficulty */
export function getBossRushReward(defeatedCount: number, difficulty: BossRushDifficulty = 'normal'): BossRushReward {
  if (defeatedCount === 0) return { gold: 0, xp: 0, runeFragments: 0 };

  const multiplier = BOSS_RUSH_REWARD_MULTIPLIERS[difficulty];
  const totalBosses = BOSS_RUSH_SEQUENCES[difficulty].length;

  // Base: 50 gold per boss, scaling up
  const baseGold = defeatedCount * 50 + (defeatedCount - 1) * 25;
  // Full clear bonus: +100%
  const fullClearBonus = defeatedCount >= totalBosses ? baseGold : 0;
  const gold = Math.floor((baseGold + fullClearBonus) * multiplier);

  const xp = Math.floor(gold * 0.6);
  const runeFragments = defeatedCount >= 3 ? defeatedCount - 2 : 0;

  return { gold, xp, runeFragments };
}
