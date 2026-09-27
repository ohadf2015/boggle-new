/**
 * The strip is the ALTERNATIVES, and only the alternatives.
 *
 * Blooket (bar/gameplay/27_host_currenthostingscreen.webp) answers "which game"
 * with a wall of eighteen equally loud logos in a column that scrolls past the
 * fold — the ranking is handed back to the teacher, and the mode's mechanic,
 * its length and its fit for the material all live behind a second tap.
 *
 * Ours answers it with ONE hero (pinned by LobbyModeHero's own test) and this
 * strip underneath it, which exists only while the fold is open. Its contract:
 *  - it lists every mode EXCEPT the one already chosen — never the same poster
 *    twice, so "which one am I playing" is never a question;
 *  - one tap on a tile is the whole interaction, no select-then-confirm;
 *  - it is a fixed grid, never a scroller: nothing inside the locked lobby
 *    shell may grow its own scrollbar (the round-1 critic's disqualifying gap
 *    was a picker that scrolled the PAGE — a nested scroller is the same bug
 *    one level down);
 *  - nothing fades in from zero opacity (recurring pitfall class 5).
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
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
  const onPick = vi.fn();
  const props: React.ComponentProps<typeof ModePickerStrip> = {
    selected: 'classic',
    recommended: null,
    onPick,
    ...overrides,
  };
  render(<ModePickerStrip {...props} />);
  return { onPick };
}

describe('<ModePickerStrip> — every game except the one you are already playing', () => {
  it('lists every alternate mode, and never the chosen one', () => {
    setup({ selected: 'classic' });
    const tiles = screen.getAllByRole('radio');
    expect(tiles).toHaveLength(TEACHER_GAME_MODES.length - 1);
    expect(screen.queryByTestId('mode-tile-classic')).not.toBeInTheDocument();
    for (const mode of TEACHER_GAME_MODES.filter((m) => m.id !== 'classic')) {
      expect(screen.getByTestId(`mode-tile-${mode.id}`)).toBeInTheDocument();
    }
  });

  it('names every alternate on its own face, next to its mascot poster', () => {
    setup({ selected: VOCAB_QUIZ_MODE });
    for (const mode of TEACHER_GAME_MODES.filter((m) => m.id !== VOCAB_QUIZ_MODE)) {
      const tile = screen.getByTestId(`mode-tile-${mode.id}`);
      expect(within(tile).getByText(mode.nameKey)).toBeInTheDocument();
      const img = tile.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src') || '').toContain(encodeURIComponent(mode.poster));
    }
  });

  it('picks on the FIRST tap — no select-then-confirm', () => {
    const { onPick } = setup({ selected: 'classic' });
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('blast');
  });

  it('flags at most one alternate as the fit for these words', () => {
    setup({ selected: 'classic', recommended: VOCAB_QUIZ_MODE });
    const flags = screen.getAllByTestId('mode-recommended');
    expect(flags).toHaveLength(1);
    const quizTile = screen.getByTestId(`mode-tile-${VOCAB_QUIZ_MODE}`);
    expect(quizTile.contains(flags[0])).toBe(true);
  });

  it('flags nothing when the words give us nothing to go on', () => {
    setup({ selected: 'classic', recommended: null });
    expect(screen.queryByTestId('mode-recommended')).not.toBeInTheDocument();
  });

  it('stops taking taps while a room is already on the wire', () => {
    const { onPick } = setup({ selected: 'classic', busy: true });
    const tile = screen.getByTestId('mode-tile-blast');
    expect(tile).toBeDisabled();
    fireEvent.click(tile);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('never grows a scrollbar of its own inside the locked lobby', () => {
    setup();
    const track = screen.getByTestId('mode-picker-track');
    expect(track.className).not.toMatch(/overflow-(x|y)-(auto|scroll)/);
    expect(track.className).toContain('grid');
  });

  it('paints its resting state — no fade-from-zero entrance (pitfall class 5)', () => {
    setup();
    for (const tile of screen.getAllByRole('radio')) {
      expect(tile.className).not.toContain('opacity-0');
      expect(tile.className).not.toContain('animate-fade');
    }
  });

  it('is one radiogroup, labelled', () => {
    setup();
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-label', 'education.modePicker.sheetTitle');
  });
});
