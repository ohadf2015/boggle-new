import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePracticeSfx } from '../usePracticeSfx';
import { subscribeMascotEvents, _resetMascotBus } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));

describe('usePracticeSfx — shared mascot', () => {
  let events: MascotEvent[];
  beforeEach(() => {
    _resetMascotBus();
    events = [];
    subscribeMascotEvents((e) => events.push(e));
  });

  it('cheers a right answer and a matched pair', () => {
    const { result } = renderHook(() => usePracticeSfx());
    result.current.correct();
    result.current.match();
    expect(events.filter((e) => e.kind === 'word-submitted')).toHaveLength(2);
  });

  it('starts dancing on the third right answer in a row and resets on a miss', () => {
    const { result } = renderHook(() => usePracticeSfx());
    result.current.correct();
    result.current.correct();
    expect(events.some((e) => e.kind === 'wave-streak')).toBe(false);
    result.current.correct();
    expect(events).toContainEqual({ kind: 'wave-streak', streakCount: 3 });
    events.length = 0;
    result.current.wrong();
    result.current.correct();
    expect(events.some((e) => e.kind === 'wave-streak')).toBe(false);
  });

  it('says nothing on a wrong answer', () => {
    const { result } = renderHook(() => usePracticeSfx());
    result.current.wrong();
    expect(events).toHaveLength(0);
  });
});
