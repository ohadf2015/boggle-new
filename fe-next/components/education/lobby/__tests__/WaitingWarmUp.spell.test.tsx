import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const sfx = { playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() };
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/lib/education/liveHaptics', () => ({ pulseLive: vi.fn() }));

import { WaitingWarmUp } from '../WaitingWarmUp';

const t = (k: string) => k;

function tapLetter(letter: string) {
  const tile = within(screen.getByTestId('warmup-spell-tiles'))
    .getAllByRole('button')
    .find((b) => b.getAttribute('data-letter') === letter && b.getAttribute('data-used') !== 'true')!;
  fireEvent.click(tile);
}
const slots = () => within(screen.getByTestId('warmup-spell-slots')).getAllByTestId(/^warmup-slot-/);

describe('WaitingWarmUp with list words: spelling tiles', () => {
  beforeEach(() => sfx.playTileSelectSound.mockClear());

  it('Given list words, Then it deals the first word as empty slots and scrambled letter tiles, with the spelling hint', () => {
    render(<WaitingWarmUp username="Maya" words={['cat', 'dog']} t={t} />);
    expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'spell');
    expect(screen.getByText('Warm-up: tap the letters in order')).toBeInTheDocument();
    expect(slots()).toHaveLength(3);
    expect(slots().map((s) => s.getAttribute('data-filled'))).toEqual(['false', 'false', 'false']);
    expect(slots().map((s) => s.textContent)).toEqual(['C', 'A', 'T']);
    for (const slot of slots()) expect(slot.className).toContain('text-neo-cream/35');
    const letters = within(screen.getByTestId('warmup-spell-tiles')).getAllByRole('button').map((b) => b.getAttribute('data-letter'));
    expect([...letters].sort()).toEqual(['A', 'C', 'T']);
  });

  it('When the letters are tapped in order, Then the slots fill, a star is earned and "Spelled!" pops before the next word', () => {
    render(<WaitingWarmUp username="Maya" words={['cat', 'dog']} t={t} />);
    tapLetter('C');
    tapLetter('A');
    expect(slots().map((s) => s.getAttribute('data-filled'))).toEqual(['true', 'true', 'false']);
    tapLetter('T');
    expect(screen.getByTestId('warmup-score')).toHaveTextContent('1');
    expect(screen.getByTestId('warmup-spelled')).toHaveTextContent('Spelled!');
    const next = within(screen.getByTestId('warmup-spell-tiles')).getAllByRole('button').map((b) => b.getAttribute('data-letter'));
    expect([...next].sort()).toEqual(['D', 'G', 'O']);
  });

  it('When a wrong letter is tapped, Then the tile shakes and nothing is lost', () => {
    render(<WaitingWarmUp username="Maya" words={['cat']} t={t} />);
    tapLetter('T');
    expect(screen.getByTestId('warmup-score')).toHaveTextContent('0');
    expect(slots().map((s) => s.getAttribute('data-filled'))).toEqual(['false', 'false', 'false']);
    expect(screen.getByTestId('warmup-spell-tiles').getAttribute('data-miss')).toBe('1');
  });

  it('When the words change while mounted, Then it deals the new list instead of the old one', () => {
    const { rerender } = render(<WaitingWarmUp username="Maya" words={['cat']} t={t} />);
    rerender(<WaitingWarmUp username="Maya" words={['dog']} t={t} />);
    expect(slots().map((s) => s.textContent)).toEqual(['D', 'O', 'G']);
  });

  it('Given a Hebrew word, Then slots and tiles run right to left', () => {
    render(<WaitingWarmUp username="נועה" words={['שלום']} t={t} />);
    expect(screen.getByTestId('warmup-spell-slots')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('warmup-spell-tiles')).toHaveAttribute('dir', 'rtl');
  });

  it('Given only kanji words, Then it falls back to the tap-the-lit-letter game', () => {
    render(<WaitingWarmUp username="Maya" words={['学校', '先生']} t={t} />);
    expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'tap');
    expect(screen.getByTestId('warmup-tile-0')).toBeInTheDocument();
  });

  it('Given no words, Then it stays the name tap game', () => {
    render(<WaitingWarmUp username="Maya" t={t} />);
    expect(screen.getByTestId('waiting-warmup')).toHaveAttribute('data-kind', 'tap');
  });

  it('Then its motion is transform-only and behind motion-safe', () => {
    render(<WaitingWarmUp username="Maya" words={['cat']} t={t} />);
    const css = screen.getByTestId('waiting-warmup').querySelector('style')!.textContent ?? '';
    expect(css).not.toMatch(/opacity/);
    for (const b of within(screen.getByTestId('warmup-spell-tiles')).getAllByRole('button')) {
      expect(b.className).not.toMatch(/(^|\s)animate-/);
    }
  });
});
