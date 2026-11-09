import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { drag, release, stubBoardLayout } from '@/components/board/__tests__/boardTestUtils';

vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const { initial: _i, animate: _a, exit: _e, transition: _t, variants: _v, whileTap: _wt, layout: _l, ...dom } = props;
    return dom;
  };
  return {
    m: {
      div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <div {...strip(p)}>{children}</div>,
      span: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <span {...strip(p)}>{children}</span>,
      button: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <button {...strip(p)}>{children}</button>,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

const lang = vi.hoisted(() => ({ language: 'en', dir: 'ltr' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    language: lang.language,
    dir: lang.dir,
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));

const track = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));

import { DailyChallengeTutorial } from '../DailyChallengeTutorial';
import { GUESS_GLOW_DELAY_MS } from '../survival/howto/HowtoSteps';

let restoreLayout: () => void;
beforeEach(() => {
  restoreLayout = stubBoardLayout();
  lang.language = 'en';
  lang.dir = 'ltr';
  track.mockClear();
});
afterEach(() => {
  restoreLayout();
  vi.useRealTimers();
});

const setup = (source?: 'daily_first_visit' | 'quick_play') => {
  const onComplete = vi.fn();
  const onSkip = vi.fn();
  const utils = render(<DailyChallengeTutorial onComplete={onComplete} onSkip={onSkip} source={source} />);
  return { onComplete, onSkip, ...utils };
};

const trace = (container: HTMLElement, cells: Array<[number, number]>) => {
  act(() => {
    drag(container, cells, 'touch');
    release(container, 'touch');
  });
};

// en lesson board:  S T O / E A R / N P D. Clue SET, hidden STAR.
const SET: Array<[number, number]> = [[0, 0], [1, 0], [0, 1]];
const STAR: Array<[number, number]> = [[0, 0], [0, 1], [1, 1], [1, 2]];
const next = () => fireEvent.click(screen.getByRole('button', { name: /howto\.next|lesson\.colorsNext/ }));
const hiddenBoxes = () => within(screen.getByTestId('howto-hidden-word')).getAllByTestId('howto-hidden-box').map((b) => b.textContent);
const life = () => Number(screen.getByTestId('howto-life').dataset.life);

describe('Word Hunt first-play lesson', () => {
  it('given a first open, then step 1 shows a real board, the short word to trace and an empty hidden word', () => {
    setup();
    expect(screen.getAllByRole('gridcell')).toHaveLength(9);
    expect(screen.getByText('tutorial.wordHunt.lesson.clueTitle')).toBeInTheDocument();
    expect(screen.getByTestId('howto-trace-word').textContent).toBe('SET');
    expect(hiddenBoxes()).toEqual(['?', '?', '?', '?']);
    expect(screen.queryByRole('button', { name: 'tutorial.wordHunt.howto.next' })).not.toBeInTheDocument();
  });

  it('given step 1, when the short word is traced, then it heals and drops its clue letters into the hidden word', () => {
    const { container } = setup();
    const before = life();
    trace(container, SET);
    expect(screen.getByText('tutorial.wordHunt.lesson.clueDoneTitle')).toBeInTheDocument();
    expect(hiddenBoxes()).toEqual(['S', '?', '?', '?']);
    expect(within(screen.getByTestId('howto-present-letters')).getByText('T')).toBeInTheDocument();
    expect(life()).toBeGreaterThan(before);
    expect(screen.getByRole('button', { name: 'tutorial.wordHunt.howto.next' })).toBeInTheDocument();
  });

  it('given step 1, when a different word is traced, then it stays with a nudge', () => {
    const { container } = setup();
    trace(container, [[1, 0], [1, 1], [1, 2]]);
    expect(screen.getByText('tutorial.wordHunt.lesson.clueTitle')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toContain('tutorial.wordHunt.howto.tryAgain');
  });

  it('given the colours step, then the traced word shows green, gray and yellow with the legend', () => {
    const { container } = setup();
    trace(container, SET);
    next();
    const tiles = within(screen.getByTestId('howto-feedback-word')).getAllByTestId('howto-tile');
    expect(tiles.map((el) => [el.textContent, el.dataset.feedback])).toEqual([
      ['S', 'green'],
      ['E', 'gray'],
      ['T', 'yellow'],
    ]);
    expect(screen.getByText('wordHunt.feedback.wrongPlace')).toBeInTheDocument();
  });

  const toGuess = (container: HTMLElement) => {
    trace(container, SET);
    next();
    next();
  };

  it('given the guess step, then it says a word as long as the hidden word is a guess', () => {
    const { container } = setup();
    toGuess(container);
    expect(screen.getByText('tutorial.wordHunt.lesson.guessTitle')).toBeInTheDocument();
    expect(screen.getByText('tutorial.wordHunt.lesson.guessBody:{"count":4}')).toBeInTheDocument();
  });

  it('given the guess step, when the hidden word is traced, then every box turns green and Next appears', () => {
    const { container } = setup();
    toGuess(container);
    trace(container, STAR);
    expect(screen.getByText('tutorial.wordHunt.lesson.guessWinTitle')).toBeInTheDocument();
    expect(hiddenBoxes()).toEqual(['S', 'T', 'A', 'R']);
    expect(screen.getByTestId('howto-hidden-word').dataset.solved).toBe('true');
    expect(screen.getByRole('button', { name: 'tutorial.wordHunt.howto.next' })).toBeInTheDocument();
  });

  it('given the guess step, when a shorter word is traced, then it explains a guess needs the full length', () => {
    const { container } = setup();
    toGuess(container);
    trace(container, [[0, 2], [0, 1], [1, 1]]);
    expect(screen.getByRole('status').textContent).toContain('tutorial.wordHunt.lesson.guessShort');
  });

  it('given the guess step, when the player hesitates, then the hidden word’s path lights up', () => {
    vi.useFakeTimers();
    const { container } = setup();
    toGuess(container);
    expect(screen.queryByTestId('hunt-trail')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(GUESS_GLOW_DELAY_MS + 10);
    });
    expect(screen.getByTestId('hunt-trail')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toContain('tutorial.wordHunt.lesson.guessGlow');
  });

  it('given the whole lesson, then the rules recap shows and Let’s play completes it once', () => {
    const { container, onComplete } = setup('daily_first_visit');
    toGuess(container);
    trace(container, STAR);
    next();
    expect(screen.getByText('tutorial.wordHunt.lesson.readyTitle')).toBeInTheDocument();
    expect(within(screen.getByTestId('howto-rules')).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('tutorial.wordHunt.lesson.ruleGuess:{"tries":10}')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'tutorial.wordHunt.howto.play' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const events = track.mock.calls.map((c) => c[0]);
    expect(events.filter((e) => e === 'wordhunt_tutorial_shown')).toHaveLength(1);
    expect(events.filter((e) => e === 'wordhunt_tutorial_step')).toHaveLength(3);
    expect(track).toHaveBeenLastCalledWith('wordhunt_tutorial_completed', expect.objectContaining({ source: 'daily_first_visit', step: 'ready' }));
  });

  it.each([0, 1, 2, 3])('given step index %i, when Skip is pressed, then onSkip fires and the step is tracked', (stepsAhead) => {
    const { container, onSkip } = setup('quick_play');
    if (stepsAhead >= 1) {
      trace(container, SET);
      next();
    }
    if (stepsAhead >= 2) next();
    if (stepsAhead >= 3) {
      trace(container, STAR);
      next();
    }
    fireEvent.click(screen.getByRole('button', { name: 'common.skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenLastCalledWith('wordhunt_tutorial_skipped', expect.objectContaining({ source: 'quick_play', step_index: stepsAhead }));
  });

  it('given Hebrew, then the board traces right to left and the hidden word ends in a final letter', () => {
    lang.language = 'he';
    lang.dir = 'rtl';
    const { container } = setup();
    // he board: ר ל ש / מ ו ק / ת ב א. Clue שוק, hidden שלום.
    trace(container, [[0, 2], [1, 1], [1, 2]]);
    expect(screen.getByTestId('howto-hidden-word').getAttribute('dir')).toBe('rtl');
    expect(hiddenBoxes()).toEqual(['ש', '?', '?', '?']);
    next();
    next();
    trace(container, [[0, 2], [0, 1], [1, 1], [1, 0]]);
    expect(hiddenBoxes()).toEqual(['ש', 'ל', 'ו', 'ם']);
  });

  it('renders a dark fullscreen overlay above the ready screen’s portaled play CTA', () => {
    const { container } = setup();
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.className).toContain('z-[120]');
    expect(overlay.className).toContain('bg-neo-navy');
    expect(overlay.getAttribute('role')).toBe('dialog');
  });
});
