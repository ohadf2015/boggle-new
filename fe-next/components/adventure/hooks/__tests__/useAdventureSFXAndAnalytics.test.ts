/**
 * Unit tests for useAdventureSFX — SFX gating + word-accepted audio loop.
 * GF-002 audit (2026-05-01): pairs playCoinCollectSound with playWordAcceptedSound
 * so the score-popup arc has audio support (dopamine loop completion).
 */

import { renderHook } from '@testing-library/react';
import { useAdventureSFX } from '../useAdventureSFXAndAnalytics';

vi.mock('@/utils/growthTracking', () => ({
  trackAdventureLevel: vi.fn(),
  trackFeatureFirstUse: vi.fn(),
  trackGameStart: vi.fn(),
}));

function makeSfx() {
  return {
    setGameActive: vi.fn(),
    playCountdownBeep: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playCoinCollectSound: vi.fn(),
    playLevelUpSound: vi.fn(),
    playBossEntranceSound: vi.fn(),
    playBossHitSound: vi.fn(),
    playBossPhaseChangeSound: vi.fn(),
    playBossDefeatSound: vi.fn(),
    playBossDefeatLegendarySound: vi.fn(),
    playTimerUrgentSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
  };
}

describe('useAdventureSFX — word-accepted audio loop', () => {
  it('GF-002: plays both word-accepted SFX and coin-collect SFX when a word is accepted', () => {
    const sfx = makeSfx();
    const { rerender } = renderHook(
      (props: { wordsFoundLength: number; prevWordsFoundLen: number | undefined }) =>
        useAdventureSFX({
          isPlaying: true,
          timeRemaining: 60,
          wordsFoundLength: props.wordsFoundLength,
          prevWordsFoundLen: props.prevWordsFoundLen,
          comboCount: 1,
          sfx,
        }),
      { initialProps: { wordsFoundLength: 0, prevWordsFoundLen: undefined } }
    );
    // Trigger word-accepted: prev=0, current=1
    rerender({ wordsFoundLength: 1, prevWordsFoundLen: 0 });
    expect(sfx.playWordAcceptedSound).toHaveBeenCalledTimes(1);
    expect(sfx.playCoinCollectSound).toHaveBeenCalledTimes(1);
  });

  it('does NOT play either SFX when isPlaying=false (player paused or in modal)', () => {
    const sfx = makeSfx();
    const { rerender } = renderHook(
      (props: { wordsFoundLength: number; prevWordsFoundLen: number | undefined }) =>
        useAdventureSFX({
          isPlaying: false,
          timeRemaining: 60,
          wordsFoundLength: props.wordsFoundLength,
          prevWordsFoundLen: props.prevWordsFoundLen,
          comboCount: 1,
          sfx,
        }),
      { initialProps: { wordsFoundLength: 0, prevWordsFoundLen: undefined } }
    );
    rerender({ wordsFoundLength: 1, prevWordsFoundLen: 0 });
    expect(sfx.playWordAcceptedSound).not.toHaveBeenCalled();
    expect(sfx.playCoinCollectSound).not.toHaveBeenCalled();
  });

  it('does NOT play coin-collect on first mount when prevWordsFoundLen is undefined (no transition yet)', () => {
    const sfx = makeSfx();
    renderHook(() =>
      useAdventureSFX({
        isPlaying: true,
        timeRemaining: 60,
        wordsFoundLength: 5,
        prevWordsFoundLen: undefined,
        comboCount: 1,
        sfx,
      })
    );
    expect(sfx.playCoinCollectSound).not.toHaveBeenCalled();
  });
});
