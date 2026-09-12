/**
 * One poster leads; the other four are folded away.
 *
 * Blooket's picker (bar/gameplay/27_host_currenthostingscreen.webp) shows
 * eighteen identically sized logos on one wall — every tile shouts equally, so
 * nothing does, and the teacher ranks them. This panel is the opposite: the
 * live mode is a single large poster carrying its mechanic, its length and its
 * fit for the loaded words on its face, GO LIVE is the one primary action, and
 * the alternatives only exist after the teacher asks for them.
 *
 * Pinned here because all three keep regressing:
 *  1. exactly ONE hero, and it is the mode GO LIVE will actually start
 *     (the round-1 critic caught a hint line computed off the RECOMMENDED mode
 *     while the poster showed the SELECTED one — pitfall class 3, two sources
 *     for one fact);
 *  2. the alternates are hidden until asked for (decision fatigue: one tap to
 *     play for the teacher who agrees with us);
 *  3. nothing in the panel scrolls — the panel is pinned inside a locked shell.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { LobbyModeHero } from '../../lobby/LobbyModeHero';
import { TEACHER_GAME_MODES } from '@/lib/education/gameModes';
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: unknown) =>
      params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key,
    language: 'en',
  }),
}));

type Props = React.ComponentProps<typeof LobbyModeHero>;

function setup(overrides: Partial<Props> = {}) {
  const onPick = vi.fn();
  const onGoLive = vi.fn();
  const onToggleExpanded = vi.fn();
  const props: Props = {
    selected: VOCAB_QUIZ_MODE,
    recommended: VOCAB_QUIZ_MODE,
    blockedKey: null,
    expanded: false,
    onToggleExpanded,
    onPick,
    onGoLive,
    ...overrides,
  };
  render(<LobbyModeHero {...props} />);
  return { onPick, onGoLive, onToggleExpanded };
}

describe('<LobbyModeHero> — one poster, one button', () => {
  it('makes exactly one tile the hero, and it is the mode that will start', () => {
    setup({ selected: 'blast', recommended: null });
    const heroes = screen
      .getAllByTestId(/^mode-tile-/)
      .filter((el) => el.dataset.size === 'hero');
    expect(heroes).toHaveLength(1);
    expect(heroes[0]).toBe(screen.getByTestId('mode-tile-blast'));
  });

  it('puts the mechanic, the minute chip and the fit flag on the hero face', () => {
    setup({ selected: VOCAB_QUIZ_MODE, recommended: VOCAB_QUIZ_MODE });
    const quiz = TEACHER_GAME_MODES.find((m) => m.id === VOCAB_QUIZ_MODE)!;
    const hero = screen.getByTestId(`mode-tile-${VOCAB_QUIZ_MODE}`);
    expect(hero).toHaveTextContent(quiz.nameKey);
    expect(hero).toHaveTextContent(quiz.howKey);
    expect(hero).toHaveTextContent(`education.modePicker.minutes|{"count":${quiz.minutes}}`);
    expect(screen.getByTestId('mode-recommended')).toBeInTheDocument();
  });

  /**
   * The catalog minute is a planning estimate for a mode nobody has configured
   * yet. The moment the teacher sets a round length, the chip has to show THAT
   * — measured live 2026-09-11 the picker promised "5 MIN" and the lobby it
   * launched into said "3 min" two taps later, which is one fact with two
   * sources (pitfall class 3) and exactly the stale line a critic reads as a
   * lie.
   */
  it('shows the round length the teacher actually set, not the catalog guess', () => {
    setup({ selected: 'blast', recommended: null, minutes: 7 });
    const hero = screen.getByTestId('mode-tile-blast');
    expect(hero).toHaveTextContent('education.modePicker.minutes|{"count":7}');
    expect(hero).not.toHaveTextContent('education.modePicker.minutes|{"count":3}');
  });

  it('falls back to the catalog minute when nothing is configured', () => {
    setup({ selected: 'blast', recommended: null });
    const blast = TEACHER_GAME_MODES.find((m) => m.id === 'blast')!;
    expect(screen.getByTestId('mode-tile-blast')).toHaveTextContent(
      `education.modePicker.minutes|{"count":${blast.minutes}}`
    );
  });

  it('names the game on its ONE primary action, so the button never goes stale', () => {
    setup({ selected: 'blast', recommended: null });
    const go = screen.getByTestId('lobby-go-live');
    expect(go).toHaveTextContent('teacher.classroom.gameModes.blast');
    // The hero says the same thing, off the same prop — they cannot disagree.
    expect(screen.getByTestId('mode-tile-blast')).toHaveTextContent(
      'teacher.classroom.gameModes.blast'
    );
  });

  it('hides every alternate until the teacher asks for them', () => {
    setup({ expanded: false });
    expect(screen.queryByTestId('mode-picker-track')).not.toBeInTheDocument();
    for (const mode of TEACHER_GAME_MODES.filter((m) => m.id !== VOCAB_QUIZ_MODE)) {
      expect(screen.queryByTestId(`mode-tile-${mode.id}`)).not.toBeInTheDocument();
    }
  });

  it('shows the four alternates once the fold is open', () => {
    setup({ expanded: true });
    expect(screen.getByTestId('mode-picker-track')).toBeInTheDocument();
    expect(
      screen.getAllByTestId(/^mode-tile-/).filter((el) => el.dataset.size === 'compact')
    ).toHaveLength(TEACHER_GAME_MODES.length - 1);
  });

  it('opens the fold from the poster as well as from the More button', () => {
    const { onToggleExpanded } = setup({ selected: 'blast' });
    fireEvent.click(screen.getByTestId('more-modes-toggle'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    expect(onToggleExpanded).toHaveBeenCalledTimes(2);
  });

  it('launches on one tap of GO LIVE', () => {
    const { onGoLive } = setup();
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    expect(onGoLive).toHaveBeenCalledTimes(1);
  });

  it('disables GO LIVE while something blocks it, and still says so with a border', () => {
    const { onGoLive } = setup({ blockedKey: 'education.modePicker.needsLesson' });
    const go = screen.getByTestId('lobby-go-live');
    expect(go).toBeDisabled();
    fireEvent.click(go);
    expect(onGoLive).not.toHaveBeenCalled();
    // Disabled is dimmed but never borderless — the width is written beside the
    // colour because tailwind-merge collapses `border-neo` into the colour class.
    expect(go.className).toContain('border-[3px]');
  });

  it('pins itself: the panel never scrolls, the shell does the containing', () => {
    setup({ expanded: true });
    const panel = screen.getByTestId('lobby-go-live-panel');
    expect(panel.className).not.toMatch(/overflow-(x|y)-(auto|scroll)/);
    expect(
      panel.querySelectorAll('[class*="overflow-y-auto"],[class*="overflow-x-auto"]')
    ).toHaveLength(0);
  });

  it('paints its resting state — no fade-from-zero entrance (pitfall class 5)', () => {
    setup({ expanded: true });
    for (const el of screen.getAllByTestId(/^mode-tile-/)) {
      expect(el.className).not.toContain('opacity-0');
    }
    expect(screen.getByTestId('lobby-go-live').className).not.toContain('opacity-0');
  });
});
