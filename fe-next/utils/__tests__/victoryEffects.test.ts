import { fireEquippedVictoryEffect } from '../victoryEffects';
import * as confettiUtils from '../confettiUtils';

vi.mock('../confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireFireworks: vi.fn(() => vi.fn()),
  fireVictoryConfetti: vi.fn(),
}));

describe('fireEquippedVictoryEffect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls fireRankConfetti for null effect (default)', () => {
    fireEquippedVictoryEffect(1, null);
    expect(confettiUtils.fireRankConfetti).toHaveBeenCalledWith(1, 'light');
    expect(confettiUtils.fireFireworks).not.toHaveBeenCalled();
  });

  it('calls fireRankConfetti for victory-confetti', () => {
    fireEquippedVictoryEffect(2, 'victory-confetti');
    expect(confettiUtils.fireRankConfetti).toHaveBeenCalledWith(2, 'light');
  });

  it('calls fireFireworks for victory-fireworks', () => {
    fireEquippedVictoryEffect(1, 'victory-fireworks');
    expect(confettiUtils.fireFireworks).toHaveBeenCalled();
    expect(confettiUtils.fireRankConfetti).not.toHaveBeenCalled();
  });

  it('calls fireVictoryConfetti for victory-lightning', () => {
    fireEquippedVictoryEffect(1, 'victory-lightning');
    expect(confettiUtils.fireVictoryConfetti).toHaveBeenCalled();
    expect(confettiUtils.fireRankConfetti).not.toHaveBeenCalled();
  });

  it('falls back to fireRankConfetti for unknown effect id', () => {
    fireEquippedVictoryEffect(3, 'unknown-effect');
    expect(confettiUtils.fireRankConfetti).toHaveBeenCalledWith(3, 'light');
  });
});
