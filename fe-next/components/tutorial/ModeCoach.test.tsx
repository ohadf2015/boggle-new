import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModeCoach } from './ModeCoach';
import { coachStorageKey } from '@/lib/tutorial/modeCoachStore';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

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

  it('renders nothing on a first visit — coach removed per user request', () => {
    render(<ModeCoach mode="classic" />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
  });

  it('renders nothing at all when already seen (show-once)', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    render(<ModeCoach mode="classic" />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByText('modeCoach.classic.title')).toBeNull();
  });

  it('dismiss does not crash (safe no-op)', () => {
    render(<ModeCoach mode="classic" />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    // No content visible — safe no-op assertions pass
    expect(screen.queryByText('modeCoach.next')).toBeNull();
  });

  it('marks seen in storage on mount to prevent re-shows', () => {
    render(<ModeCoach mode="classic" />);
    expect(window.localStorage.getItem(coachStorageKey('classic'))).toBe('1');
  });
});
