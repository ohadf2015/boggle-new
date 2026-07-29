/**
 * useCombatComboMilestone Tests
 *
 * Fires checkMilestone(comboCount) only while the level is actively playing
 * (isPlaying + entryPhase === 'playing' + not paused), and always records
 * the previous combo for downstream consumers.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useCombatComboMilestone } from '../useCombatComboMilestone';

type Props = Parameters<typeof useCombatComboMilestone>[0];

describe('useCombatComboMilestone', () => {
  function setup(initial: Partial<Props> = {}) {
    const checkMilestone = vi.fn();
    const { result } = renderHook(() => useRef(0));
    const prevComboCountRef = result.current;
    const props: Props = {
      comboCount: 0,
      isPlaying: true,
      entryPhase: 'playing',
      isPaused: false,
      checkMilestone,
      prevComboCountRef,
      ...initial,
    };
    const rendered = renderHook((p: Props) => useCombatComboMilestone(p), { initialProps: props });
    return { ...rendered, checkMilestone, prevComboCountRef, props };
  }

  it('calls checkMilestone when playing', () => {
    const { checkMilestone } = setup({ comboCount: 3 });
    expect(checkMilestone).toHaveBeenCalledWith(3);
  });

  it('does not call checkMilestone when not playing', () => {
    const { checkMilestone } = setup({ comboCount: 3, isPlaying: false });
    expect(checkMilestone).not.toHaveBeenCalled();
  });

  it('does not call checkMilestone when paused', () => {
    const { checkMilestone } = setup({ comboCount: 3, isPaused: true });
    expect(checkMilestone).not.toHaveBeenCalled();
  });

  it('does not call checkMilestone outside playing entryPhase', () => {
    const { checkMilestone } = setup({ comboCount: 3, entryPhase: 'intro' });
    expect(checkMilestone).not.toHaveBeenCalled();
  });

  it('records previous combo count into ref', () => {
    const { prevComboCountRef } = setup({ comboCount: 7 });
    expect(prevComboCountRef.current).toBe(7);
  });
});
