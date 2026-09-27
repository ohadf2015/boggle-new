/**
 * The class-wide moment.
 *
 * One student winning is one student's moment. A class that found every single
 * lesson word did something together, and until now that landed as a bar at
 * 100% and nothing else. The meter now fills and BURSTS — gold, a tag, one
 * chime — and it is the only celebration on the screen that belongs to
 * everyone, including the child who came last.
 *
 * The meter's resting state is still the painted one: `fill` defaults to true,
 * so a screenshot, a reduced-motion render and a reload all show the real
 * number without waiting for a transition (Pitfall Class 5).
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

const summary = (found: number, total: number): ClassroomSummary => ({
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['l1'],
  totalWords: total,
  classFoundCount: found,
  coverage: Array.from({ length: total }, (_, i) => ({
    word: `word${i}`,
    foundBy: i < found ? ['Maya'] : [],
  })),
  missedWords: [],
  masteryByPlayer: { Maya: { found, total } },
});

const glance = (props: Record<string, unknown> = {}) => (
  <WordCoverageGlance
    summary={summary(2, 4)}
    username=""
    isTeacher
    neverPlaced={new Set()}
    t={t}
    {...props}
  />
);

describe('WordCoverageGlance — the sweep', () => {
  beforeEach(() => {
    fireVictoryConfetti.mockClear();
    cleanupConfetti.mockClear();
    playRoundEndCue.mockClear();
  });

  afterEach(cleanup);

  it('paints the real width with no staging asked for', () => {
    render(glance());
    expect(screen.getByTestId('coverage-fill')).toHaveStyle({ width: '50%' });
  });

  it('starts the meter empty only when the reveal explicitly holds it', () => {
    render(glance({ fill: false }));
    expect(screen.getByTestId('coverage-fill')).toHaveStyle({ width: '0%' });
  });

  it('shows no sweep tag short of every word', () => {
    render(glance({ celebrate: true }));
    expect(screen.queryByTestId('coverage-sweep')).not.toBeInTheDocument();
  });

  it('bursts when the class found every lesson word', () => {
    render(glance({ summary: summary(4, 4), celebrate: true }));
    expect(screen.getByTestId('coverage-sweep')).toBeInTheDocument();
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
    expect(playRoundEndCue).toHaveBeenCalledTimes(1);
  });

  it('bursts once, however often the results screen re-renders', () => {
    const { rerender } = render(glance({ summary: summary(4, 4), celebrate: true }));
    rerender(glance({ summary: summary(4, 4), celebrate: true }));
    rerender(glance({ summary: summary(4, 4), celebrate: true }));
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });

  it('still marks the sweep when the celebration is not armed — a reload sees it too', () => {
    render(glance({ summary: summary(4, 4) }));
    expect(screen.getByTestId('coverage-sweep')).toBeInTheDocument();
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
    expect(playRoundEndCue).not.toHaveBeenCalled();
  });

  it('does not claim a sweep for a lesson with no words at all', () => {
    render(glance({ summary: summary(0, 0), celebrate: true }));
    expect(screen.queryByTestId('coverage-sweep')).not.toBeInTheDocument();
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
  });

  it('never fades the meter in', () => {
    const { container } = render(glance({ summary: summary(4, 4), celebrate: true }));
    expect(container.querySelectorAll('.opacity-0')).toHaveLength(0);
    expect(container.querySelectorAll('.animate-neo-pop')).toHaveLength(0);
  });
});
