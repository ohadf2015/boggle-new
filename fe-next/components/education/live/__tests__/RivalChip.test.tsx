import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  }),
}));

import RivalChip from '../RivalChip';

function fakeSocket() {
  const handlers: Record<string, Array<(d: unknown) => void>> = {};
  return {
    socket: {
      on: (e: string, fn: (d: unknown) => void) => { (handlers[e] ??= []).push(fn); },
      off: (e: string, fn: (d: unknown) => void) => { handlers[e] = (handlers[e] ?? []).filter((h) => h !== fn); },
      emit: () => undefined,
    },
    fire: (e: string, d: unknown) => act(() => { (handlers[e] ?? []).forEach((h) => h(d)); }),
  };
}

const update = (myScore: number, rivalScore: number, rivalName = 'Dana', extra = {}) =>
  ({ gameSessionId: 1, rival: { rivalName, rivalAvatar: null, myScore, rivalScore }, ...extra });

describe('RivalChip', () => {
  it('Given no rival, When rendered, Then nothing shows', () => {
    const s = fakeSocket();
    const { container } = render(<RivalChip socket={s.socket} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given the student is behind, When rendered, Then it shows the name and a minus difference', () => {
    const s = fakeSocket();
    render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(3, 7));
    expect(screen.getByTestId('rival-chip-name')).toHaveTextContent('Dana');
    expect(screen.getByTestId('rival-chip-diff')).toHaveTextContent('−4');
  });

  it('Given the student is ahead, When rendered, Then the difference has a plus sign', () => {
    const s = fakeSocket();
    render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(9, 5));
    expect(screen.getByTestId('rival-chip-diff')).toHaveTextContent('+4');
  });

  it('Given a level score, When rendered, Then it says level instead of a number', () => {
    const s = fakeSocket();
    render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(5, 5));
    expect(screen.getByTestId('rival-chip-diff')).toHaveTextContent('education.rivals.level');
  });

  it('Given a very long name, When rendered, Then the name truncates and the number never shrinks', () => {
    const s = fakeSocket();
    render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(1, 2, 'Maximiliana-Alexandra-Fitzgerald-Montgomery'));
    expect(screen.getByTestId('rival-chip-name').className).toMatch(/truncate/);
    expect(screen.getByTestId('rival-chip-name').className).toMatch(/min-w-0/);
    expect(screen.getByTestId('rival-chip-diff').className).toMatch(/shrink-0/);
    expect(screen.getByTestId('rival-chip').className).toMatch(/max-w-full/);
  });

  it('Given the chip, When rendered, Then it never takes pointer or touch input', () => {
    const s = fakeSocket();
    render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(1, 2));
    expect(screen.getByTestId('rival-chip').className).toMatch(/pointer-events-none/);
  });

  it('Given the number, When the page is RTL, Then the signed number keeps its left-to-right order', () => {
    const s = fakeSocket();
    render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(1, 5));
    expect(screen.getByTestId('rival-chip-diff')).toHaveAttribute('dir', 'ltr');
  });

  it('Given the student takes the lead, When updated, Then a polite announcement names the rival and the pulse is motion-safe', () => {
    const s = fakeSocket();
    render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(1, 3));
    s.fire('rivalUpdate', update(5, 3, 'Dana', { tookLead: true }));
    const live = screen.getByTestId('rival-chip-live');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('education.rivals.announce.lead:{"name":"Dana"}');
    expect(screen.getByTestId('rival-chip-diff').className).toMatch(/motion-safe:animate-neo-pop/);
  });
});
