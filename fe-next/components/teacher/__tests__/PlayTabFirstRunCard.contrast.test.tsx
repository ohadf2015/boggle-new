/**
 * The zero-classroom empty state offers exactly ONE thing to do, so that one
 * thing has to read as a control.
 *
 * It shipped as `bg-neo-navy` + `border-black/40` sitting on the card's own
 * `bg-neo-navy-light` — navy on navy-light is about 1.2:1, and a 40%-black
 * border on navy-light about 1.2:1 too. Both are under the 3:1 an edge needs,
 * which is the user's complaint in its exact form ("buttons and options blend
 * with the background"). `contrast-check.js` flags it as `edge<3`.
 *
 * Separately pinned: the width class must be LITERAL (`border-[2px]`), not
 * `border-neo`. `cn()`'s tailwind-merge config files `border-neo` (a width) in
 * the same group as `border-neo-<colour>`, so `twMerge('border-neo
 * border-neo-cream') === 'border-neo-cream'` — the width is dropped and
 * preflight's `border-width: 0` renders the control with no border at all.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ createClassroom: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import PlayTabFirstRunCard from '../PlayTabFirstRunCard';

describe('<PlayTabFirstRunCard> — the one action reads as a control', () => {
  it('separates the GET CODE button from the navy-light card it sits on', () => {
    render(<PlayTabFirstRunCard />);
    const cls = screen.getByTestId('first-run-create-class').className.toString();

    // Tone-on-tone is the failure: a navy fill on a navy-light card.
    expect(cls, `fill must not be navy on a navy-light card: ${cls}`).not.toMatch(
      /\bbg-neo-navy(-light)?\b/,
    );
    // Either a solid neo fill, or a light border doing the work.
    expect(
      /\bbg-neo-(lime|cyan|pink|purple|cream|white)\b/.test(cls) ||
        /\bborder-neo-(cream|white|lime|cyan|pink|purple)\b/.test(cls),
      cls,
    ).toBe(true);
    // A semi-transparent black edge on navy is the same invisibility.
    expect(cls).not.toMatch(/border-black\/\d+/);
  });

  it('writes border widths literally so cn() cannot merge them away', () => {
    render(<PlayTabFirstRunCard />);
    const cls = screen.getByTestId('first-run-create-class').className.toString();
    if (/\bborder-neo-/.test(cls)) {
      expect(cls, `no literal width beside the colour: ${cls}`).toMatch(/border-\[\dpx\]/);
    }
  });

  it('keeps the empty state to one action — no second form to fill in', () => {
    render(<PlayTabFirstRunCard />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
