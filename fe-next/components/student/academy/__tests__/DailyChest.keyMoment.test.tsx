import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { KEY_MOMENTS } from '@/lib/education/motion/keyMoments';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('framer-motion', () => {
  const tag = (el: string) => {
    const Tag = React.forwardRef(({ animate, transition, initial: _i, whileTap: _w, children, ...rest }: Record<string, unknown>, ref) =>
      React.createElement(el, { ...rest, ref, 'data-animate': JSON.stringify(animate ?? null), 'data-duration': (transition as { duration?: number } | undefined)?.duration }, children as React.ReactNode));
    Tag.displayName = `m.${el}`;
    return Tag;
  };
  return {
    m: new Proxy({}, { get: (_t, el: string) => tag(el) }),
    motion: new Proxy({}, { get: (_t, el: string) => tag(el) }),
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { DailyChest } from '../DailyChest';

const chestBox = () => screen.getByTestId('academy-chest-art');

describe('<DailyChest> key moment', () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ newTotalXp: 300 }) }) as never;
  });

  it('rattles with the shared chest key moment before it opens', () => {
    vi.useFakeTimers();
    render(<DailyChest userId="a" reducedMotion={false} onGranted={vi.fn()} />);
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    expect(JSON.parse(chestBox().dataset.animate!)).toEqual(KEY_MOMENTS.chest.animate);
    act(() => { vi.advanceTimersByTime(KEY_MOMENTS.chest.transition.duration * 1000 + 50); });
    expect(screen.getByText('academy.student.chestCollect')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('opens straight to a still chest under reduced motion: no rattle, no burst', () => {
    render(<DailyChest userId="b" reducedMotion onGranted={vi.fn()} />);
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    const box = chestBox();
    const animate = JSON.parse(box.dataset.animate!);
    for (const v of Object.values(animate ?? {})) expect(Array.isArray(v)).toBe(false);
    expect(Number(box.dataset.duration ?? 0)).toBe(0);
  });
});

describe('<DailyChest> reveal lifetime', () => {
  it('tells the hub when the reveal covers it, and again when it is collected', async () => {
    window.localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ newTotalXp: 300 }) }) as never;
    const onReveal = vi.fn();
    render(<DailyChest userId="c" reducedMotion onGranted={vi.fn()} onRevealChange={onReveal} />);
    expect(onReveal).not.toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    expect(onReveal).toHaveBeenLastCalledWith(true);
    fireEvent.click(await screen.findByText('academy.student.chestCollect'));
    expect(onReveal).toHaveBeenLastCalledWith(false);
  });
});
