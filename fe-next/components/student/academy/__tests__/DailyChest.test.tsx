import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, unoptimized: _u, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));

import { DailyChest } from '../DailyChest';
import { canOpenChest } from '../dailyChestStore';

describe('<DailyChest>', () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ newTotalXp: 300 }) }) as never;
  });
  afterEach(() => vi.restoreAllMocks());

  it('opens once: reveal over the WHOLE page (portaled to body), marker written, XP granted', async () => {
    const onGranted = vi.fn();
    render(
      <div style={{ position: 'relative', zIndex: 20 }}>
        <DailyChest userId="u1" reducedMotion onGranted={onGranted} />
      </div>,
    );
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    const reveal = await screen.findByTestId('academy-chest-reveal');
    // Not inside the z-20 map layer, where the dock would paint over it.
    expect(reveal.parentElement).toBe(document.body);
    expect(canOpenChest('u1', new Date())).toBe(false);
    await waitFor(() => expect(onGranted).toHaveBeenCalledWith(300));
    expect(screen.getByTestId('academy-daily-chest')).toBeDisabled();
  });

  it('labels the badge through t() and isolates its direction (no reversed "!FREE" in Hebrew)', () => {
    render(<DailyChest userId="u3" reducedMotion onGranted={vi.fn()} />);
    const tag = screen.getByText('academy.student.chestTag');
    expect(tag.closest('[dir="auto"]')).not.toBeNull();
  });

  it('gives the chest back when the XP could not be saved', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as never;
    render(<DailyChest userId="u2" reducedMotion onGranted={vi.fn()} />);
    fireEvent.click(screen.getByTestId('academy-daily-chest'));
    await screen.findByText('academy.student.chestFailed');
    expect(canOpenChest('u2', new Date())).toBe(true);
  });
});
