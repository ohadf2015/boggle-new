/**
 * Thirty phones, one fanfare.
 *
 * The projector is the room's screen and it celebrates for everyone. A student
 * phone is one child's screen: firing the win sting and the confetti burst on
 * all thirty of them means twenty-nine children hear a fanfare for someone
 * else, a third of a second out of sync with each other and with the wall. So
 * the phone celebrates only when the phone's owner actually won; everyone else
 * still SEES the winner bar, in full, with the mascot — it just does not shout.
 *
 * Also pinned here: the card exposes the reveal stage it is on, so a capture
 * (and a human) can wait for the finished frame instead of screenshotting the
 * podium mid-beat and calling it broken.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fireRankConfetti = vi.fn();
const playRoundEndCue = vi.fn(() => null);

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: (...args: unknown[]) => fireRankConfetti(...args),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: (...args: unknown[]) => playRoundEndCue(...args),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false }),
}));

import { ClassroomResultsCard } from '../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Maya', 'Noa'] },
    { word: 'neutron', foundBy: [] },
    { word: 'quark', foundBy: [] },
  ],
  missedWords: ['neutron', 'quark'],
  classFoundCount: 2,
  masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
  podium: [
    { username: 'Maya', score: 90, rank: 1 },
    { username: 'Noa', score: 70, rank: 2 },
  ],
};

const standings = [
  { username: 'Maya', score: 90 },
  { username: 'Noa', score: 70 },
];

describe('ClassroomResultsCard — who the fanfare is for', () => {
  beforeEach(() => {
    fireRankConfetti.mockClear();
    playRoundEndCue.mockClear();
    window.sessionStorage.clear();
  });

  it('celebrates on the winner’s own phone', async () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Maya"
        isTeacher={false}
        standings={standings}
      />
    );
    await waitFor(() => expect(fireRankConfetti).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(playRoundEndCue).toHaveBeenCalledTimes(1);
  });

  it('stays quiet on a classmate’s phone', async () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    // Wait past the winner's beat — the bar is there in full, in silence.
    await waitFor(
      () => expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-active', 'true'),
      { timeout: 5000 }
    );
    expect(fireRankConfetti).not.toHaveBeenCalled();
    expect(playRoundEndCue).not.toHaveBeenCalled();
  });

  it('names the winner on every phone in the room', async () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    await waitFor(
      () => expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-active', 'true'),
      { timeout: 5000 }
    );
  });

  it('publishes the reveal stage it is on, so a capture can wait for the finished frame', async () => {
    render(
      <ClassroomResultsCard
        summary={summary}
        username="Noa"
        isTeacher={false}
        standings={standings}
      />
    );
    const card = screen.getByTestId('classroom-results-card');
    expect(card).toHaveAttribute('data-round-end-stage');
    await waitFor(() => expect(card).toHaveAttribute('data-round-end-stage', 'done'), {
      timeout: 7000,
    });
  });
});
