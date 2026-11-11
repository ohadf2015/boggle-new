import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${p.name}` : k) }),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));

import RivalTicker, { RIVAL_TICKER_MAX, RIVAL_TICKER_SHOW_MS, RIVAL_TICKER_FADE_MS } from '../RivalTicker';

function fakeSocket() {
  const handlers: Record<string, Array<(d: unknown) => void>> = {};
  return {
    socket: {
      on: (e: string, fn: (d: unknown) => void) => { (handlers[e] ??= []).push(fn); },
      off: (e: string, fn: (d: unknown) => void) => { handlers[e] = (handlers[e] ?? []).filter((h) => h !== fn); },
    },
    fire: (e: string, d: unknown) => act(() => { (handlers[e] ?? []).forEach((h) => h(d)); }),
  };
}

const flip = (winnerName: string, gameSessionId = 1) => ({ gameSessionId, winnerName, winnerAvatar: null });

describe('RivalTicker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Given no flips, When rendered, Then nothing shows', () => {
    const s = fakeSocket();
    const { container } = render(<RivalTicker socket={s.socket} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given flips, When they arrive, Then newest is first and at most 3 show', () => {
    const s = fakeSocket();
    render(<RivalTicker socket={s.socket} />);
    for (const name of ['Ana', 'Bo', 'Cy', 'Di']) s.fire('rivalFlip', flip(name));
    const items = screen.getAllByTestId('rival-ticker-item');
    expect(items).toHaveLength(RIVAL_TICKER_MAX);
    expect(items.map((i) => i.textContent)).toEqual(['education.rivals.ticker.flip:Di', 'Cy', 'Bo']);
  });

  it('Given three long flips, When they share the row, Then the newest is the whole sentence and the older ones are name chips that drop whole, never cut mid-sentence', () => {
    const s = fakeSocket();
    render(<RivalTicker socket={s.socket} />);
    for (const name of ['Maximiliana-Josefina', 'Bartholomew-Alexander', 'Konstantina-Evangelia']) s.fire('rivalFlip', flip(name));
    const [lead, ...older] = screen.getAllByTestId('rival-ticker-item');
    expect(lead).toHaveAttribute('data-kind', 'lead');
    expect(lead.className).toMatch(/\bshrink-0\b/);
    expect(lead.outerHTML).not.toMatch(/\btruncate\b/);
    for (const chip of older) {
      expect(chip).toHaveAttribute('data-kind', 'chip');
      expect(chip.className).toMatch(/\bshrink-0\b/);
      expect(chip.textContent).not.toMatch(/education\.rivals\.ticker\.flip/);
      expect(chip).toHaveAttribute('aria-label', expect.stringMatching(/^education\.rivals\.ticker\.flip:/));
      expect(chip.outerHTML).not.toMatch(/\btruncate\b/);
      expect(screen.getAllByTestId('avatar').length).toBeGreaterThanOrEqual(3);
    }
    const chips = screen.getByTestId('rival-ticker-older');
    expect(chips.className).toMatch(/\bflex-wrap\b/);
    expect(chips.className).toMatch(/\boverflow-hidden\b/);
  });

  it('Given a flip, When it is shown, Then the text names only the winner and carries no score', () => {
    const s = fakeSocket();
    render(<RivalTicker socket={s.socket} />);
    s.fire('rivalFlip', { ...flip('Maya'), myScore: 9, rivalScore: 4, loserName: 'Dana' });
    const item = screen.getByTestId('rival-ticker-item');
    expect(item.textContent).toBe('education.rivals.ticker.flip:Maya');
    expect(item.textContent).not.toMatch(/\d|Dana/);
  });

  it('Given older flips, When a few seconds pass, Then the older chips fade and leave while the newest flip stays', () => {
    const s = fakeSocket();
    render(<RivalTicker socket={s.socket} />);
    s.fire('rivalFlip', flip('Ana'));
    s.fire('rivalFlip', flip('Bo'));
    act(() => { vi.advanceTimersByTime(RIVAL_TICKER_SHOW_MS); });
    const [lead, chip] = screen.getAllByTestId('rival-ticker-item');
    expect(lead.className).not.toMatch(/opacity-0/);
    expect(chip.className).toMatch(/opacity-0/);
    act(() => { vi.advanceTimersByTime(RIVAL_TICKER_FADE_MS); });
    expect(screen.getAllByTestId('rival-ticker-item').map((i) => i.textContent)).toEqual(['education.rivals.ticker.flip:Bo']);
  });

  it('Given the last flip, When the round goes on, Then its row keeps showing it, never an empty band, until the next round clears it', () => {
    const s = fakeSocket();
    render(<RivalTicker socket={s.socket} />);
    s.fire('rivalFlip', flip('Ana'));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByTestId('rival-ticker-item')).toHaveTextContent('Ana');
    expect(screen.getByTestId('rival-ticker-item').className).not.toMatch(/opacity-0/);
    s.fire('startGame', { gameSessionId: 2 });
    expect(screen.queryByTestId('rival-ticker')).toBeNull();
  });

  it('Given a new round starts, When an old-round flip arrives, Then it is ignored and the old ones clear', () => {
    const s = fakeSocket();
    render(<RivalTicker socket={s.socket} />);
    s.fire('rivalFlip', flip('Ana', 1));
    s.fire('startGame', { gameSessionId: 2 });
    expect(screen.queryByTestId('rival-ticker-item')).toBeNull();
    s.fire('rivalFlip', flip('Old', 1));
    expect(screen.queryByTestId('rival-ticker-item')).toBeNull();
    s.fire('rivalFlip', flip('New', 2));
    expect(screen.getByTestId('rival-ticker-item')).toHaveTextContent('New');
  });

  it('Given the ticker, When rendered, Then it is one line sized by its container', () => {
    const s = fakeSocket();
    render(<RivalTicker socket={s.socket} />);
    s.fire('rivalFlip', flip('Ana'));
    const root = screen.getByTestId('rival-ticker');
    expect(root.className).toMatch(/@container/);
    expect(screen.getByTestId('rival-ticker-list').className).toMatch(/whitespace-nowrap/);
    expect(screen.getByTestId('rival-ticker-list').className).toMatch(/cqi/);
  });

  it('Given the ticker unmounts, When cleaned up, Then pending timers and listeners are gone', () => {
    const s = fakeSocket();
    const { unmount } = render(<RivalTicker socket={s.socket} />);
    s.fire('rivalFlip', flip('Ana'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
