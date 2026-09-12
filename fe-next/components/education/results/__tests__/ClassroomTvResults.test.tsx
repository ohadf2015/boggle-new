/**
 * The projector's whole end-of-round moment.
 *
 * A classroom host is forced into broadcast mode, so this screen — not the
 * results page — is what the teacher and thirty students actually look at when
 * the timer hits zero. It has to survive being screenshotted at any instant,
 * read from the back of a room, and replayed four times in one period.
 */

import { render, screen, cleanup, waitFor } from '@testing-library/react';
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

import { ClassroomTvResults } from '../ClassroomTvResults';
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

describe('ClassroomTvResults', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(cleanup);

  it('has the podium on the wall before a single name is revealed', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    expect(screen.getByTestId('podium-place-1')).toBeInTheDocument();
    expect(screen.getByTestId('podium-place-2')).toBeInTheDocument();
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-active', 'false');
  });

  it('lands the winner and the mascot celebration on the beat', async () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    await waitFor(
      () => expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-active', 'true'),
      { timeout: 7000 }
    );
    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('Maya');
  });

  it('fills the coverage meter only once the reveal reaches it', async () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    expect(screen.getByTestId('coverage-fill')).toHaveStyle({ width: '0%' });
    await waitFor(() => expect(screen.getByTestId('coverage-fill')).toHaveStyle({ width: '50%' }), {
      timeout: 7000,
    });
  });

  it('says nothing about a session on the first round', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={vi.fn()} t={t} />);
    expect(screen.queryByTestId('classroom-tv-round')).not.toBeInTheDocument();
    expect(screen.queryByTestId('classroom-tv-sweep-streak')).not.toBeInTheDocument();
  });

  it('counts the round out from the second one, so Rematch carries momentum', () => {
    const { unmount } = render(<ClassroomTvResults summary={summary()} onRematch={vi.fn()} t={t} />);
    unmount();
    render(<ClassroomTvResults summary={summary()} onRematch={vi.fn()} t={t} />);
    expect(screen.getByTestId('classroom-tv-round')).toHaveTextContent('2');
  });

  it('flies a streak chip only once the class has swept twice running', () => {
    const swept = summary({ classFoundCount: 4, missedWords: [] });
    const { unmount } = render(<ClassroomTvResults summary={swept} onRematch={vi.fn()} t={t} />);
    expect(screen.queryByTestId('classroom-tv-sweep-streak')).not.toBeInTheDocument();
    unmount();
    render(<ClassroomTvResults summary={swept} onRematch={vi.fn()} t={t} />);
    expect(screen.getByTestId('classroom-tv-sweep-streak')).toHaveTextContent('2');
  });

  it('keeps the class story off the student card key', () => {
    render(<ClassroomTvResults summary={summary()} onRematch={vi.fn()} t={t} />);
    const keys = Array.from({ length: window.sessionStorage.length }, (_, i) =>
      window.sessionStorage.key(i)
    );
    expect(keys.some((k) => k?.endsWith('::class'))).toBe(true);
  });

  it('is a dark-only surface — never the cream pair that flashes on a lazy mount', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    const root = screen.getByTestId('classroom-tv-results');
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toContain('bg-neo-cream');
  });

  it('publishes the stage it is on, so a capture waits for the finished frame', async () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    const root = screen.getByTestId('classroom-tv-results');
    // Painted from the first frame AND self-describing: a screenshot harness
    // that does not know the timeline can poll this instead of guessing.
    expect(root).toHaveAttribute('data-round-end-stage', 'stage');
    await waitFor(() => expect(root).toHaveAttribute('data-round-end-stage', 'done'), {
      timeout: 7000,
    });
  });

  /**
   * Was "scrolls inside itself, never the page body". Containing the scroll
   * was right and still holds; putting it on the ROOT was not. Measured on the
   * wall at 1280x633: scrollHeight 1202 against clientHeight 595, with REMATCH
   * — the screen's one action — six hundred pixels under the fold behind a
   * gesture nobody performs on a projector. The recap now fits, and the only
   * region that may overflow is the list of words left to reteach.
   * See `roundEndProjectorFit.test.tsx`.
   */
  it('locks its own root and scrolls nothing but the reteach list', () => {
    render(<ClassroomTvResults summary={summary()} t={t} />);
    expect(screen.getByTestId('classroom-tv-results').className).toContain('overflow-hidden');
    expect(screen.getByTestId('coverage-words').className).toContain('overflow-y-auto');
  });
});
