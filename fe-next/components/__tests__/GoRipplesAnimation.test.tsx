/**
 * GoRipplesAnimation Component Tests
 *
 * Tests for the countdown animation component (3-2-1-GO!)
 * Ensures the countdown completes even when parent re-renders with new callback references
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import GoRipplesAnimation, { __resetGoRipplesDupGuard } from '../GoRipplesAnimation';
import { prefersStaticFullscreenOverlay } from '../../lib/native/webViewLayerFlash';

// Default to the desktop (animated) path; the native describe forces static.
vi.mock('../../lib/native/webViewLayerFlash', () => ({
  prefersStaticFullscreenOverlay: vi.fn(() => false),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');

  const MotionDiv = React.forwardRef(function MotionDiv(
    { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
    ref: React.Ref<HTMLDivElement>
  ) {
    // Filter out framer-motion specific props
    const { initial, animate, exit, transition, whileHover, whileTap, ...htmlProps } = props as Record<string, unknown>;
    return React.createElement('div', { ...htmlProps, ref }, children);
  });

  const MotionP = React.forwardRef(function MotionP(
    { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
    ref: React.Ref<HTMLParagraphElement>
  ) {
    const { initial, animate, exit, transition, whileHover, whileTap, ...htmlProps } = props as Record<string, unknown>;
    return React.createElement('p', { ...htmlProps, ref }, children);
  });

  return {
    m: {
      div: MotionDiv,
      p: MotionP,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren<{ mode?: string }>) => React.createElement(React.Fragment, null, children),
  };
});

// Mock SoundEffectsContext
vi.mock('../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playCountdownBeep: vi.fn(),
  }),
}));

describe('GoRipplesAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetGoRipplesDupGuard();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetGoRipplesDupGuard();
  });

  it('starts countdown at 3', () => {
    render(<GoRipplesAnimation />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('counts down from 3 to GO!', async () => {
    const onComplete = vi.fn();
    render(<GoRipplesAnimation onComplete={onComplete} />);

    // Start at 3
    expect(screen.getByText('3')).toBeInTheDocument();

    // Advance to 2
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('2')).toBeInTheDocument();

    // Advance to 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('1')).toBeInTheDocument();

    // Advance to GO!
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('GO!')).toBeInTheDocument();

    // Advance to completion
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('completes countdown even when parent re-renders with new callback references', async () => {
    /**
     * This test reproduces the bug where the countdown gets stuck at 3.
     *
     * The bug occurs because:
     * 1. GoRipplesAnimation has onComplete in the useEffect dependency array
     * 2. Parent component re-renders (e.g., due to timeUpdate socket events)
     * 3. New onComplete callback reference is passed (inline arrow function)
     * 4. useEffect cleanup runs, clearing the countdown timer
     * 5. useEffect runs again with same count, setting new timer
     * 6. If parent re-renders faster than 1 second, countdown never progresses
     *
     * The fix should ensure countdown continues regardless of callback reference changes.
     */
    const onComplete = vi.fn();

    // Wrapper component that simulates parent re-renders with INLINE CALLBACKS
    // This is the actual pattern used in HostView.tsx that causes the bug
    const ParentComponent = ({ reRenderCount }: { reRenderCount: number }) => {
      // Force re-render by using state that changes
      const [, setState] = React.useState(reRenderCount);
      React.useEffect(() => {
        setState(reRenderCount);
      }, [reRenderCount]);

      // INLINE arrow function - creates new reference every render (simulates real bug)
      return <GoRipplesAnimation onComplete={() => onComplete()} key="animation" />;
    };

    const { rerender } = render(<ParentComponent reRenderCount={0} />);

    // Start at 3
    expect(screen.getByText('3')).toBeInTheDocument();

    // Simulate rapid parent re-renders (like timeUpdate events every 100ms)
    // These should NOT reset the countdown timer
    for (let i = 1; i <= 5; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender(<ParentComponent reRenderCount={i} />);
    }

    // After 500ms, should still be at 3 (hasn't reached 1 second yet)
    expect(screen.getByText('3')).toBeInTheDocument();

    // Advance remaining 500ms to complete first second
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should now be at 2 (countdown progressed despite re-renders)
    expect(screen.getByText('2')).toBeInTheDocument();

    // Continue with more re-renders during countdown
    for (let i = 6; i <= 10; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender(<ParentComponent reRenderCount={i} />);
    }

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should be at 1
    expect(screen.getByText('1')).toBeInTheDocument();

    // Complete the countdown
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('GO!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('skips a duplicate countdown that mounts within the dup-guard window', async () => {
    // First mount: full 3-2-1-GO + 1s GO hold + onComplete latches the timestamp.
    const firstOnComplete = vi.fn();
    const { unmount: unmountFirst } = render(
      <GoRipplesAnimation onComplete={firstOnComplete} />
    );
    // Tick by 1s steps so each useEffect[count] cycle resolves cleanly.
    act(() => { vi.advanceTimersByTime(1000); }); // 3 → 2
    act(() => { vi.advanceTimersByTime(1000); }); // 2 → 1
    act(() => { vi.advanceTimersByTime(1000); }); // 1 → 0 (GO!)
    act(() => { vi.advanceTimersByTime(1000); }); // GO hold + complete
    expect(firstOnComplete).toHaveBeenCalledTimes(1);
    unmountFirst();

    // Second mount within the guard window should NOT replay the countdown.
    const secondOnComplete = vi.fn();
    render(<GoRipplesAnimation onComplete={secondOnComplete} />);

    // No countdown digits should be shown for the duplicate.
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('GO!')).not.toBeInTheDocument();

    // onComplete fires on next tick so parent unmounts the dup cleanly.
    act(() => { vi.advanceTimersByTime(0); });
    expect(secondOnComplete).toHaveBeenCalledTimes(1);
  });

  it('plays normally again after the dup-guard window expires', () => {
    // Prime the latch with a completed countdown.
    const firstOnComplete = vi.fn();
    const { unmount } = render(<GoRipplesAnimation onComplete={firstOnComplete} />);
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(firstOnComplete).toHaveBeenCalled();
    unmount();

    // Wait past the dup-guard (4000ms in real-time terms — fake timers don't
    // advance Date.now, so use the test reset helper to clear the latch).
    __resetGoRipplesDupGuard();

    const secondOnComplete = vi.fn();
    render(<GoRipplesAnimation onComplete={secondOnComplete} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  describe('native static variant (no GPU-layer white flash)', () => {
    beforeEach(() => {
      vi.mocked(prefersStaticFullscreenOverlay).mockReturnValue(true);
    });
    afterEach(() => {
      vi.mocked(prefersStaticFullscreenOverlay).mockReturnValue(false);
    });

    it('uses an OPAQUE navy full-screen root (covers white-behind, no GPU-promotion flash)', () => {
      const { container } = render(<GoRipplesAnimation />);

      // Countdown content still present from the first paint.
      expect(screen.getByText('3')).toBeInTheDocument();

      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('fixed inset-0');

      // Root is OPAQUE navy (`bg-neo-navy`, not the translucent `/60` backdrop
      // that let a not-yet-painted white surface bleed through during the
      // countdown). An opaque, non-animated root never promotes a full-screen
      // GPU layer, so the WebView never paints an uninitialised white frame.
      expect(root.className).toContain('bg-neo-navy');
      expect(root.className).not.toContain('/60');

      // No entrance opacity tween on the full-screen root — it starts opaque.
      expect(root.className).toContain('opacity-100');
      expect(root.style.opacity).toBe('');
    });

    it('still counts down and fires onComplete on the static path', () => {
      const onComplete = vi.fn();
      render(<GoRipplesAnimation onComplete={onComplete} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByText('2')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(1000); }); // → 1
      act(() => { vi.advanceTimersByTime(1000); }); // → GO!
      expect(screen.getByText('GO!')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(1000); }); // complete
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('handles unmount during countdown gracefully', () => {
    const onComplete = vi.fn();
    const { unmount } = render(<GoRipplesAnimation onComplete={onComplete} />);

    // Advance partway through countdown
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();

    // onComplete should not be called after unmount
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
