/**
 * @vitest-environment jsdom
 *
 * The homework surface itself — RED first.
 *
 * Three things this file pins that the behaviour test cannot see:
 *
 * 1. DEFINITION ROUNDS EXIST. `missGapQuiz` could always build a 4-choice
 *    "what does it mean" round, but nothing ever passed it definitions, so
 *    every real session was spelling-only. Hand it definitions → meaning rounds.
 *
 * 2. EVERY CONTROL KEEPS ITS BORDER. `cn()` runs tailwind-merge, which files the
 *    WIDTH utility `border-neo` in the same class group as the COLOUR utility
 *    `border-neo-black` — so `cn('border-neo', 'border-neo-black')` returns
 *    `border-neo-black` alone and Tailwind preflight (border-width: 0) renders
 *    the control with NO edge. Widths must be written as `border-[Npx]`.
 *
 * 3. THE INTRO STAYS LEAN. One primary action, one field, no word-chip wall.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MissGapGame } from '../MissGapGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn() }));
vi.mock('../missGapSound', () => ({
  useMissGapSound: () => vi.fn(),
  HOMEWORK_SOUNDS: {},
  readSfxSetting: () => ({ muted: false, volume: 1 }),
}));

const WORDS = ['bridge', 'anchor', 'quiver', 'harbour'];
const DEFINITIONS = {
  bridge: 'a way across a river',
  anchor: 'a heavy hook that holds a boat',
  quiver: 'to shake a little',
  harbour: 'a safe place for boats',
};

function renderGame(overrides: Partial<React.ComponentProps<typeof MissGapGame>> = {}) {
  return render(
    <MissGapGame
      classKey="week 3::ms. g"
      lesson="Week 3"
      teacher="Ms. G"
      dueDate="2026-09-30"
      words={WORDS}
      initialStreak={2}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

/** A width utility tailwind-merge cannot swallow. */
const EXPLICIT_BORDER = /border-\[\d+px\]/;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('MissGapGame surface', () => {
  it('opens on a lean intro: one field, one primary action, no word-chip wall', () => {
    renderGame();
    expect(screen.queryByTestId('miss-gap-intro-words')).toBeNull();
    expect(screen.getAllByRole('button', { name: /homework\.start/ })).toHaveLength(1);
  });

  it('gives the start button a border width tailwind-merge cannot drop', () => {
    renderGame();
    const start = screen.getByTestId('miss-gap-start');
    expect(start.className).toMatch(EXPLICIT_BORDER);
    expect(start.className).not.toMatch(/border-neo(?![-\w])/);
  });

  it('asks what a word MEANS when the assignment carried definitions', () => {
    renderGame({ definitions: DEFINITIONS });
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    const prompt = screen.getByTestId('miss-gap-round-prompt');
    expect(prompt.textContent).toContain('promptMeaning');
    const labels = screen.getAllByTestId('miss-gap-choice').map((el) => el.textContent);
    expect(labels).toContain('a way across a river');
    expect(labels).toHaveLength(4);
  });

  it('keeps an explicit border width on every answer tile', () => {
    renderGame({ definitions: DEFINITIONS });
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    for (const tile of screen.getAllByTestId('miss-gap-choice')) {
      expect(tile.className).toMatch(EXPLICIT_BORDER);
      expect(tile.className).not.toMatch(/border-neo(?![-\w])/);
    }
  });

  /**
   * Two taps inside one task must both count. `pickTile` read the letters so
   * far out of RENDER state, so a fast double-tap (or any batched pair) saw an
   * empty prefix on the second letter and scored a correct spelling WRONG.
   */
  it('accepts letters tapped back-to-back without a render in between', () => {
    renderGame();
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    // Round 2 is the first tap-to-spell round in this seed.
    const firstChoice = screen
      .getAllByTestId('miss-gap-choice')
      .find((c) => c.getAttribute('data-correct') === 'true')!;
    fireEvent.click(firstChoice);
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // A spell round with no definition shows the word as the teacher typed it.
    const word = (screen.getByTestId('miss-gap-round-word').textContent || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    expect(word.length).toBeGreaterThan(1);
    const tiles = screen.getAllByTestId('miss-gap-letter-tile');
    // No await between taps: exactly what a fast thumb produces.
    for (const letter of word) {
      const tile = tiles.find(
        (el) => el.textContent === letter && !(el as HTMLButtonElement).disabled,
      );
      fireEvent.click(tile!);
    }
    expect(screen.getByTestId('miss-gap-round-feedback').textContent).toContain(
      'homework.correct',
    );
  });

  it('keeps an explicit border width on every letter tile', () => {
    // No definitions → spelling / tap-to-spell rounds only.
    renderGame();
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    const tiles = [
      ...screen.queryAllByTestId('miss-gap-letter-tile'),
      ...screen.queryAllByTestId('miss-gap-choice'),
    ];
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.className).toMatch(EXPLICIT_BORDER);
    }
  });

  /**
   * Desktop is not a stretched phone. Captured live at 1440x900: the word sat
   * at the top, the four answer tiles sat two-thirds down, and ~280px of empty
   * navy separated them while 450px of screen went unused on each side. The
   * round body becomes two columns from `lg` — prompt and mascot beside the
   * answers — so the dead zone closes without moving anything on a phone.
   */
  it('lays the round out in two columns from lg, not one stretched strip', () => {
    renderGame({ definitions: DEFINITIONS });
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    act(() => {
      vi.advanceTimersByTime(50);
    });
    const body = screen.getByTestId('miss-gap-round-body');
    expect(body.className).toContain('lg:grid');
    expect(body.className).toContain('lg:grid-cols-2');
    // The phone layout is untouched: still one column, still the only scroller.
    expect(body.className).toContain('flex-col');
  });
});
