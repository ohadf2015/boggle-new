import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PreResultFanfare } from '../PreResultFanfare';
import type { MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';

// Mock the inner video component so we can control onDone easily (TDD isolation)
vi.mock('@/components/mascot/MascotCelebrationVideo', () => ({
  MascotCelebrationVideo: ({ kind, onDone, overlay, forceSrc }: any) => (
    <div
      data-testid="inner-celebration-video"
      data-kind={kind}
      data-overlay={overlay}
      data-force-src={forceSrc}
    >
      <button data-testid="trigger-done" onClick={onDone}>
        Simulate Video Done
      </button>
    </div>
  ),
}));

// canvas-confetti is dynamically imported inside the component — hoisted mock
// so the dynamic import resolves to our spy.
const { confettiMock } = vi.hoisted(() => ({ confettiMock: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: confettiMock }));

function setReducedMotion(matches: boolean) {
  window.matchMedia = ((q: string) => ({
    matches,
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  })) as unknown as typeof window.matchMedia;
}

describe('PreResultFanfare — pre-result video then transition to results', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the MascotCelebrationVideo with the provided kind as the pre-result moment', () => {
    const onComplete = vi.fn();
    render(<PreResultFanfare kind="champion" onComplete={onComplete} t={(k, f) => f || k} />);

    const inner = screen.getByTestId('inner-celebration-video');
    expect(inner).toBeInTheDocument();
    expect(inner.dataset.kind).toBe('champion');
    // Should not be the old full-screen overlay style by default for pre
    expect(inner.dataset.overlay).toBe('false');
  });

  it('calls onComplete when the video finishes (the signal to transition to result page)', () => {
    const onComplete = vi.fn();
    render(<PreResultFanfare kind="bingo" onComplete={onComplete} t={(k, f) => f || k} />);

    expect(onComplete).not.toHaveBeenCalled();

    // Simulate the video ending (user or auto)
    act(() => {
      screen.getByTestId('trigger-done').click();
    });

    // The component uses a short exit animation timeout before calling onComplete
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows a skip control so users can go straight to the result page', () => {
    const onComplete = vi.fn();
    render(<PreResultFanfare kind="streak" onComplete={onComplete} t={(k, f) => f || k} />);

    // The skip should be present (accessible, uses t())
    const skip = screen.getByRole('button', { name: /skip|results/i });
    expect(skip).toBeInTheDocument();

    act(() => {
      skip.click();
    });

    // Skip also triggers the exit timeout path
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('uses the correct kind for different game moments (reuses existing pick logic)', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <PreResultFanfare kind="defeat" onComplete={onComplete} t={(k, f) => f || k} />
    );
    expect(screen.getByTestId('inner-celebration-video').dataset.kind).toBe('defeat');

    rerender(<PreResultFanfare kind="mission-complete" onComplete={onComplete} t={(k, f) => f || k} />);
    expect(screen.getByTestId('inner-celebration-video').dataset.kind).toBe('mission-complete');
  });

  it('fires a colour-matched confetti burst on mount', async () => {
    vi.useRealTimers();
    setReducedMotion(false);
    confettiMock.mockClear();
    const onComplete = vi.fn();
    render(<PreResultFanfare kind="champion" onComplete={onComplete} t={(k, f) => f || k} />);

    await vi.waitFor(() => expect(confettiMock).toHaveBeenCalled());
    // champion palette includes the celebration gold
    const colors = confettiMock.mock.calls[0][0].colors as string[];
    expect(colors).toContain('#FFE135');
  });

  it('does NOT fire confetti (and skips straight to results) under reduced motion', () => {
    setReducedMotion(true);
    confettiMock.mockClear();
    const onComplete = vi.fn();
    render(<PreResultFanfare kind="bingo" onComplete={onComplete} t={(k, f) => f || k} />);

    // Reduced-motion path hands off immediately and shows no video/confetti
    expect(onComplete).toHaveBeenCalled();
    expect(confettiMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('inner-celebration-video')).not.toBeInTheDocument();
    setReducedMotion(false); // restore for other tests
  });
});
