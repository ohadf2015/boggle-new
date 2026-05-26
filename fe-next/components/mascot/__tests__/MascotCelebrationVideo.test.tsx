import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MascotCelebrationVideo } from '../MascotCelebrationVideo';

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('MascotCelebrationVideo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the champion variant src for kind="champion"', () => {
    render(<MascotCelebrationVideo kind="champion" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    expect(video?.getAttribute('src')).toBe('/mascots/celebration-champion.mp4');
  });

  it('renders the bingo variant src for kind="bingo"', () => {
    render(<MascotCelebrationVideo kind="bingo" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    expect(video?.getAttribute('src')).toBe('/mascots/celebration-bingo.mp4');
  });

  it('renders the streak variant src for kind="streak"', () => {
    render(<MascotCelebrationVideo kind="streak" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    expect(video?.getAttribute('src')).toBe('/mascots/celebration-streak.mp4');
  });

  it('exposes data-kind for analytics/E2E selection', () => {
    render(<MascotCelebrationVideo kind="defeat" />);
    expect(screen.getByTestId('mascot-celebration-video').dataset.kind).toBe('defeat');
  });

  it('calls onDone after autoDismissMs', () => {
    const onDone = vi.fn();
    render(<MascotCelebrationVideo kind="knight" autoDismissMs={2500} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('still auto-dismisses when the parent re-renders with a fresh onDone every tick', () => {
    // Regression: a parent with a 1s countdown (e.g. DailyWordHuntResults) passes
    // a NEW inline `onDone` arrow on every render. If the auto-dismiss timer is
    // keyed on that callback identity it gets cleared+reset every second and the
    // fixed full-screen overlay never dismisses — leaving the results page
    // unresponsive and unscrollable. The timer must survive parent re-renders.
    const onDone = vi.fn();
    const { rerender } = render(
      <MascotCelebrationVideo kind="streak" autoDismissMs={2600} onDone={() => onDone()} />,
    );
    // Three 1s ticks → 3s of wall-clock, re-rendering with a new onDone each time.
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      rerender(<MascotCelebrationVideo kind="streak" autoDismissMs={2600} onDone={() => onDone()} />);
    }
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('overlay is non-blocking: click-through and no dimming backdrop', () => {
    // The celebration must not hide ("kiss") the results text or block
    // scroll/taps. Overlay should be pointer-events:none with no dark/blur
    // backdrop, so the live results stay readable and scrollable while the
    // mascot video + halo glow play on top, then fade.
    render(<MascotCelebrationVideo kind="champion" />);
    const overlay = screen.getByTestId('mascot-celebration-video');
    expect(overlay.style.pointerEvents).toBe('none');
    expect(overlay.style.background).toBe('');
    expect(overlay.style.backdropFilter).toBe('');
  });

  it('never calls onDone when autoDismissMs is 0', () => {
    const onDone = vi.fn();
    render(<MascotCelebrationVideo kind="knight" autoDismissMs={0} onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('renders nothing under prefers-reduced-motion', () => {
    mockReducedMotion(true);
    const { container } = render(<MascotCelebrationVideo kind="champion" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders overlay role status by default; not as overlay when overlay=false', () => {
    const { rerender } = render(<MascotCelebrationVideo kind="knight" />);
    expect(screen.getByTestId('mascot-celebration-video').getAttribute('role')).toBe('status');
    rerender(<MascotCelebrationVideo kind="knight" overlay={false} />);
    expect(screen.getByTestId('mascot-celebration-video').getAttribute('role')).toBeNull();
  });

  it('renders a hero title above the video, sourced from the kind by default', () => {
    render(<MascotCelebrationVideo kind="champion" />);
    const title = screen.getByTestId('mascot-celebration-title');
    expect(title).not.toBeNull();
    // Title must precede the video in DOM order (so it renders above it).
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video')!;
    const pos = title.compareDocumentPosition(video);
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('honors a caller-provided title (translated by parent)', () => {
    render(<MascotCelebrationVideo kind="bingo" title="מרשים!" />);
    expect(screen.getByTestId('mascot-celebration-title').textContent).toContain('מרשים!');
  });

  it('omits the title when title=null and no built-in default exists', () => {
    render(<MascotCelebrationVideo kind="champion" title={null} />);
    expect(screen.queryByTestId('mascot-celebration-title')).toBeNull();
  });

  it('renders an animated edge glow layer around the video frame', () => {
    render(<MascotCelebrationVideo kind="bingo" />);
    expect(screen.getByTestId('mascot-celebration-edge-glow')).not.toBeNull();
  });

  it('renders sparkle particle elements for extra ambient animation', () => {
    render(<MascotCelebrationVideo kind="streak" />);
    const sparkles = screen.getAllByTestId('mascot-celebration-sparkle');
    expect(sparkles.length).toBeGreaterThanOrEqual(6);
  });

  it('uses the upgraded video file for the "explorer" first-visit-today kind', () => {
    // The original celebration-explorer.mp4 felt low-energy for the daily first-visit
    // beat. Swapped to celebration-knight.mp4 — a more impressive generic victory
    // render that lands better as the player's first celebration of the day.
    render(<MascotCelebrationVideo kind="explorer" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    expect(video?.getAttribute('src')).toBe('/mascots/celebration-knight.mp4');
  });
});
