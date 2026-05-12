import { describe, it, expect } from 'vitest';
import { useBlastFx, type BlastFxApi } from '../index';

describe('useBlastFx', () => {
  it('should return a BlastFxApi object with all required methods', () => {
    const boardRef = { current: document.createElement('div') };
    const api = useBlastFx({ boardRef, modeColor: '#ec4899' });

    expect(api).toBeDefined();
    expect(typeof api.playWordFound).toBe('function');
    expect(typeof api.playCascade).toBe('function');
    expect(typeof api.playBonus).toBe('function');
    expect(typeof api.playDoubleBonus).toBe('function');
    expect(typeof api.playGemCollected).toBe('function');
    expect(typeof api.playInvalid).toBe('function');
    expect(typeof api.playFrozenThaw).toBe('function');
    expect(typeof api.playGravityCollapse).toBe('function');
    expect(typeof api.playLateralSlide).toBe('function');
    expect(typeof api.playLevelComplete).toBe('function');
    expect(typeof api.playChestProgressFill).toBe('function');
    expect(typeof api.playChestUnlock).toBe('function');
    expect(typeof api.playChestOpen).toBe('function');
    expect(typeof api.playAvatarPartDrop).toBe('function');
    expect(typeof api.playHintShuffle).toBe('function');
    expect(typeof api.playHintRevealLetter).toBe('function');
    expect(typeof api.playHintRevealWord).toBe('function');
  });

  it('should allow calling all FX methods without error', () => {
    const boardRef = { current: document.createElement('div') };
    const api = useBlastFx({ boardRef, modeColor: '#ec4899' });

    expect(() => {
      api.playWordFound(['c0r0', 'c0r1', 'c0r2']);
      api.playCascade(['c0r0', 'c0r1']);
      api.playBonus(['c0r0']);
      api.playDoubleBonus(['c0r0', 'c0r1']);
      api.playGemCollected(['c0r2']);
      api.playInvalid(document.createElement('div'));
      api.playFrozenThaw(['c1r1']);
      api.playGravityCollapse(100);
      api.playLateralSlide('c0r0', 'c0r1');
      api.playLevelComplete();
      api.playChestProgressFill();
      api.playChestUnlock();
      api.playChestOpen('gold');
      api.playAvatarPartDrop();
      api.playHintShuffle();
      api.playHintRevealLetter('c0r0');
      api.playHintRevealWord(['c0r0', 'c0r1']);
    }).not.toThrow();
  });
});
