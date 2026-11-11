import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  }),
}));

vi.mock('@/components/Avatar', () => ({ default: () => <i data-testid="avatar" /> }));
const sfx = { playLeadChangeSound: vi.fn() };
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));

import RivalChip from '../RivalChip';
import { useRivalPresent } from '../rivalPresence';

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

function mount(my: number, theirs: number, name?: string) {
  const s = fakeSocket();
  render(<RivalChip socket={s.socket} />);
  s.fire('rivalUpdate', update(my, theirs, name));
  return s;
}

describe('RivalChip: a live tug bar against my rival', () => {
  beforeEach(() => sfx.playLeadChangeSound.mockClear());

  it('Given no rival, When rendered, Then nothing shows', () => {
    const s = fakeSocket();
    const { container } = render(<RivalChip socket={s.socket} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given I lead by 4, When rendered, Then my side of the rope holds well over half the bar', () => {
    mount(41, 37);
    const fill = screen.getByTestId('rival-tug-fill');
    expect(parseInt(fill.style.width, 10)).toBeGreaterThan(65);
    expect(screen.getByTestId('rival-chip')).toHaveAttribute('data-status', 'ahead');
  });

  it.each([
    [9, 5, 'bg-neo-lime', '+4'],
    [3, 7, 'bg-neo-pink', '−4'],
    [5, 5, 'bg-neo-cream', 'education.rivals.level'],
  ])('Given my %i vs their %i, When rendered, Then the gap badge is %s and carries its sign', (mine, theirs, tone, text) => {
    mount(mine, theirs);
    const diff = screen.getByTestId('rival-chip-diff');
    expect(diff.className).toContain(tone);
    expect(diff).toHaveTextContent(text);
    expect(diff).toHaveAttribute('dir', 'ltr');
    expect(diff.className).toMatch(/shrink-0/);
  });

  it('Given a very long name on a phone row, When rendered, Then no name is cut off: the phone row shows the face, the tall rail shows the whole name wrapped', () => {
    mount(1, 2, 'Maximiliana-Alexandra-Fitzgerald');
    const name = screen.getByTestId('rival-chip-name');
    expect(name.className).not.toMatch(/\btruncate\b/);
    expect(name.className).toMatch(/\bhidden\b/);
    expect(name.className).toMatch(/\blg:block\b/);
    expect(name.className).toMatch(/overflow-wrap:anywhere/);
    expect(screen.getByTestId('rival-chip')).toHaveAttribute('aria-label', expect.stringContaining('Maximiliana-Alexandra-Fitzgerald'));
  });

  it.each([
    ['QA R2 3', 'QA R2 3'],
    ['Noa K', 'Noa K'],
    ['Noa B', 'Noa B'],
    ['Maximiliana-Josefina', 'Maximiliana-Josefina'],
  ])('Given a tall phone tray and rival %s, Then the whole name rides above the rope, direction-isolated, cut with an ellipsis only past about twelve characters', (name, shown) => {
    mount(1, 2, name);
    const label = screen.getByTestId('rival-chip-short-name');
    expect(label.textContent).toBe(shown);
    expect(label).toHaveAttribute('dir', 'auto');
    expect(label).toHaveAttribute('title', name);
    expect(label.className).toMatch(/\bmax-w-\[12ch\]/);
    expect(label.className).toMatch(/\btruncate\b/);
    expect(label.className).toMatch(/\[@container\(min-height:300px\)\]:block/);
    expect(label.className).toMatch(/\blg:hidden\b/);
  });

  it('Given the bar, When rendered, Then it never takes pointer or touch input and is a full-size row', () => {
    mount(1, 2);
    const chip = screen.getByTestId('rival-chip');
    expect(chip.className).toMatch(/pointer-events-none/);
    expect(chip.className).toMatch(/\bmin-h-9\b/);
    expect(screen.getByTestId('rival-chip-avatar')).toBeInTheDocument();
  });

  it('Given I was behind, When I overtake, Then the bar shakes motion-safe, plays the lead sound and announces it politely', () => {
    const s = mount(1, 3);
    expect(screen.getByTestId('rival-chip')).not.toHaveAttribute('data-overtake');
    const liveBefore = screen.getByTestId('rival-chip-live');
    s.fire('rivalUpdate', update(5, 3, 'Dana', { tookLead: true }));
    expect(screen.getByTestId('rival-chip-live')).toBe(liveBefore);
    const chip = screen.getByTestId('rival-chip');
    expect(chip).toHaveAttribute('data-overtake', 'took');
    expect(chip.className).toMatch(/motion-safe:animate-\[edu-tug-shake/);
    expect(sfx.playLeadChangeSound).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('rival-chip-live')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('rival-chip-live')).toHaveTextContent('education.rivals.announce.lead:{"name":"Dana"}');
  });

  it('Given I was ahead, When my rival passes me, Then the bar shakes but no victory sound plays', () => {
    const s = mount(5, 3);
    s.fire('rivalUpdate', update(5, 8));
    expect(screen.getByTestId('rival-chip')).toHaveAttribute('data-overtake', 'lost');
    expect(sfx.playLeadChangeSound).not.toHaveBeenCalled();
  });

  it('Given a duel, When the rival shows, Then the round knows a duel owns the voice, and forgets it when the chip leaves', () => {
    const presence = renderHook(() => useRivalPresent());
    expect(presence.result.current).toBe(false);
    const s = fakeSocket();
    const { unmount } = render(<RivalChip socket={s.socket} />);
    s.fire('rivalUpdate', update(1, 2));
    expect(presence.result.current).toBe(true);
    unmount();
    expect(presence.result.current).toBe(false);
  });
});
