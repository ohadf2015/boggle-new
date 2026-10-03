/**
 * Teacher HQ: "Start a game" offers the five modes as calm, compact chips.
 *
 * The chips are a choice, not a step: one is always pre-selected (the mode the
 * armed words can carry), so START stays a single tap. The quiz chip is only
 * on offer when the words have definitions to ask about. Each chip pairs its
 * accent colour with a DISTINCT icon — the shape channel, so colour-blind
 * teachers lose nothing (the Kahoot colour+shape bar).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockLessons = vi.fn();
const mockRecent = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown) => (typeof a === 'string' ? a : k),
    language: 'en',
  }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => mockLessons() }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => mockRecent() }));

import { PlayNowLauncher } from '../PlayNowLauncher';

describe('<PlayNowLauncher> — mode cards', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null });
    mockRecent.mockReturnValue({ recentConfigs: [], hasRecentConfig: false });
  });

  it('Given the hero, Then it is titled "Start a game" and offers five modes, each with its own icon', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Start a game' })).toBeInTheDocument();
    const group = screen.getByRole('radiogroup');
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    radios.forEach((r) => {
      expect(group.contains(r)).toBe(true);
      expect(r.querySelector('svg')).not.toBeNull();
    });
    // Five distinct shapes — the icon channel carries the mode identity, so
    // colour is never the only signal. Wordcraft's hammer must not collide
    // with the bomb/target/grid/list shapes already on the bar.
    const icons = radios.map((r) => r.querySelector('[data-mode-icon]')?.getAttribute('data-mode-icon'));
    expect(new Set(icons).size).toBe(5);
    expect(
      screen.getByTestId('hq-mode-wordcraft').querySelector('[data-mode-icon]')?.getAttribute('data-mode-icon'),
    ).toBeTruthy();
  });

  it('Given desktop width, Then chips lay out two per row and each names itself in full — truncation can never hide the verb', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const group = screen.getByRole('radiogroup');
    // Five chips in one row squeezes each to ~150px and the label dies
    // ("VOC…"). Never more than two per row, at any breakpoint.
    expect(group.className).toMatch(/(^|\s)grid-cols-2(\s|$)/);
    expect(group.className).not.toMatch(/grid-cols-[3-9]/);
    for (const id of ['vocab-quiz', 'classic', 'blast', 'word-hunt', 'wordcraft']) {
      const chip = screen.getByTestId(`hq-mode-${id}`);
      const label = chip.getAttribute('aria-label');
      // If the visible label ever truncates again, the full name still
      // reaches the screen reader (aria-label) and the hover tooltip (title).
      expect(label).toBeTruthy();
      expect(chip).toHaveAttribute('title', label);
      expect(chip.textContent).toContain(label as string);
    }
    // The selected check is a corner badge OUT OF FLOW: at 390px an in-flow
    // check squeezed the selected chip's label to "VOCAB Q…".
    const badge = screen.getByTestId('hq-mode-vocab-quiz').querySelector('[data-selected-badge]');
    expect(badge?.className).toContain('absolute');
  });

  it('Given starter packs in the change-words sheet, Then every pack name renders in full — wraps, never truncates silently', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const rows = screen
      .getAllByTestId(/^play-now-pack-/)
      .filter((el) => el.tagName === 'BUTTON');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const full = row.getAttribute('aria-label');
      // Full name always reachable: a11y name + hover tooltip…
      expect(full).toBeTruthy();
      expect(row).toHaveAttribute('title', full as string);
      // …and visible: the title wraps to two lines, never truncates.
      const name = row.querySelector('[data-pickrow-title]');
      expect(name?.className).toContain('line-clamp-2');
      expect(name?.className).not.toMatch(/(^|\s)truncate(\s|$)/);
    }
  });

  it('Given a starter pack with definitions, Then the quiz is pre-selected and one tap launches it', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    expect(screen.getByTestId('hq-mode-vocab-quiz')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ source: 'pack', mode: 'vocab-quiz' }));
  });

  it('When the teacher taps Blast, Then START launches Blast', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    fireEvent.click(screen.getByTestId('hq-mode-blast'));
    expect(screen.getByTestId('hq-mode-blast')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('hq-mode-vocab-quiz')).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ mode: 'blast' }));
  });

  it('Given pasted bare words, Then the quiz card is unavailable and a board mode is armed', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    fireEvent.click(screen.getByTestId('play-now-source-paste'));
    fireEvent.change(screen.getByTestId('play-now-paste-input'), {
      target: { value: 'photosynthesis, mitosis, osmosis' },
    });
    expect(screen.getByTestId('hq-mode-vocab-quiz')).toBeDisabled();
    expect(screen.getByTestId('hq-mode-classic')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ source: 'paste', mode: 'classic' }));
  });

  it('Given the teacher picked the quiz and then pasted bare words, Then it falls back instead of arming a dead quiz', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    fireEvent.click(screen.getByTestId('hq-mode-vocab-quiz'));
    fireEvent.click(screen.getByTestId('play-now-source-paste'));
    fireEvent.change(screen.getByTestId('play-now-paste-input'), { target: { value: 'a, b, c' } });
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ mode: 'classic' }));
  });

  it('Given a recent lesson with no definitions, When the teacher taps Vocab Quiz, Then a quiz-ready starter pack is armed instead of a dead card', () => {
    mockLessons.mockReturnValue({
      lessons: [{ id: 'l1', name: 'Weekly Vocabulary', language: 'en', words: [{ word: 'cat' }, { word: 'dog' }] }],
      isLoading: false,
      error: null,
    });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    const quiz = screen.getByTestId('hq-mode-vocab-quiz');
    // The most-played mode is never greyed out on arrival.
    expect(quiz).not.toBeDisabled();
    expect(quiz).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(quiz);
    expect(quiz).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ source: 'pack', mode: 'vocab-quiz' }));
  });

  it('Given HQ sequencing, Then this hero is step 1 and GO LIVE is its launch control', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByTestId('hq-step-badge-1')).toHaveTextContent('1');
    // The badge is decoration beside the heading, never part of its name.
    expect(screen.getByRole('heading', { name: 'Start a game' })).toBeInTheDocument();
    expect(screen.getByTestId('play-now-go').className).toMatch(/shadow-hard-(lg|xl)/);
  });
});
