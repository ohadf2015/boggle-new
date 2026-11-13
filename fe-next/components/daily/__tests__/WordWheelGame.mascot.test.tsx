/** Daily Word Wheel drives the shared game mascot. */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reduced motion turns off the random comedy gags, so the reaction bubble is deterministic.
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
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
    playSound: vi.fn(),
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
import { _resetMascotBus, subscribeMascotEvents } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

let events: MascotEvent[] = [];
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  localStorage.clear();
  _resetMascotBus();
  events = [];
});

const mountGame = (
  overrides: Partial<React.ComponentProps<typeof WordWheelGame>> = {}
) => {
  const onValidateWord = vi.fn().mockResolvedValue(true);
  const utils = render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={onValidateWord}
      onEffect={vi.fn()}
      language="en"
      {...overrides}
    />
  );
  return { ...utils, onValidateWord };
};

const tap = (selector: string) => {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  fireEvent.click(el);
};

const submit = async (word: string) => {
  for (const ch of word) tap(`[data-wheel-letter="${ch}"]`);
  await act(async () => {
    fireEvent.click(screen.getByTestId('inline-submit-chip'));
  });
};


describe('WordWheelGame — mascot', () => {
  it('tells the mascot about each found word and each repeat', async () => {
    mountGame();
    subscribeMascotEvents((e) => events.push(e));

    await submit('CAB');
    await submit('CAB');

    expect(events.filter((e) => e.kind === 'word-submitted')[0]).toMatchObject({ wordLength: 3, word: 'CAB' });
    expect(events.map((e) => e.kind)).toContain('duplicate-word');
  });

  it('cheers when a word lands, from the idle pose it holds all game', async () => {
    mountGame();
    expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-state')).toBe('idle');
    await submit('FACED');
    expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-state')).toBe('cheer');
  });
});
