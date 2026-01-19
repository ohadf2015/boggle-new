/**
 * GoRipplesAnimation Component Tests
 *
 * Tests for the countdown animation component (3-2-1-GO!)
 * Ensures the countdown completes even when parent re-renders with new callback references
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import GoRipplesAnimation from '../GoRipplesAnimation';

// Mock framer-motion
jest.mock('framer-motion', () => {
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
    motion: {
      div: MotionDiv,
      p: MotionP,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren<{ mode?: string }>) => React.createElement(React.Fragment, null, children),
  };
});

// Mock SoundEffectsContext
jest.mock('../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playCountdownBeep: jest.fn(),
  }),
}));

describe('GoRipplesAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts countdown at 3', () => {
    render(<GoRipplesAnimation />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('counts down from 3 to GO!', async () => {
    const onComplete = jest.fn();
    render(<GoRipplesAnimation onComplete={onComplete} />);

    // Start at 3
    expect(screen.getByText('3')).toBeInTheDocument();

    // Advance to 2
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('2')).toBeInTheDocument();

    // Advance to 1
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('1')).toBeInTheDocument();

    // Advance to GO!
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('GO!')).toBeInTheDocument();

    // Advance to completion
    act(() => {
      jest.advanceTimersByTime(1000);
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
    const onComplete = jest.fn();

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
        jest.advanceTimersByTime(100);
      });
      rerender(<ParentComponent reRenderCount={i} />);
    }

    // After 500ms, should still be at 3 (hasn't reached 1 second yet)
    expect(screen.getByText('3')).toBeInTheDocument();

    // Advance remaining 500ms to complete first second
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should now be at 2 (countdown progressed despite re-renders)
    expect(screen.getByText('2')).toBeInTheDocument();

    // Continue with more re-renders during countdown
    for (let i = 6; i <= 10; i++) {
      act(() => {
        jest.advanceTimersByTime(100);
      });
      rerender(<ParentComponent reRenderCount={i} />);
    }

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should be at 1
    expect(screen.getByText('1')).toBeInTheDocument();

    // Complete the countdown
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('GO!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('handles unmount during countdown gracefully', () => {
    const onComplete = jest.fn();
    const { unmount } = render(<GoRipplesAnimation onComplete={onComplete} />);

    // Advance partway through countdown
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();

    // onComplete should not be called after unmount
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
