import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DirectionsTutorialOverlay } from './DirectionsTutorialOverlay';
import { DIRECTIONS_TUTORIAL_STORAGE_KEY } from '@/lib/tutorial/directionsTutorialStore';

// t() echoes the key (ignoring params) so we can assert on i18n keys directly.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Render framer-motion synchronously (see ModeCoach.test.tsx for rationale).
vi.mock('framer-motion', () => {
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'layout', 'variants']);
  const el = (tag: string) =>
    React.forwardRef(function MotionEl(props: Record<string, unknown>, ref: React.Ref<HTMLElement>) {
      const clean: Record<string, unknown> = {};
      for (const k of Object.keys(props)) if (!MOTION_PROPS.has(k)) clean[k] = props[k];
      return React.createElement(tag, { ...clean, ref });
    });
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    m: new Proxy({}, { get: (_t, tag: string) => el(tag) }),
    useReducedMotion: () => false,
  };
});

const SETTLE = 650; // > hook settleMs (600)

describe('DirectionsTutorialOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  it('does not show before the settle delay, then shows on a first visit', () => {
    render(<DirectionsTutorialOverlay />);
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
    act(() => { vi.advanceTimersByTime(SETTLE); });
    expect(screen.getByText('directionsTutorial.title')).toBeInTheDocument();
    expect(screen.getByText('directionsTutorial.subtitle')).toBeInTheDocument();
  });

  it('renders nothing when already seen (show-once)', () => {
    window.localStorage.setItem(DIRECTIONS_TUTORIAL_STORAGE_KEY, '1');
    render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(SETTLE); });
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
  });

  it('does not show when disabled', () => {
    render(<DirectionsTutorialOverlay enabled={false} />);
    act(() => { vi.advanceTimersByTime(SETTLE); });
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
  });

  it('persists "seen" at show-time so a reload without dismissing does not re-pop', () => {
    const { unmount } = render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(SETTLE); });
    expect(window.localStorage.getItem(DIRECTIONS_TUTORIAL_STORAGE_KEY)).toBe('1');
    unmount();

    render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(SETTLE); });
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
  });

  it('locks the CTA for 10s, then unlocks it', () => {
    render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(SETTLE); });

    const cta = screen.getByRole('button', { name: 'directionsTutorial.cta' });
    expect(cta).toBeDisabled();
    // Early click is a no-op — overlay stays up.
    fireEvent.click(cta);
    expect(screen.getByText('directionsTutorial.title')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByRole('button', { name: 'directionsTutorial.cta' })).toBeEnabled();
  });

  it('freezes the clock on show and releases it on dismiss', () => {
    const events: boolean[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener('directionsTutorialActiveChange', listener);

    render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(SETTLE); });
    expect(events).toEqual([true]);

    act(() => { vi.advanceTimersByTime(10_000); });
    fireEvent.click(screen.getByRole('button', { name: 'directionsTutorial.cta' }));

    expect(events).toEqual([true, false]);
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
    window.removeEventListener('directionsTutorialActiveChange', listener);
  });
});
