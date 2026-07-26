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

  it('never shows on a first visit — coach is disabled', () => {
    render(<ModeCoach mode="classic" />);
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    // Coach was removed: visible is always false.
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
    expect(screen.queryByText('modeCoach.classic.step1')).toBeNull();
  });

  it('renders nothing at all when already seen (show-once)', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    render(<ModeCoach mode="classic" />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
  });

  it('renders nothing for any mode — coach is disabled', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700 + 300);
    });
    expect(screen.queryByText('modeCoach.next')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders nothing for wordHunt mode too', () => {
    render(<ModeCoach mode="wordHunt" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700 + 300);
    });
    expect(screen.queryByText('modeCoach.wordHunt.step1')).toBeNull();
  });

  it('outer touch listener does not throw when coach is hidden', () => {
    render(<ModeCoach mode="classic" graceMs={300} />);
    act(() => {
      vi.advanceTimersByTime(700 + 400);
    });
    expect(() => {
      act(() => {
        document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      });
    }).not.toThrow();
  });
});
