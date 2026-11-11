import React from 'react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ResolvedClassroomPressure } from '@/shared/types/classroom';

const { trackGrowthEvent, reduced, pressure } = vi.hoisted(() => ({
  trackGrowthEvent: vi.fn(),
  reduced: { value: false },
  pressure: { value: null as ResolvedClassroomPressure | null },
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => reduced.value }));
vi.mock('@/hooks/gameState/classroomPressureStore', () => ({ useClassroomPressure: () => pressure.value }));

import { EduMascotReactions, eduPoseFor } from '../EduMascotReactions';
import { emitMascotEvent, _resetMascotBus } from '@/lib/blast/mascotBus';

const LOUD: ResolvedClassroomPressure = { leaderboard: 'full', timer: 'full', speedScoring: true };

describe('EduMascotReactions', () => {
  beforeEach(() => {
    _resetMascotBus();
    trackGrowthEvent.mockClear();
    reduced.value = false;
    pressure.value = null;
    localStorage.clear();
  });

  it('stays hidden until the student does something', () => {
    render(<EduMascotReactions mode="edu-duel" />);
    expect(screen.queryByTestId('edu-mascot-reaction')).toBeNull();
  });

  it('pops the education mascot on a found word and records it once with the edu mode', () => {
    render(<EduMascotReactions mode="edu-duel" />);
    act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 5, gemLetterUsed: false }));
    const pop = screen.getByTestId('edu-mascot-reaction');
    expect(pop.getAttribute('data-state')).toBe('cheer');
    expect(screen.getByTestId('edu-mascot-success')).toBeTruthy();
    expect(trackGrowthEvent).toHaveBeenCalledWith('mascot_reaction_shown', { state: 'cheer', mode: 'edu-duel' });
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
  });

  it('shows nothing under reduced motion', () => {
    reduced.value = true;
    render(<EduMascotReactions mode="edu-duel" />);
    act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 7, gemLetterUsed: false }));
    expect(screen.queryByTestId('edu-mascot-reaction')).toBeNull();
    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });

  it('dances on a combo of 5 when the teacher left the dials loud', () => {
    pressure.value = LOUD;
    const { rerender } = render(<EduMascotReactions mode="edu-duel" comboLevel={4} />);
    rerender(<EduMascotReactions mode="edu-duel" comboLevel={5} />);
    expect(screen.getByTestId('edu-mascot-reaction').getAttribute('data-state')).toBe('dancing');
  });

  it('ignores combo speed when the teacher set a gentle timer', () => {
    pressure.value = { ...LOUD, timer: 'gentle' };
    const { rerender } = render(<EduMascotReactions mode="edu-duel" comboLevel={4} />);
    rerender(<EduMascotReactions mode="edu-duel" comboLevel={5} />);
    expect(screen.queryByTestId('edu-mascot-reaction')).toBeNull();
  });

  it('hides speed and streak reactions when the leaderboard is hidden but still cheers a word', () => {
    pressure.value = { ...LOUD, leaderboard: 'hidden' };
    render(<EduMascotReactions mode="edu-missgap" />);
    act(() => emitMascotEvent({ kind: 'wave-streak', streakCount: 3 }));
    expect(screen.queryByTestId('edu-mascot-reaction')).toBeNull();
    act(() => emitMascotEvent({ kind: 'low-moves', movesRemaining: 1 }));
    expect(screen.queryByTestId('edu-mascot-reaction')).toBeNull();
  });

  it('brings out the cheering crowd with one confused copy on the projector win', () => {
    render(<EduMascotReactions mode="edu-boss" placement="stage" />);
    act(() => emitMascotEvent({ kind: 'wave-clear' }));
    const crowd = screen.getByTestId('edu-mascot-crowd');
    expect(crowd.querySelectorAll('[data-crowd-member]').length).toBe(5);
    expect(crowd.querySelectorAll('[data-crowd-member="offbeat"]').length).toBe(1);
  });

  it('keeps phones to a single short pop on a win, no crowd', () => {
    render(<EduMascotReactions mode="edu-missgap" />);
    act(() => emitMascotEvent({ kind: 'wave-clear' }));
    expect(screen.queryByTestId('edu-mascot-crowd')).toBeNull();
    expect(screen.getByTestId('edu-mascot-podium')).toBeTruthy();
  });
});

describe('eduPoseFor', () => {
  it('never shows the tangled error pose for a loss', () => {
    expect(eduPoseFor('sad-supportive')).not.toBe('error');
  });
});
