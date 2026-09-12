/**
 * A practice tile has to read as a *control* before it reads as a picture.
 *
 * The contrast rule for this module (design addendum, 2026-09-11) is that a
 * tappable thing must differ from the surface around it by its own fill or by
 * a >=3:1 border — not by its contents. The first cut of this tile painted the
 * button itself `bg-neo-navy` on a navy grid and let a child span carry the
 * accent colour, which meant an automated audit measured navy-on-navy (1.2:1)
 * and flagged all fourteen tiles even though a human could see the art.
 *
 * These tests pin the fix at the level the audit measures it: the *button's
 * own* class carries the accent, and a locked tile that keeps the navy fill
 * carries a light border instead.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticePickerTile from './PracticePickerTile';
import type { PracticeTile } from '@/lib/education/practicePicker';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join(',')})` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const tile = (over: Partial<PracticeTile> = {}): PracticeTile =>
  ({
    id: 'matching',
    mode: 'matching',
    titleKey: 'education.practicePicker.modes.matching',
    skillKey: 'education.practicePicker.skills.matching',
    ready: true,
    count: 12,
    countKind: 'words',
    sessions: 0,
    ...over,
  }) as PracticeTile;

describe('PracticePickerTile contrast', () => {
  it('reads as a control against the navy grid without borrowing the accent', () => {
    render(<PracticePickerTile tile={tile()} onSelect={vi.fn()} />);
    const button = screen.getByTestId('practice-tile-matching');
    // ONE card style for every tile: navy-light fill, 3px cream edge. The hero
    // owns the screen's accent fill, so four posters never put four accents up.
    expect(button.className).toContain('bg-neo-navy-light');
    expect(button.className).toContain('border-neo-cream');
    expect(button.className).toContain('border-[3px]');
  });

  it('keeps the mode colour as a rail so the tiles stay colour-coded', () => {
    render(<PracticePickerTile tile={tile()} onSelect={vi.fn()} />);
    const rail = screen.getByTestId('practice-tile-matching').querySelector('[data-tile-rail]');
    expect(rail?.className).toContain('bg-neo-lime');
  });

  it('lets a bespoke poster fill the card', () => {
    render(<PracticePickerTile tile={tile({ id: 'blitz', mode: 'blitz' })} onSelect={vi.fn()} />);
    expect(
      screen.getByTestId('practice-tile-art-blitz').closest('[data-poster-frame]')
    ).not.toBeNull();
  });

  it('keeps a locked tile bordered so it still reads as a control', () => {
    render(
      <PracticePickerTile
        tile={tile({ id: 'vocab_focus:synonym', mode: 'vocab_focus', ready: false })}
        onSelect={vi.fn()}
      />
    );
    const button = screen.getByTestId('practice-tile-vocab_focus:synonym');
    // Cream on navy measures 16.8:1; the black edge the tile used to carry
    // measures 1.23:1 and reads as no edge at all.
    expect(button.className).toContain('border-neo-cream');
    expect(button.className).not.toContain('opacity-');
    expect(button.className).toContain('border-[3px]');
  });
});
