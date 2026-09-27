/**
 * ONE sound per screen, per round. No exceptions.
 *
 * The two cues were written a component apart and each one is correct on its
 * own: the winner's sting fires on the winner's beat (1650ms) and the class
 * sweep's chime fires on the meter's (2150ms). Put them on the same screen and
 * a round the class swept plays BOTH, half a second apart, with two confetti
 * bursts behind them — which is the "it screamed at us four times" bug the
 * spotlight's own comment was written to prevent, arriving through the front
 * door instead.
 *
 * No per-component test could catch it: each mocks the sound module and counts
 * its own calls. This one composes the actual screens and counts the calls
 * across the whole surface — the only place the number is real.
 *
 * The tie-break: when the class swept, the SWEEP wins. One child winning is one
 * child's moment; a class that found every word did something together, and
 * that is the sound the room should be left with.
 */

import { render, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const playRoundEndCue = vi.fn(() => null);
const fireRankConfetti = vi.fn();
const fireVictoryConfetti = vi.fn();

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: (...args: unknown[]) => fireRankConfetti(...args),
  fireVictoryConfetti: () => fireVictoryConfetti(),
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

import { ClassroomTvResults } from '../ClassroomTvResults';
import { ClassroomResultsCard } from '../../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { roundEndTimeline } from '@/lib/education/roundEndStage';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function summary(found: number): ClassroomSummary {
  const words = ['atlas', 'basalt', 'crater', 'delta'];
  return {
    teacherName: 'Ms. Cohen',
    lessonNames: ['Unit 3'],
    lessonIds: ['l1'],
    totalWords: words.length,
    classFoundCount: found,
    coverage: words.map((word, i) => ({ word, foundBy: i < found ? ['Maya'] : [] })),
    missedWords: words.slice(found),
    masteryByPlayer: { Maya: { found, total: words.length } },
    podium: [
      { username: 'Maya', score: 140, rank: 1 },
      { username: 'Noa', score: 110, rank: 2 },
    ],
  };
}

/**
 * Run the whole reveal timetable out, past the last step.
 *
 * Derived from the timetable rather than hardcoded: a literal 4000 silently
 * stopped short the moment the timetable was widened for the 1-second shutter
 * (round 5), and every cue assertion here failed as "called 0 times" — which
 * reads like a broken cue rather than a test that stopped early.
 */
async function playOutTheReveal() {
  const timeline = roundEndTimeline();
  const end = timeline[timeline.length - 1].at;
  await act(async () => {
    vi.advanceTimersByTime(end + 500);
  });
}

describe('the end of a round makes exactly one sound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    playRoundEndCue.mockClear();
    fireRankConfetti.mockClear();
    fireVictoryConfetti.mockClear();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('plays the sweep chime ALONE on the projector when the class swept', async () => {
    render(<ClassroomTvResults summary={summary(4)} onRematch={() => {}} t={t} />);
    await playOutTheReveal();
    expect(playRoundEndCue).toHaveBeenCalledTimes(1);
    expect(playRoundEndCue.mock.calls[0][0]).toBe('/sounds/education-class-sweep.mp3');
  });

  it('still plays the winner sting on the projector when the class did not sweep', async () => {
    render(<ClassroomTvResults summary={summary(2)} onRematch={() => {}} t={t} />);
    await playOutTheReveal();
    expect(playRoundEndCue).toHaveBeenCalledTimes(1);
    expect(playRoundEndCue.mock.calls[0][0]).toBe('/sounds/education-round-win.mp3');
  });

  it('never stacks two confetti bursts on one screen', async () => {
    render(<ClassroomTvResults summary={summary(4)} onRematch={() => {}} t={t} />);
    await playOutTheReveal();
    expect(fireRankConfetti).not.toHaveBeenCalled();
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });

  it('makes one sound at most on the winner’s own phone', async () => {
    render(
      <ClassroomResultsCard
        summary={summary(4)}
        username="Maya"
        isTeacher={false}
        standings={[
          { username: 'Maya', score: 140 },
          { username: 'Noa', score: 110 },
        ]}
      />
    );
    await playOutTheReveal();
    expect(playRoundEndCue).toHaveBeenCalledTimes(1);
  });

  it('leaves a classmate’s phone silent — and still bursts for them', async () => {
    render(
      <ClassroomResultsCard
        summary={summary(4)}
        username="Noa"
        isTeacher={false}
        standings={[
          { username: 'Maya', score: 140 },
          { username: 'Noa', score: 110 },
        ]}
      />
    );
    await playOutTheReveal();
    // Silence: twenty-nine phones chiming a third of a second apart is noise.
    expect(playRoundEndCue).not.toHaveBeenCalled();
    // But the sweep is theirs too — the confetti is the part that is.
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });
});
