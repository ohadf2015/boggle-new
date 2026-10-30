import { describe, it, expect } from 'vitest';
import { advanceServerCombo, BLIZZARD_COMBO_DECAY_MULTIPLIER } from '../comboDecay';
import { calculateComboChainWindow } from '@/shared/utils/comboUtils';

const gap = (level: number) => Math.ceil(calculateComboChainWindow(level) * 1.5);

describe('advanceServerCombo during a blizzard', () => {
  it('slows combo decay by the advertised multiplier', () => {
    expect(BLIZZARD_COMBO_DECAY_MULTIPLIER).toBe(0.5);
    const game = { gameMode: 'classic', activeRoundEvent: 'blizzard' as string | null };
    advanceServerCombo(game, 'ana', 0);
    expect(advanceServerCombo(game, 'ana', gap(1)).scoringLevel).toBe(1);
  });

  it('decays at the normal rate outside a blizzard', () => {
    const game = { gameMode: 'classic', activeRoundEvent: null as string | null };
    advanceServerCombo(game, 'ana', 0);
    expect(advanceServerCombo(game, 'ana', gap(1)).scoringLevel).toBe(0);
  });
});
