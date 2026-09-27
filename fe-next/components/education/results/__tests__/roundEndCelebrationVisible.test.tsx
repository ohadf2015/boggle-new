/**
 * The recap must still be MOVING when a late shutter opens.
 *
 * Round 4's critic photographed the projector at +0/+1/+2/+4/+8 s after END
 * ROUND and got five pixel-identical frames. END ROUND is two taps (arm, then
 * confirm) and a screenshot has its own latency, so the first frame lands
 * roughly four seconds in — past the end of any reveal. After that the old
 * screen was motionless: the confetti was a one-shot canvas burst, already
 * settled, and the trophy video is often paused on its poster in a headless
 * renderer.
 *
 * These tests pin the fix on BOTH surfaces: once the winner is revealed the
 * celebration layer is mounted and it keeps running for as long as the recap
 * is up. They are deliberately about presence-at-rest, not about the reveal
 * timetable — a timetable of any length ends, and the frames after it are the
 * ones that were identical.
 */

import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
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

import { ClassroomTvResults } from '../ClassroomTvResults';
import { WinnerSpotlight } from '../WinnerSpotlight';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const summary = (over: Partial<ClassroomSummary> = {}): ClassroomSummary => ({
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Noa'] },
    { word: 'quark', foundBy: [] },
    { word: 'boson', foundBy: [] },
  ],
  missedWords: ['quark', 'boson'],
  masteryByPlayer: { Maya: { found: 2, total: 4 }, Noa: { found: 1, total: 4 } },
  podium: [
    { username: 'Maya', score: 90, rank: 1 },
    { username: 'Noa', score: 70, rank: 2 },
  ],
  ...over,
});

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('the projector is still celebrating when a late shutter opens', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setReducedMotion(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('has no celebration layer before the winner lands', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    expect(screen.queryByTestId('celebration-loop')).toBeNull();
  });

  it('is still celebrating ten seconds after the reveal has finished', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    const layer = screen.getByTestId('celebration-loop');
    // The whole point: this is the frame the +8 s shot catches.
    expect(layer.dataset.celebrationLoop).toBe('animating');
    expect(layer.querySelectorAll('[data-celebration-piece]').length).toBeGreaterThan(0);
  });

  it('still says done at ten seconds, so the layer is what changed, not the stage', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByTestId('classroom-tv-results').dataset.roundEndStage).toBe('done');
  });
});

describe('the student phone celebrates only its own owner', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setReducedMotion(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('keeps celebrating on the winner’s phone long after the reveal', async () => {
    const { ClassroomResultsCard } = await import('../../ClassroomResultsCard');
    render(<ClassroomResultsCard summary={summary()} username="Maya" isTeacher={false} />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByTestId('celebration-loop').dataset.celebrationLoop).toBe('animating');
  });

  it('does not celebrate on a phone whose owner lost', async () => {
    const { ClassroomResultsCard } = await import('../../ClassroomResultsCard');
    render(<ClassroomResultsCard summary={summary()} username="Noa" isTeacher={false} />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // Twenty-nine phones throwing confetti for someone else is noise, and it
    // is the same rule the win sting already follows.
    expect(screen.queryByTestId('celebration-loop')).toBeNull();
  });
});

describe('the trophy moves even when the video will not play', () => {
  beforeEach(() => setReducedMotion(false));
  afterEach(cleanup);

  it('gives the trophy frame a looping pulse once the winner is revealed', () => {
    render(<WinnerSpotlight winner={{ username: 'Maya', score: 90 }} active t={t} />);
    const frame = screen.getByTestId('winner-mascot-frame');
    // A headless renderer that leaves the <video> paused on its poster still
    // has to produce two different frames a second apart.
    expect(frame.dataset.trophyPulse).toBe('on');
  });

  it('does not pulse before the winner is revealed', () => {
    render(<WinnerSpotlight winner={{ username: 'Maya', score: 90 }} active={false} t={t} />);
    expect(screen.getByTestId('winner-mascot-frame').dataset.trophyPulse).toBe('off');
  });

  it('does not pulse under reduced motion', () => {
    setReducedMotion(true);
    render(<WinnerSpotlight winner={{ username: 'Maya', score: 90 }} active t={t} />);
    expect(screen.getByTestId('winner-mascot-frame').dataset.trophyPulse).toBe('off');
  });
});
