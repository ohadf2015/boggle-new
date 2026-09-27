/**
 * The sweep belongs to the ROOM, not to the top of the class.
 *
 * A class that found every lesson word did it together, so the moment has to
 * land on all thirty phones — including the phone of the child who personally
 * found two of four. Before this, the projector burst into gold and every
 * student screen showed a half-filled lime bar and said nothing about it: the
 * one celebration that was meant to include everybody was the one only the wall
 * could see.
 *
 * The personal meter stays personal — nobody is told they found words they did
 * not find. What is added is the room's line, and it is the class sweep (not
 * the viewer's own tally) that arms the chime and the confetti, so the burst
 * fires on the same beat on every device in the room.
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fireVictoryConfetti = vi.fn();
const cleanupConfetti = vi.fn();
const playRoundEndCue = vi.fn(() => null);

vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: () => fireVictoryConfetti(),
  cleanupConfetti: () => cleanupConfetti(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: (...args: unknown[]) => playRoundEndCue(...args),
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
}));

import { WordCoverageGlance } from '../WordCoverageGlance';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

/** The class found all four; Maya personally found two of them. */
const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['l1'],
  totalWords: 4,
  classFoundCount: 4,
  coverage: [
    { word: 'atlas', foundBy: ['Maya'] },
    { word: 'basalt', foundBy: ['Noa'] },
    { word: 'crater', foundBy: ['Maya'] },
    { word: 'delta', foundBy: ['Omri'] },
  ],
  missedWords: [],
  masteryByPlayer: { Maya: { found: 2, total: 4 } },
};

const studentGlance = (props: Record<string, unknown> = {}) => (
  <WordCoverageGlance
    summary={summary}
    username="Maya"
    isTeacher={false}
    neverPlaced={new Set()}
    t={t}
    {...props}
  />
);

describe('WordCoverageGlance — the class sweep reaches the phone', () => {
  beforeEach(() => {
    fireVictoryConfetti.mockClear();
    playRoundEndCue.mockClear();
  });
  afterEach(cleanup);

  it('tells a student the class swept it even when their own tally is partial', () => {
    render(studentGlance({ classSwept: true }));
    expect(screen.getByTestId('class-sweep-tag')).toBeInTheDocument();
    // Their own number is still their own — no flattering lie.
    expect(screen.getByTestId('coverage-meter')).toHaveAttribute('aria-valuenow', '2');
  });

  it('bursts on the class sweep, not on the viewer’s own tally', () => {
    render(studentGlance({ classSwept: true, celebrate: true }));
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
    expect(playRoundEndCue).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the class missed something', () => {
    render(studentGlance({ classSwept: false, celebrate: true }));
    expect(screen.queryByTestId('class-sweep-tag')).not.toBeInTheDocument();
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
  });

  it('never shows the room’s line twice on the teacher’s own class meter', () => {
    // The teacher's meter IS the class's; its own gold sweep tag already says so.
    render(
      <WordCoverageGlance
        summary={summary}
        username=""
        isTeacher
        neverPlaced={new Set()}
        classSwept
        t={t}
      />
    );
    expect(screen.getByTestId('coverage-sweep')).toBeInTheDocument();
    expect(screen.queryByTestId('class-sweep-tag')).not.toBeInTheDocument();
  });
});
