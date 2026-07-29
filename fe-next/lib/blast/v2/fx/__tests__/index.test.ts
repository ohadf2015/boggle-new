import { describe, it, expect } from 'vitest';
import type { BlastFxApi } from '../index';

describe('BlastFxApi type', () => {
  it('should have all required FX methods', () => {
    const mockApi: BlastFxApi = {
      playWordFound: () => {},
      playCascade: () => {},
      playBonus: () => {},
      playDoubleBonus: () => {},
      playGemCollected: () => {},
      playInvalid: () => {},
      playFrozenThaw: () => {},
      playGravityCollapse: () => {},
      playLateralSlide: () => {},
      playLevelComplete: () => {},
      playChestProgressFill: () => {},
      playChestUnlock: () => {},
      playChestOpen: () => {},
      playAvatarPartDrop: () => {},
      playHintShuffle: () => {},
      playHintRevealLetter: () => {},
      playHintRevealWord: () => {},
    };

    expect(mockApi.playWordFound).toBeDefined();
    expect(mockApi.playCascade).toBeDefined();
    expect(mockApi.playBonus).toBeDefined();
    expect(mockApi.playDoubleBonus).toBeDefined();
    expect(mockApi.playGemCollected).toBeDefined();
    expect(mockApi.playInvalid).toBeDefined();
    expect(mockApi.playFrozenThaw).toBeDefined();
    expect(mockApi.playGravityCollapse).toBeDefined();
    expect(mockApi.playLateralSlide).toBeDefined();
    expect(mockApi.playLevelComplete).toBeDefined();
    expect(mockApi.playChestProgressFill).toBeDefined();
    expect(mockApi.playChestUnlock).toBeDefined();
    expect(mockApi.playChestOpen).toBeDefined();
    expect(mockApi.playAvatarPartDrop).toBeDefined();
    expect(mockApi.playHintShuffle).toBeDefined();
    expect(mockApi.playHintRevealLetter).toBeDefined();
    expect(mockApi.playHintRevealWord).toBeDefined();
  });

  it('should accept all FX method calls', () => {
    const mockApi: BlastFxApi = {
      playWordFound: () => {},
      playCascade: () => {},
      playBonus: () => {},
      playDoubleBonus: () => {},
      playGemCollected: () => {},
      playInvalid: () => {},
      playFrozenThaw: () => {},
      playGravityCollapse: () => {},
      playLateralSlide: () => {},
      playLevelComplete: () => {},
      playChestProgressFill: () => {},
      playChestUnlock: () => {},
      playChestOpen: () => {},
      playAvatarPartDrop: () => {},
      playHintShuffle: () => {},
      playHintRevealLetter: () => {},
      playHintRevealWord: () => {},
    };

    expect(() => {
      mockApi.playWordFound(['c0r0', 'c0r1', 'c0r2']);
      mockApi.playCascade(['c0r0', 'c0r1']);
      mockApi.playBonus(['c0r0']);
      mockApi.playDoubleBonus(['c0r0', 'c0r1']);
      mockApi.playGemCollected(['c0r2']);
      mockApi.playInvalid(document.createElement('div'));
      mockApi.playFrozenThaw(['c1r1']);
      mockApi.playGravityCollapse(100);
      mockApi.playLateralSlide('c0r0', 'c0r1');
      mockApi.playLevelComplete();
      mockApi.playChestProgressFill();
      mockApi.playChestUnlock();
      mockApi.playChestOpen('gold');
      mockApi.playAvatarPartDrop();
      mockApi.playHintShuffle();
      mockApi.playHintRevealLetter('c0r0');
      mockApi.playHintRevealWord(['c0r0', 'c0r1']);
    }).not.toThrow();
  });
});
