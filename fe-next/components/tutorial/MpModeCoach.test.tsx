import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MpModeCoach } from './MpModeCoach';
import { GAME_MODE_RULES } from '@/backend/modes/rules';
import { MODE_COACH } from '@/lib/tutorial/modeCoachContent';
import { mpCoachMode } from '@/lib/tutorial/mpCoachMode';

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

let gameMode = 'classic';
vi.mock('@/hooks/gameState', () => ({ useGameMode: () => gameMode }));

describe('MpModeCoach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(Object.keys(GAME_MODE_RULES))('a new player in a %s room sees that mode\'s coach', (mode) => {
    gameMode = mode;
    render(<MpModeCoach />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const coach = MODE_COACH[mpCoachMode(mode)!];
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(coach.steps[0].captionKey)).toBeInTheDocument();
  });
});
