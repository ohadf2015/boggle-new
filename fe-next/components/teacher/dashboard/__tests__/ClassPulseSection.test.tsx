/**
 * ClassPulseSection — the pulse card wired to one surface's actions.
 *
 * The card decides WHAT the next move is; this decides what that move does
 * here. The branch worth pinning hardest is `review`: the card already fires
 * `onReviewWords`, so routing it a second time through `onAction` would open
 * two lessons from one tap.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassPulseSection } from '../ClassPulseSection';
import { deriveClassPulse } from '@/lib/education/classPulse';

const refresh = vi.fn();
const mockUseClassPulse = vi.fn();
vi.mock('@/hooks/useClassPulse', () => ({
  useClassPulse: (opts: unknown) => mockUseClassPulse(opts),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (k: string) => k }),
  LanguageContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

const NOW = Date.parse('2026-09-15T10:00:00.000Z');

const reviewGame = {
  playedAt: new Date(NOW - 86400000).toISOString(),
  gameMode: 'vocab-quiz',
  participation: { played: 2, roster: 3 },
  averageAccuracyPct: 63,
  players: [{ studentId: 's1', name: 'Blaise', accuracyPct: 25 }],
  missedWords: [{ word: 'ephemeral', pct: 50 }],
};

function setPulse(input: Parameters<typeof deriveClassPulse>[0], over = {}) {
  mockUseClassPulse.mockReturnValue({
    pulse: deriveClassPulse({ ...input, now: NOW }),
    isLoading: false,
    error: null,
    refresh,
    ...over,
  });
}

function renderSection(props: Partial<Record<string, unknown>> = {}) {
  const handlers = {
    onInvite: vi.fn(),
    onPlay: vi.fn(),
    onReviewWords: vi.fn(),
    ...props,
  };
  render(
    <ClassPulseSection
      classroomId="c1"
      classroomName="Year 7 English"
      rosterCount={3}
      onInvite={handlers.onInvite as () => void}
      onPlay={handlers.onPlay as () => void}
      onReviewWords={handlers.onReviewWords as (w: string[]) => void}
    />
  );
  return handlers;
}

describe('ClassPulseSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks the hook for the class it was handed', () => {
    setPulse({ rosterCount: 3, lastGame: reviewGame });

    renderSection();

    expect(mockUseClassPulse).toHaveBeenCalledWith(
      expect.objectContaining({ classroomId: 'c1', rosterCount: 3 })
    );
  });

  it('routes invite to the surface that owns the join code', async () => {
    setPulse({ rosterCount: 0, lastGame: null });

    const { onInvite, onPlay } = renderSection();
    await userEvent.click(screen.getByTestId('class-pulse-action'));

    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('routes both play and playAgain to this screen\'s launch control', async () => {
    setPulse({ rosterCount: 3, lastGame: null });
    const first = renderSection();
    await userEvent.click(screen.getByTestId('class-pulse-action'));
    expect(first.onPlay).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    setPulse({
      rosterCount: 3,
      lastGame: { ...reviewGame, players: [{ studentId: 's1', name: 'Ada', accuracyPct: 99 }], missedWords: [] },
    });
    const second = renderSection();
    await userEvent.click(screen.getAllByTestId('class-pulse-action').at(-1)!);
    expect(second.onPlay).toHaveBeenCalledTimes(1);
  });

  it('opens exactly ONE review lesson, with the words the class missed', async () => {
    // The card fires `onReviewWords` itself. If this component ALSO routed
    // 'review' somewhere, one tap would open two lessons.
    setPulse({ rosterCount: 3, lastGame: reviewGame });

    const { onReviewWords, onPlay, onInvite } = renderSection();
    await userEvent.click(screen.getByTestId('class-pulse-action'));

    expect(onReviewWords).toHaveBeenCalledTimes(1);
    expect(onReviewWords).toHaveBeenCalledWith(['ephemeral']);
    expect(onPlay).not.toHaveBeenCalled();
    expect(onInvite).not.toHaveBeenCalled();
  });

  it('re-runs the read when the teacher retries a failed one', async () => {
    mockUseClassPulse.mockReturnValue({
      pulse: deriveClassPulse({ rosterCount: 3, lastGame: null, lastGameUnavailable: true, now: NOW }),
      isLoading: false,
      error: new Error('network'),
      refresh,
    });

    renderSection();
    await userEvent.click(screen.getByTestId('class-pulse-action'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows the failure, not a spinner, when the read failed', () => {
    // A failed read that keeps spinning reads as "still working" forever —
    // the silent-failure shape (pitfall class 4). The card's `unknown` state
    // has to be reachable, so isLoading must not swallow it.
    mockUseClassPulse.mockReturnValue({
      pulse: deriveClassPulse({ rosterCount: 3, lastGame: null, lastGameUnavailable: true, now: NOW }),
      isLoading: true,
      error: new Error('network'),
      refresh,
    });

    renderSection();

    expect(screen.getByTestId('class-pulse')).toHaveAttribute('data-state', 'unknown');
    expect(screen.queryByTestId('class-pulse-loading')).not.toBeInTheDocument();
  });

  describe('hidePlayAction prop', () => {
    it('shows play button by default when hidePlayAction is false', () => {
      // ClassPulseSection defaults to showing the play button. The dashboard
      // consumer can opt-in to hiding it via the hidePlayAction prop.
      setPulse({ rosterCount: 3, lastGame: null });
      renderSection();

      // The play button should be rendered by default
      expect(screen.getByTestId('class-pulse-action')).toBeInTheDocument();
      expect(screen.getByTestId('class-pulse-action')).toHaveTextContent('teacher.pulse.action.play');
    });

    it('can suppress play button when hidePlayAction={true} is passed', () => {
      // When the dashboard has GO LIVE as the primary launch path, it passes
      // hidePlayAction={true} to avoid duplicate buttons.
      setPulse({ rosterCount: 3, lastGame: null });

      // Simulate passing hidePlayAction={true} from TeacherDashboard
      mockUseClassPulse.mockReturnValue({
        pulse: deriveClassPulse({ rosterCount: 3, lastGame: null, now: NOW }),
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      const { container } = render(
        <ClassPulseSection
          classroomId="class1"
          classroomName="Test Class"
          rosterCount={3}
          onInvite={vi.fn()}
          onPlay={vi.fn()}
          onReviewWords={vi.fn()}
          hidePlayAction={true}
        />
      );

      // The play button should be suppressed
      expect(screen.queryByTestId('class-pulse-action')).not.toBeInTheDocument();
    });
  });
});
