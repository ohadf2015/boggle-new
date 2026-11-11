import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../boss/useRotatingBoss', () => ({ useRotatingBoss: () => ['dragon', vi.fn()] }));
vi.mock('../rememberedRoundDefaults', () => ({ readRememberedRoundDefaults: () => null }));

import { useLobbyRoundOptions } from '../useLobbyRoundOptions';

const setup = () =>
  renderHook(() => useLobbyRoundOptions({ lessons: [], selectedClassroomId: 'c1', setSelectedLessonIds: vi.fn() }));

describe('useLobbyRoundOptions preset', () => {
  it('opens with Standard lit', () => {
    expect(setup().result.current.activePreset).toBe('standard');
  });

  it('unlights the preset when the board size moves, not only when play style does', () => {
    const { result } = setup();
    act(() => result.current.setBoardSize('large'));
    expect(result.current.activePreset).toBeNull();
  });

  it('lights Support after applying it, so the launch caps its words', () => {
    const { result } = setup();
    act(() => result.current.applyPreset('sped'));
    expect(result.current.activePreset).toBe('sped');
    act(() => result.current.setAccessibility({ largeText: true, audioCues: true }));
    expect(result.current.activePreset).toBeNull();
  });
});
