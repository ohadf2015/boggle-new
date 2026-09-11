/**
 * @vitest-environment jsdom
 *
 * The homework game — RED first.
 *
 * The behaviours that matter: it is a real loop (answer, feedback, next), it
 * records the run SERVER-side when the last round lands, and a failed save says
 * so instead of celebrating (pitfalls Class 4).
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MissGapGame } from '../MissGapGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

const play = vi.fn();
vi.mock('../missGapSound', () => ({
  useMissGapSound: () => play,
  HOMEWORK_SOUNDS: {},
  readSfxSetting: () => ({ muted: false, volume: 1 }),
}));

const WORDS = ['bridge', 'anchor', 'quiver'];

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

/** Tap through every round, always choosing the correct option. */
async function finishAllRounds() {
  for (let i = 0; i < WORDS.length; i += 1) {
    await waitFor(() => {
      const tiles = screen.queryAllByTestId('miss-gap-choice');
      const letters = screen.queryAllByTestId('miss-gap-letter-tile');
      expect(tiles.length + letters.length).toBeGreaterThan(0);
    });
    const choices = screen.queryAllByTestId('miss-gap-choice');
    if (choices.length > 0) {
      const right = choices.find((c) => c.getAttribute('data-correct') === 'true')!;
      fireEvent.click(right);
    } else {
      // Tap-to-spell: click the tiles that spell the word, in order.
      const word = WORDS[i].toUpperCase();
      for (const letter of word) {
        const tile = screen
          .queryAllByTestId('miss-gap-letter-tile')
          .find((el) => el.textContent === letter && !(el as HTMLButtonElement).disabled)!;
        fireEvent.click(tile);
      }
    }
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
  }
}

describe('MissGapGame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    play.mockClear();
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, streak: { currentStreak: 5 }, players: 4 }),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens on an intro screen, not straight into a question', () => {
    renderGame();
    expect(screen.getByTestId('miss-gap-start')).toBeInTheDocument();
    expect(screen.queryAllByTestId('miss-gap-choice')).toHaveLength(0);
  });

  it('given a started game, shows a round with tappable answers and a timer', async () => {
    renderGame();
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-timer-fill')).toBeInTheDocument();
    });
    expect(screen.getByTestId('miss-gap-progress')).toHaveTextContent('1/3');
  });

  it('given a correct tap, reveals feedback and moves to the next round', async () => {
    renderGame();
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    const right = (await screen.findAllByTestId('miss-gap-choice')).find(
      (c) => c.getAttribute('data-correct') === 'true',
    )!;
    fireEvent.click(right);
    expect(screen.getByTestId('miss-gap-round-feedback')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId('miss-gap-progress')).toHaveTextContent('2/3');
  });

  it('given every round answered, posts the run and shows the finish screen', async () => {
    const onFinished = vi.fn();
    renderGame({ onFinished });
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    await finishAllRounds();

    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-completion')).toBeInTheDocument();
    });
    const calls = vi.mocked(global.fetch).mock.calls;
    const post = calls.find(([url]) => String(url).includes('/complete'))!;
    expect(post).toBeTruthy();
    const body = JSON.parse(String((post[1] as RequestInit).body));
    expect(body).toMatchObject({
      classKey: 'week 3::ms. g',
      dueDate: '2026-09-30',
      wordsTotal: 3,
      wordsCorrect: 3,
      accuracy: 100,
      stars: 3,
    });
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(5));
    expect(screen.getByTestId('miss-gap-streak-hero-count')).toHaveTextContent('5');
  });

  it('given the save fails, says so instead of celebrating', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    renderGame();
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    await finishAllRounds();
    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-save-failed')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('miss-gap-streak-hero')).not.toBeInTheDocument();
  });

  /**
   * Locking `body` alone is not enough: the site nav lives outside the page
   * shell, so the DOCUMENT stays taller than the viewport and the whole page
   * still scrolled ~59px behind the fixed overlay while a round was in play.
   */
  it('locks the document AND the body while it is open, and restores both', () => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'scroll';
    const { unmount } = renderGame();
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('remembers the student name across sessions', async () => {
    const { unmount } = renderGame();
    fireEvent.change(screen.getByTestId('miss-gap-name'), { target: { value: 'Maya' } });
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    unmount();
    renderGame();
    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-name')).toHaveValue('Maya');
    });
  });
});
