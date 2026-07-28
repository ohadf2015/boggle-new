import React from 'react';
import { render, screen, act } from '@testing-library/react';
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

// Contract since commit 87653de ("remove blocking tutorial flow"): the coach
// is disabled — ModeCoach renders nothing in every state. It still marks the
// mode as seen and fires onShown once so a future re-enable won't re-pop for
// existing players and cross-device DB backfill keeps working.
describe('ModeCoach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing on a first visit — even after the settle delay', () => {
    render(<ModeCoach mode="classic" />);
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
    expect(screen.queryByText('modeCoach.classic.step1')).toBeNull();
  });

  it('renders nothing when already seen (show-once)', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    render(<ModeCoach mode="classic" />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
  });

  it('marks the mode as seen and fires onShown once on first visit', () => {
    const onShown = vi.fn();
    render(<ModeCoach mode="wordHunt" onShown={onShown} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(window.localStorage.getItem(coachStorageKey('wordHunt'))).toBe('1');
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('modeCoach.wordHunt.title')).toBeNull();
  });

  it('board taps after the grace period change nothing (still hidden)', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700 + 300);
    });
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
  });
});
