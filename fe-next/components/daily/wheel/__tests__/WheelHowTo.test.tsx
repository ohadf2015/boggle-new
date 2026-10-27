import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  }),
}));

import WheelHowTo from '../WheelHowTo';
import { HOW_TO_PUZZLES } from '../wheelHowToPuzzles';

const tap = (letter: string) => fireEvent.click(screen.getByRole('button', { name: letter }));

describe('WheelHowTo', () => {
  it('Given a first-time player, When the how-to shows, Then it is a 5-letter wheel with the center letter in the middle', () => {
    render(<WheelHowTo onAccepted={vi.fn()} />);
    expect(screen.getAllByRole('button').filter((b) => b.hasAttribute('data-wheel-letter'))).toHaveLength(5);
    expect(document.querySelector('[data-wheel-index="-1"]')?.getAttribute('data-wheel-letter')).toBe('a');
  });

  it('Given letters spelling a real word through the center, When spelled, Then the word is accepted', () => {
    const onAccepted = vi.fn();
    render(<WheelHowTo onAccepted={onAccepted} />);
    tap('c'); tap('a'); tap('t');
    fireEvent.click(screen.getByTestId('wheel-howto-check'));
    expect(screen.getByTestId('wheel-howto-status').getAttribute('data-state')).toBe('accepted');
    expect(onAccepted).toHaveBeenCalledWith('cat');
  });

  it('Given a word that skips the center letter, When checked, Then it explains the center rule and clears', () => {
    render(<WheelHowTo onAccepted={vi.fn()} />);
    tap('t'); tap('e'); tap('c');
    fireEvent.click(screen.getByTestId('wheel-howto-check'));
    const status = screen.getByTestId('wheel-howto-status');
    expect(status.getAttribute('data-state')).toBe('needCenter');
    expect(document.querySelectorAll('[data-wheel-used="true"]')).toHaveLength(0);
  });

  it('Given every locale, When its demo words are checked, Then each uses the center and only wheel letters', () => {
    for (const [lang, p] of Object.entries(HOW_TO_PUZZLES)) {
      expect(p.outer, lang).toHaveLength(4);
      expect(p.words, lang).toContain(p.hint);
      for (const w of p.words) {
        const pool = [p.center, ...p.outer];
        expect([...w].includes(p.center), `${lang}:${w}`).toBe(true);
        for (const c of w) {
          const i = pool.indexOf(c);
          expect(i, `${lang}:${w}`).toBeGreaterThan(-1);
          pool.splice(i, 1);
        }
      }
    }
  });
});
