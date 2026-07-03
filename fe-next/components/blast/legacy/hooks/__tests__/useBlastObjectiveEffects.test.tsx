// @vitest-environment happy-dom
/**
 * useBlastObjectiveEffects — objective completion must be HEARD, not just seen.
 * Hidden-objective completion fires score fly + flash + shake but historically
 * no sound (only the all-objectives wave-clear had one). Pin the audio cue.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlastObjectiveEffects } from '../useBlastObjectiveEffects';
import type { BlastObjectiveProgress } from '../../types';

const prog = (type: string, isComplete: boolean): BlastObjectiveProgress =>
  ({ objective: { type, target: 3 }, current: isComplete ? 3 : 0, isComplete }) as unknown as BlastObjectiveProgress;

function makeDeps(objectiveProgress: BlastObjectiveProgress[], allComplete = false) {
  return {
    objectives: { objectiveProgress, allObjectivesComplete: allComplete },
    engine: { addBonusScore: vi.fn() },
    sounds: { playWaveClear: vi.fn(), playComboActivation: vi.fn() },
    t: (k: string) => k,
    setScoreFlyEvents: vi.fn(),
    setComboFlash: vi.fn(),
    setComboTypeName: vi.fn(),
    setExplosionShake: vi.fn(),
    setWaveClearParticle: vi.fn(),
    explosionShakeTimerRef: { current: null },
    flyIdRef: { current: 0 },
  };
}

describe('useBlastObjectiveEffects — completion audio', () => {
  it('plays a celebration sound when a hidden objective completes', () => {
    const deps = makeDeps([prog('word_length', false)]);
    const { rerender } = renderHook(
      ({ d }) => useBlastObjectiveEffects(d as never),
      { initialProps: { d: deps } },
    );
    expect(deps.sounds.playComboActivation).not.toHaveBeenCalled();

    const completed = { ...deps, objectives: { objectiveProgress: [prog('word_length', true)], allObjectivesComplete: false } };
    rerender({ d: completed });
    expect(deps.sounds.playComboActivation).toHaveBeenCalledWith(2);
    // Bonus score still credited alongside the sound.
    expect(deps.engine.addBonusScore).toHaveBeenCalled();
  });

  it('does NOT play the celebration sound for clear_percent (wave-clear owns that)', () => {
    const deps = makeDeps([prog('clear_percent', false)]);
    const { rerender } = renderHook(
      ({ d }) => useBlastObjectiveEffects(d as never),
      { initialProps: { d: deps } },
    );
    const completed = { ...deps, objectives: { objectiveProgress: [prog('clear_percent', true)], allObjectivesComplete: false } };
    rerender({ d: completed });
    expect(deps.sounds.playComboActivation).not.toHaveBeenCalled();
  });
});
