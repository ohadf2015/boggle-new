import { describe, it, expect } from 'vitest';
import { advanceServerCombo, SERVER_COMBO_SCORING_CAP } from '../comboDecay';
import { calculateComboChainWindow } from '@/shared/utils/comboUtils';

function classicGame(): any {
  return { gameMode: 'classic', playerCombos: {} };
}

describe('advanceServerCombo', () => {
  it('chains words inside the client combo window', () => {
    const game = classicGame();
    expect(advanceServerCombo(game, 'a', 1_000).scoringLevel).toBe(0);
    expect(advanceServerCombo(game, 'a', 3_000).scoringLevel).toBe(1);
    expect(advanceServerCombo(game, 'a', 5_000).scoringLevel).toBe(2);
    expect(game.playerCombos.a).toBe(3);
  });

  it('drops the streak once the window lapses, like the client HUD', () => {
    const game = classicGame();
    advanceServerCombo(game, 'a', 0);
    advanceServerCombo(game, 'a', 1_000);
    const lapse = 1_000 + calculateComboChainWindow(2);
    const r = advanceServerCombo(game, 'a', lapse);
    expect(r.scoringLevel).toBe(0);
    expect(game.playerCombos.a).toBe(1);
  });

  it('caps the level that scores but keeps counting the streak for achievements', () => {
    const game = classicGame();
    game.playerCombos.a = 40;
    advanceServerCombo(game, 'a', 0);
    const r = advanceServerCombo(game, 'a', 100);
    expect(r.scoringLevel).toBe(SERVER_COMBO_SCORING_CAP);
    expect(game.playerCombos.a).toBe(42);
  });

  it('leaves non-classic modes on their own combo rules', () => {
    const game = { gameMode: 'blast', playerCombos: { a: 30 } } as any;
    advanceServerCombo(game, 'a', 0);
    const r = advanceServerCombo(game, 'a', 60_000);
    expect(r.scoringLevel).toBe(31);
    expect(game.playerCombos.a).toBe(32);
  });

  it('tracks players independently', () => {
    const game = classicGame();
    advanceServerCombo(game, 'a', 0);
    advanceServerCombo(game, 'b', 0);
    expect(advanceServerCombo(game, 'a', 100).scoringLevel).toBe(1);
    expect(advanceServerCombo(game, 'b', 100_000).scoringLevel).toBe(0);
  });
});
