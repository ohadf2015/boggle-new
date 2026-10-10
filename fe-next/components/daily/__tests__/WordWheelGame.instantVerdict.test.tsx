import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playButtonClickSound: vi.fn(),
    playWordLengthSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('../WordWheelPixiRing', () => ({
  __esModule: true,
  default: () => <div data-testid="pixi-ring-stub" />,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: () => 5,
}));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

beforeEach(() => {
  global.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(0), 16) as unknown as number) as typeof requestAnimationFrame;
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});

function deferred() {
  let resolve!: (v: boolean) => void;
  const promise = new Promise<boolean>((r) => { resolve = r; });
  return { promise, resolve };
}

const mountGame = (overrides: Partial<React.ComponentProps<typeof WordWheelGame>> = {}) =>
  render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={vi.fn(() => new Promise<boolean>(() => {}))}
      onEffect={vi.fn()}
      language="en"
      {...overrides}
    />
  );

const letterEl = (l: string) => document.querySelector(`[data-wheel-letter="${l}"]`) as HTMLButtonElement;
const q = (id: string) => document.querySelectorAll(`[data-testid="${id}"]`);
const builder = () => document.querySelector('[data-testid="word-builder"]') as HTMLElement;
const bubble = () => document.querySelector('[data-testid="rank-bubble"]')?.textContent;

async function drag(path: string[]) {
  const orbit = document.querySelector('[data-testid="wheel-orbit"]') as HTMLElement;
  let at = path[0];
  document.elementFromPoint = vi.fn(() => letterEl(at)) as unknown as typeof document.elementFromPoint;
  await act(async () => {
    fireEvent.pointerDown(orbit, { clientX: 1, clientY: 1 });
    for (const l of path.slice(1)) {
      at = l;
      fireEvent.pointerMove(orbit, { clientX: 2, clientY: 2 });
    }
    fireEvent.pointerUp(orbit);
  });
}

describe('WordWheelGame — the verdict lands at release', () => {
  it('a word the loaded dictionary knows scores and joins the list at release', async () => {
    mountGame({ onQuickVerdict: () => true });
    await drag(['C', 'A', 'B']);

    expect(q('found-word')).toHaveLength(1);
    expect(bubble()).toContain('5');
    expect(q('built-letter-tile')).toHaveLength(0);
    expect(builder().dataset.state).toBe('accepted');
  });

  it('paints the score before the particle burst runs, so the reward is never a frame late', async () => {
    const onEffect = vi.fn();
    mountGame({ onQuickVerdict: () => true, onEffect });
    await drag(['C', 'A', 'B']);

    expect(q('found-word')).toHaveLength(1);
    expect(onEffect).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'wordValid' }));
    await waitFor(() => expect(onEffect).toHaveBeenCalledWith(expect.objectContaining({ type: 'wordValid' })));
  });

  it('a word the loaded dictionary lacks is rejected at release, not after the server', async () => {
    mountGame({ onQuickVerdict: () => false });
    await drag(['C', 'A', 'B']);

    expect(builder().dataset.state).toBe('rejected');
    expect(q('built-letter-tile')).toHaveLength(0);
    expect(q('found-word')).toHaveLength(0);
  });

  it('a community word the server later confirms is still credited', async () => {
    const server = deferred();
    mountGame({ onQuickVerdict: () => false, onValidateWord: vi.fn(() => server.promise) });
    await drag(['C', 'A', 'B']);
    expect(q('found-word')).toHaveLength(0);

    await act(async () => { server.resolve(true); });
    expect(q('found-word')).toHaveLength(1);
  });

  it('with a cold dictionary the wheel clears at release and the next swipe is its own word', async () => {
    const first = deferred();
    const onValidateWord = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(() => new Promise<boolean>(() => {}));
    mountGame({ onValidateWord });

    await drag(['C', 'A', 'B']);
    expect(q('built-letter-tile')).toHaveLength(0);
    expect(builder().dataset.state).toBe('checking');
    expect(builder().textContent).toContain('CAB');
    expect(q('word-points-preview')).toHaveLength(0);

    await drag(['D', 'A', 'E']);
    expect(onValidateWord).toHaveBeenLastCalledWith('DAE');

    await act(async () => { first.resolve(true); });
    expect(q('found-word')).toHaveLength(1);
  });
});
