/**
 * One poster leads; the rest are alternates.
 *
 * Blooket (bar/D_helpcenter_host_2.png) shows eighteen identically sized logos
 * on one wall — every tile shouts equally, so nothing does, and the teacher is
 * left to rank them. The house rule for this gauntlet is the opposite: the
 * recommended tile comes FIRST and LARGE, the rest stay small, and the teacher
 * who agrees with us never ranks anything.
 *
 * The hero is therefore a layout fact, not decoration, and it is pinned here:
 * exactly one tile is hero, it is the live one, and it is first in the DOM so
 * a screen reader and a phone track agree with the eye.
 */

import { render, screen } from '@testing-library/react';
import { ModePickerStrip } from '../ModePickerStrip';
import { TEACHER_GAME_MODES } from '@/lib/education/gameModes';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: unknown) =>
      params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key,
    language: 'en',
  }),
}));

function setup(overrides: Partial<React.ComponentProps<typeof ModePickerStrip>> = {}) {
  render(
    <ModePickerStrip selected="classic" recommended="classic" onPick={vi.fn()} {...overrides} />
  );
}

describe('<ModePickerStrip> — one hero poster, the rest small', () => {
  it('makes exactly one tile the hero', () => {
    setup({ selected: 'blast', recommended: null });
    const heroes = screen.getAllByRole('radio').filter((el) => el.dataset.size === 'hero');
    expect(heroes).toHaveLength(1);
    expect(heroes[0]).toBe(screen.getByTestId('mode-tile-blast'));
  });

  it('puts the hero FIRST, ahead of every alternate', () => {
    setup({ selected: VOCAB_QUIZ_MODE, recommended: VOCAB_QUIZ_MODE });
    const tiles = screen.getAllByRole('radio');
    expect(tiles[0]).toBe(screen.getByTestId(`mode-tile-${VOCAB_QUIZ_MODE}`));
    expect(tiles).toHaveLength(TEACHER_GAME_MODES.length);
  });

  it('leads with the recommended mode when nothing is chosen yet', () => {
    setup({ selected: null, recommended: VOCAB_QUIZ_MODE });
    const tiles = screen.getAllByRole('radio');
    expect(tiles[0]).toBe(screen.getByTestId(`mode-tile-${VOCAB_QUIZ_MODE}`));
    expect(tiles[0].dataset.size).toBe('hero');
  });

  it('still leads with something when there is neither a choice nor a hint', () => {
    setup({ selected: null, recommended: null });
    const heroes = screen.getAllByRole('radio').filter((el) => el.dataset.size === 'hero');
    expect(heroes).toHaveLength(1);
  });

  it('keeps every alternate small', () => {
    setup({ selected: 'classic', recommended: null });
    const compact = screen.getAllByRole('radio').filter((el) => el.dataset.size === 'compact');
    expect(compact).toHaveLength(TEACHER_GAME_MODES.length - 1);
    for (const tile of compact) {
      expect(tile).not.toBe(screen.getByTestId('mode-tile-classic'));
    }
  });

  it('keeps the whole strip on ONE row on a phone, hero included', () => {
    setup();
    const track = screen.getByTestId('mode-picker-track');
    // A wrapping track would push the pinned picker down the viewport and give
    // the lobby a second scrolling region.
    expect(track.className).not.toContain('flex-wrap');
    expect(track.className).toContain('overflow-x-auto');
  });
});
