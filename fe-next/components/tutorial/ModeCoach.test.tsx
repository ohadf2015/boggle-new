import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModeCoach } from './ModeCoach';
import { coachStorageKey } from '@/lib/tutorial/modeCoachStore';

// t() echoes the key so we can assert on i18n keys directly.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Render framer-motion synchronously: AnimatePresence passes children through
// (no rAF-driven exit retention, which fake timers can't flush), and m.div is a
// ref-forwarding div with motion-only props stripped so cardRef.contains works.
vi.mock('framer-motion', () => {
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'layout', 'variants']);
  const div = React.forwardRef(function MotionDiv(props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) {
    const clean: Record<string, unknown> = {};
    for (const k of Object.keys(props)) if (!MOTION_PROPS.has(k)) clean[k] = props[k];
    return React.createElement('div', { ...clean, ref });
  });
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    m: new Proxy({}, { get: () => div }),
    useReducedMotion: () => false,
  };
});

describe('ModeCoach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the mode title + first caption on a first visit', () => {
    render(<ModeCoach mode="classic" />);
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText('modeCoach.classic.title')).toBeInTheDocument();
    expect(screen.getByText('modeCoach.classic.step1')).toBeInTheDocument();
  });

  it('renders nothing at all when already seen (show-once)', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    render(<ModeCoach mode="classic" />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
  });

  it('does NOT dismiss when the user taps inside the card (so Next/Skip work)', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700 + 300); // visible + grace armed
    });
    const next = screen.getByText('modeCoach.next');
    // Real tap = a pointerdown that bubbles to the capture-phase window listener.
    act(() => {
      next.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    // Still open — a tap on the card must not auto-dismiss it.
    expect(screen.getByText('modeCoach.classic.title')).toBeInTheDocument();
  });

  it('DOES dismiss when the user taps the board behind it (after grace)', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700); // settle → visible (arm timer now scheduled)
    });
    act(() => {
      vi.advanceTimersByTime(400); // grace elapsed → listener armed
    });
    expect(screen.getByText('modeCoach.classic.title')).toBeInTheDocument();
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
  });

  it('reaches the last step + scoreTip via Next (multi-step not collapsed)', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700 + 300);
    });
    // classic = 2 steps; advancing should reveal step2 + the score tip, not close.
    fireEvent.click(screen.getByText('modeCoach.next'));
    expect(screen.getByText('modeCoach.classic.step2')).toBeInTheDocument();
    expect(screen.getByText('modeCoach.classic.scoreTip')).toBeInTheDocument();
  });

  it('wordHunt reaches a 3rd step teaching the free-bonus-word mechanic', () => {
    render(<ModeCoach mode="wordHunt" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700 + 300);
    });
    fireEvent.click(screen.getByText('modeCoach.next')); // step1 -> step2
    fireEvent.click(screen.getByText('modeCoach.next')); // step2 -> step3
    expect(screen.getByText('modeCoach.wordHunt.step3')).toBeInTheDocument();
  });
});
