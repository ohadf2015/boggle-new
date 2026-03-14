/**
 * Boss Rush — fight 5 bosses in sequence with escalating difficulty.
 * Health carries over. Rewards scale with bosses defeated.
 * Full clear (5/5) gives a large bonus.
 */

export interface BossRushState {
  bossSequence: number[]; // world IDs of bosses to fight
  currentBossIndex: number;
  defeatedCount: number;
  totalBosses: number;
  isComplete: boolean;
}

export interface BossRushReward {
  gold: number;
  xp: number;
  runeFragments: number;
}

/** Create initial boss rush state — 5 bosses from worlds 1-5 (or random selection) */
export function createBossRushState(): BossRushState {
  return {
    bossSequence: [1, 2, 3, 4, 5],
    currentBossIndex: 0,
    defeatedCount: 0,
    totalBosses: 5,
    isComplete: false,
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

/** Calculate rewards based on bosses defeated */
export function getBossRushReward(defeatedCount: number): BossRushReward {
  if (defeatedCount === 0) return { gold: 0, xp: 0, runeFragments: 0 };

  // Base: 50 gold per boss, scaling up
  const baseGold = defeatedCount * 50 + (defeatedCount - 1) * 25;
  // Full clear bonus: +100%
  const fullClearBonus = defeatedCount >= 5 ? baseGold : 0;
  const gold = baseGold + fullClearBonus;

  const xp = Math.floor(gold * 0.6);
  const runeFragments = defeatedCount >= 3 ? defeatedCount - 2 : 0;

  return { gold, xp, runeFragments };
}
