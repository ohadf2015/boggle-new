import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClassroomSettingsSeed, __resetClassroomSettingsSeeds } from '../useClassroomSettingsSeed';

const TEMPLATE = { timerSeconds: 180, difficulty: 'large', minWordLength: 4, allowLateJoin: true };

describe('useClassroomSettingsSeed — the projector lobby honours the teacher\'s round settings', () => {
  beforeEach(() => __resetClassroomSettingsSeeds());

  it('applies the lobby timer, board size and min length once for a classroom room', () => {
    const setTimerValue = vi.fn();
    const setDifficulty = vi.fn();
    const setMinWordLength = vi.fn();
    const { rerender } = renderHook((props) => useClassroomSettingsSeed(props), {
      initialProps: { isClassroomMode: true, gameCode: 'VV8MPY', templateSettings: TEMPLATE, setTimerValue, setDifficulty, setMinWordLength },
    });
    expect(setTimerValue).toHaveBeenCalledWith(3);
    expect(setDifficulty).toHaveBeenCalledWith('HARD');
    expect(setMinWordLength).toHaveBeenCalledWith(4);
    rerender({ isClassroomMode: true, gameCode: 'VV8MPY', templateSettings: TEMPLATE, setTimerValue, setDifficulty, setMinWordLength });
    expect(setTimerValue).toHaveBeenCalledTimes(1);
  });

  it('waits for the lesson data instead of seeding a default', () => {
    const setTimerValue = vi.fn();
    const { rerender } = renderHook((props) => useClassroomSettingsSeed(props), {
      initialProps: { isClassroomMode: true, gameCode: 'VV8MPY', templateSettings: null as typeof TEMPLATE | null, setTimerValue, setDifficulty: vi.fn(), setMinWordLength: vi.fn() },
    });
    expect(setTimerValue).not.toHaveBeenCalled();
    rerender({ isClassroomMode: true, gameCode: 'VV8MPY', templateSettings: TEMPLATE, setTimerValue, setDifficulty: vi.fn(), setMinWordLength: vi.fn() });
    expect(setTimerValue).toHaveBeenCalledWith(3);
  });

  it('leaves a non-classroom room alone', () => {
    const setTimerValue = vi.fn();
    renderHook(() => useClassroomSettingsSeed({ isClassroomMode: false, gameCode: 'ABCDEF', templateSettings: TEMPLATE, setTimerValue, setDifficulty: vi.fn(), setMinWordLength: vi.fn() }));
    expect(setTimerValue).not.toHaveBeenCalled();
  });
});
