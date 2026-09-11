/**
 * The mode picker strip — the surface that has to beat Blooket's.
 *
 * Blooket (bar/D_helpcenter_host_2.png) shows a wall of logos and nothing else:
 * to learn what a mode does you tap it, read a spec rail, then tap Host. Three
 * actions, and a teacher who has never played it still cannot tell Gold Quest
 * from Crypto Hack from the grid.
 *
 * The contract here is stricter:
 *  - every tile SAYS what a student does and how long a round takes, unopened;
 *  - exactly one tile is flagged as the fit for the words actually loaded;
 *  - one tap on a tile is the whole interaction — no "select, then confirm";
 *  - the strip scrolls inside itself, so a phone lobby never scrolls the page;
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
    recommended: 'classic',
    onPick,
    ...overrides,
  };
  render(<ModePickerStrip {...props} />);
  return { onPick };
}

describe('<ModePickerStrip> — a poster per mode, readable before you tap it', () => {
  it('renders one tile for every mode a teacher may pick', () => {
    setup();
    const tiles = screen.getAllByRole('radio');
    expect(tiles).toHaveLength(TEACHER_GAME_MODES.length);
    for (const mode of TEACHER_GAME_MODES) {
      expect(screen.getByTestId(`mode-tile-${mode.id}`)).toBeInTheDocument();
    }
  });

  it('puts the name, the how-it-plays line and the minute count on the tile itself', () => {
    setup();
    for (const mode of TEACHER_GAME_MODES) {
      const tile = screen.getByTestId(`mode-tile-${mode.id}`);
      expect(within(tile).getByText(mode.nameKey)).toBeInTheDocument();
      expect(within(tile).getByText(mode.howKey)).toBeInTheDocument();
      expect(
        within(tile).getByText(`education.modePicker.minutes|{"count":${mode.minutes}}`)
      ).toBeInTheDocument();
    }
  });

  it('shows the mascot poster on every tile', () => {
    setup();
    for (const mode of TEACHER_GAME_MODES) {
      const tile = screen.getByTestId(`mode-tile-${mode.id}`);
      const img = within(tile).getByRole('presentation', { hidden: true });
      expect(img.getAttribute('src')).toContain(`mode-${mode.id}`);
    }
  });

  it('flags exactly one mode as the fit for these words', () => {
    setup({ recommended: VOCAB_QUIZ_MODE });
    const flags = screen.getAllByTestId('mode-recommended');
    expect(flags).toHaveLength(1);
    const quizTile = screen.getByTestId(`mode-tile-${VOCAB_QUIZ_MODE}`);
    expect(quizTile).toContainElement(flags[0]);
  });

  it('omits the flag entirely when nothing is recommended', () => {
    setup({ recommended: null });
    expect(screen.queryByTestId('mode-recommended')).not.toBeInTheDocument();
  });

  it('marks the live mode checked and the rest unchecked', () => {
    setup({ selected: 'blast' });
    expect(screen.getByTestId('mode-tile-blast')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('mode-tile-classic')).toHaveAttribute('aria-checked', 'false');
  });

  it('launches on the FIRST tap — no select-then-confirm', () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByTestId('mode-tile-wheel-rush'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('wheel-rush');
  });

  it('ignores taps while a room is already being created', () => {
    const { onPick } = setup({ busy: true });
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('scrolls inside its own track so the lobby page never scrolls', () => {
    setup();
    const track = screen.getByTestId('mode-picker-track');
    expect(track.className).toContain('overflow-x-auto');
    expect(track.className).toContain('sm:overflow-visible');
  });

  it('paints its resting state — no fullscreen opacity-from-zero entrance', () => {
    setup();
    for (const tile of screen.getAllByRole('radio')) {
      expect(tile.className).not.toContain('opacity-0');
    }
  });

  it('is one radiogroup, labelled', () => {
    setup();
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-label', 'education.modePicker.title');
  });
});
