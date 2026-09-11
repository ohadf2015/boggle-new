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
  it('paints the accent on the button itself, not only on a child', () => {
    render(<PracticePickerTile tile={tile()} onSelect={vi.fn()} />);
    const button = screen.getByTestId('practice-tile-matching');
    // matching is the lime tile; the accent must be the button's own fill.
    expect(button.className).toContain('bg-neo-lime');
    expect(button.className).not.toContain('bg-neo-navy');
  });

  it('gives a poster tile the same accent fill, framing the art', () => {
    render(<PracticePickerTile tile={tile({ id: 'blitz', mode: 'blitz' })} onSelect={vi.fn()} />);
    const button = screen.getByTestId('practice-tile-blitz');
    expect(button.className).toContain('bg-neo-pink');
    // The poster is inset so the accent reads as a frame rather than being
    // covered edge to edge by a navy-painted illustration.
    expect(screen.getByTestId('practice-tile-art-blitz').closest('[data-poster-frame]')).not.toBeNull();
  });

  it('keeps a locked tile bordered so it still reads as a control', () => {
    render(
      <PracticePickerTile
        tile={tile({ id: 'vocab_focus:synonym', mode: 'vocab_focus', ready: false })}
        onSelect={vi.fn()}
      />
    );
    const button = screen.getByTestId('practice-tile-vocab_focus:synonym');
    expect(button.className).toContain('border-neo-white/45');
    expect(button.className).not.toContain('border-black/40');
  });
});
