/**
 * @vitest-environment jsdom
 *
 * The homework game — RED first.
 *
 * The behaviours that matter: it is a real loop (answer, feedback, next), it
 * records the run SERVER-side when the last round lands, and a failed save says
 * so instead of celebrating (pitfalls Class 4).
 */
import { StrictMode } from 'react';
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
    // (class streak, accuracy) — the host grades the run, not just the finish.
    await waitFor(() =>
      expect(onFinished).toHaveBeenCalledWith(5, expect.any(Number)),
    );
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
   * This used to assert an inline `overflow:hidden` on documentElement too, and
   * that assertion was green while the live page still scrolled 59px behind the
   * overlay at 390x844 — `app/globals.css:2853` declares
   * `html { overflow: visible !important }`, which beats any inline style, so the
   * documentElement write was a no-op the test mistook for a lock.
   *
   * The body lock is real and stays (it is the whole lock when a cold share link
   * renders outside the app layout). What actually removes the 59px is
   * `setIsInGame(true)` — see MissGapGame.scrollLock.test.tsx, which pins that
   * contract and explains why the 59px is height, not overflow.
   */
  it('locks the body while it is open and restores exactly what it found', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = renderGame();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
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

  /**
   * The recorder effect is keyed on `phase` alone, so a remount (React
   * StrictMode, a Fast Refresh, a parent re-key) can re-run it. That matters
   * more than it looks: the endpoint's budget is per-IP and a whole class
   * shares one, so a duplicate post per student halves how many students fit
   * inside a window. One finished attempt, one recorded run.
   */
  it('records a finished run exactly once, even when the effect re-runs', async () => {
    render(
      <StrictMode>
        <MissGapGame
          classKey="week 3::ms. g"
          lesson="Week 3"
          teacher="Ms. G"
          dueDate="2026-09-30"
          words={WORDS}
          initialStreak={2}
          onClose={vi.fn()}
        />
      </StrictMode>,
    );
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    await finishAllRounds();
    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-completion')).toBeInTheDocument();
    });
    const posts = vi
      .mocked(global.fetch)
      .mock.calls.filter(([url]) => String(url).includes('/complete'));
    expect(posts).toHaveLength(1);
  });

  /**
   * Found live 2026-09-12: tap the last answer, tap X before the POST comes
   * back, and the homework page still said "Start — 5 words". The row WAS in
   * the database; only the host was never told, so the turn-in link, the
   * refreshed class streak and the take-home card all stayed hidden and the
   * student had no evidence their homework counted.
   *
   * The cause was one `cancelled` flag guarding two different things. It has to
   * guard this component's own state — that component is gone — but `onFinished`
   * belongs to the PAGE, which is still mounted and still owes the student a
   * receipt. A save that reached the server is reported even if nobody is left
   * on screen to see the confetti (pitfalls Class 4: no silent no-op).
   */
  it('tells the host a run was recorded even if the student closed the game first', async () => {
    let resolvePost: ((value: unknown) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/complete')) {
        return new Promise((resolve) => {
          resolvePost = resolve;
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ players: 3 }) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const onFinished = vi.fn();
    const { unmount } = renderGame({ onFinished });
    fireEvent.click(screen.getByTestId('miss-gap-start'));
    await finishAllRounds();
    await waitFor(() => {
      expect(screen.getByTestId('miss-gap-completion')).toBeInTheDocument();
    });

    // The student taps X while the POST is still in flight.
    unmount();
    await act(async () => {
      resolvePost?.({
        ok: true,
        json: async () => ({ ok: true, streak: { currentStreak: 6 } }),
      });
    });

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(6, expect.any(Number)));
  });
});
