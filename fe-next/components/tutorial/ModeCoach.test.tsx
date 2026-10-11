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

describe('ModeCoach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the coach on a first visit after the settle delay', () => {
    render(<ModeCoach mode="classic" />);
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('modeCoach.classic.step1')).toBeInTheDocument();
  });

  it('renders nothing when already seen (show-once)', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    render(<ModeCoach mode="classic" />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks the mode as seen and fires onShown once on first visit', () => {
    const onShown = vi.fn();
    render(<ModeCoach mode="wordHunt" onShown={onShown} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(window.localStorage.getItem(coachStorageKey('wordHunt'))).toBe('1');
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('a board tap after the grace period dismisses it', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a tap during the grace period does not dismiss it', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
