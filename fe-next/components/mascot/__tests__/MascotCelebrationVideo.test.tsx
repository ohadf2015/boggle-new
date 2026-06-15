import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Native detection — flip per-test to assert the celebration's animated overlay
// layers do NOT force a GPU compositor layer (`will-change`) inside the
// Capacitor WebView, where a freshly-promoted layer paints an uninitialised
// WHITE backing for a frame before content composites (the "fanfare flashes
// white" report). On web the hint stays (no flash there).
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

import { Capacitor } from '@capacitor/core';
import { MascotCelebrationVideo } from '../MascotCelebrationVideo';

const mockIsNative = vi.mocked(Capacitor.isNativePlatform);

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
    mockIsNative.mockReturnValue(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a champion variant src for kind="champion" (supports multiple clips for variety)', () => {
    render(<MascotCelebrationVideo kind="champion" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    const src = video?.getAttribute('src') || '';
    expect(src).toMatch(/celebration-champion(-[234])?\.mp4$/);
  });

  it('renders a bingo variant src for kind="bingo" (supports multiple clips for variety)', () => {
    render(<MascotCelebrationVideo kind="bingo" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    const src = video?.getAttribute('src') || '';
    expect(src).toMatch(/celebration-bingo(-[23])?\.mp4$/);
  });

  it('renders a streak variant src for kind="streak" (supports multiple clips for variety)', () => {
    render(<MascotCelebrationVideo kind="streak" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    const src = video?.getAttribute('src') || '';
    expect(src).toMatch(/celebration-streak(-[23])?\.mp4$/);
  });

  it('exposes data-kind for analytics/E2E selection', () => {
    render(<MascotCelebrationVideo kind="defeat" />);
    expect(screen.getByTestId('mascot-celebration-video').dataset.kind).toBe('defeat');
  });

  it('eagerly preloads + backs the frame with dark navy so it never flashes white/empty', () => {
    render(<MascotCelebrationVideo kind="champion" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    // preload=metadata left the framed box empty during the scale-in entrance.
    expect(video?.getAttribute('preload')).toBe('auto');
    // dark backing == #0A1828; a slow first frame reads as navy, not a flash.
    expect(video?.style.backgroundColor).toBe('#0A1828');
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

  it('promotes the edge-glow / title / sparkle layers with will-change on web', () => {
    render(<MascotCelebrationVideo kind="champion" />);
    expect(screen.getByTestId('mascot-celebration-edge-glow').style.willChange).toBe('box-shadow');
    expect(screen.getByTestId('mascot-celebration-title').style.willChange).toBe('transform, opacity');
    for (const sparkle of screen.getAllByTestId('mascot-celebration-sparkle')) {
      expect(sparkle.style.willChange).toBe('transform, opacity');
    }
  });

  it('emits NO will-change layer on native — the promoted layer flashes white in the WebView', () => {
    // Root cause of "the fanfare flashes white" on the installed app: each of
    // these decorative layers (edge-glow box-shadow, title, sparkles) forces a
    // persistent GPU compositor layer via `will-change`. The Android System
    // WebView paints a freshly-promoted layer with an uninitialised white backing
    // for a frame or two before the element composites — the edge glow sits
    // directly over the video, so that white wash lands on the celebration.
    // Drop the hint on native (keep the animation); promotion then defers to the
    // first animated frame, after content has painted, so no white flash.
    mockIsNative.mockReturnValue(true);
    const { container } = render(<MascotCelebrationVideo kind="champion" />);
    expect(screen.getByTestId('mascot-celebration-edge-glow').style.willChange).toBe('');
    expect(screen.getByTestId('mascot-celebration-title').style.willChange).toBe('');
    for (const sparkle of screen.getAllByTestId('mascot-celebration-sparkle')) {
      expect(sparkle.style.willChange).toBe('');
    }
    // No will-change hint leaks into the markup at all.
    expect(container.innerHTML).not.toMatch(/will-change/i);
    // The celebration content still renders (we keep the juice, drop the flash).
    expect(screen.getByTestId('mascot-celebration-edge-glow')).toBeInTheDocument();
    expect(screen.getAllByTestId('mascot-celebration-sparkle').length).toBeGreaterThanOrEqual(6);
  });

  it('uses a knight-family video for the "explorer" first-visit-today kind (supports variety clips)', () => {
    // Knight variants (original + new witty knight-2) power explorer; dynamic and energetic
    // for the player's first daily celebration of the day.
    render(<MascotCelebrationVideo kind="explorer" />);
    const video = screen.getByTestId('mascot-celebration-video').querySelector('video');
    const src = video?.getAttribute('src') || '';
    expect(src).toMatch(/celebration-knight(-[23])?\.mp4$/);
  });
});
