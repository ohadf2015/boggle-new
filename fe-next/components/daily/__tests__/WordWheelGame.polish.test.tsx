import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({ trackGameStart: vi.fn(), trackGameEnd: vi.fn(), trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(), playWordAcceptedSound: vi.fn(), playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(), playLegendaryWordSound: vi.fn(), playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(), playButtonClickSound: vi.fn(), playWordLengthSound: vi.fn(),
  }),
}));
vi.mock('@/hooks/useEquippedCosmetic', () => ({ useEquippedCosmetic: () => null }));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => <div /> }));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A', outerLetters: ['T', 'E', 'M', 'S', 'C', 'R'], allLetters: ['A', 'T', 'E', 'M', 'S', 'C', 'R'],
  puzzleDate: '2026-11-05', language: 'en', puzzleNumber: 1,
};
const WORDS = new Set(['TEA', 'TEAMS', 'CAT', 'CART', 'SCAT']);
const quick = (w: string) => WORDS.has(w.toUpperCase());

const tap = (letter: string) => {
  const el = document.querySelector(`[data-wheel-letter="${letter}"]`) as HTMLButtonElement;
  fireEvent.click(el);
};
const spell = (w: string) => w.split('').forEach(tap);
const submit = () => fireEvent.click(screen.getByText('wordWheel.submit'));

function mount(over: Record<string, unknown> = {}) {
  const onComplete = vi.fn();
  const onValidateWord = vi.fn(async (w: string) => WORDS.has(w));
  const utils = render(
    <WordWheelGame
      puzzle={puzzle} duration={60} onComplete={onComplete} onValidateWord={onValidateWord}
      onQuickVerdict={quick} onEffect={vi.fn()} language="en" hideCompetitive {...over}
    />,
  );
  return { ...utils, onComplete, onValidateWord };
}

beforeEach(() => {
  vi.useFakeTimers();
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});
afterEach(() => vi.useRealTimers());

describe('idle auto-submit respects tap spelling', () => {
  it('does not commit TEA one second into spelling TEAMS', () => {
    const { onComplete } = mount();
    spell('TEA');
    act(() => { vi.advanceTimersByTime(1200); });
    spell('MS');
    act(() => { vi.advanceTimersByTime(2600); });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onComplete.mock.calls[0][0].wordsFound).toEqual(['TEAMS']);
  });

  it('never auto-submits a word the dictionary already rejects', () => {
    const { onValidateWord } = mount();
    spell('TEM');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onValidateWord).not.toHaveBeenCalled();
    expect(screen.queryByText('wordWheel.notInDictionary')).toBeNull();
  });
});

describe('buzzer', () => {
  it('a valid word still on the line at time-up counts', () => {
    const { onComplete } = mount();
    act(() => { vi.advanceTimersByTime(58_500); });
    spell('CAT');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onComplete.mock.calls[0][0].wordsFound).toEqual(['CAT']);
  });

  it('a paused clock does not run out', () => {
    const { onComplete } = mount({ paused: true });
    act(() => { vi.advanceTimersByTime(120_000); });
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('bonus days', () => {
  it('chained words climb the multiplier and the result carries a breakdown', () => {
    const { onComplete } = mount({ bonuses: true, goldLetter: null });
    spell('CAT'); submit();
    spell('CART'); submit();
    act(() => { vi.advanceTimersByTime(61_000); });
    const result = onComplete.mock.calls[0][0];
    expect(result.score).toBe(12 + Math.round(30 * 1.25));
    expect(result.breakdown).toMatchObject({ base: 42, combo: Math.round(30 * 1.25) - 30, gold: 0 });
    expect(result.coins).toBe(0);
  });

  it('the gold letter is marked on the wheel and boosts words that use it', () => {
    const { onComplete } = mount({ bonuses: true, goldLetter: 'C' });
    expect(document.querySelector('[data-wheel-gold="true"]')?.getAttribute('data-wheel-letter')).toBe('C');
    spell('CAT'); submit();
    act(() => { vi.advanceTimersByTime(61_000); });
    expect(onComplete.mock.calls[0][0].score).toBe(18);
    expect(onComplete.mock.calls[0][0].coins).toBe(2);
  });

  it('without bonuses scoring is unchanged and nothing is gold', () => {
    const { onComplete } = mount({ goldLetter: 'C' });
    expect(document.querySelector('[data-wheel-gold="true"]')).toBeNull();
    spell('CAT'); submit();
    spell('CART'); submit();
    act(() => { vi.advanceTimersByTime(61_000); });
    expect(onComplete.mock.calls[0][0].score).toBe(42);
    expect(onComplete.mock.calls[0][0].breakdown).toBeUndefined();
  });
});

describe('rejection feedback', () => {
  it('"already found" pulses that word instead of shaking', () => {
    mount();
    spell('CAT'); submit();
    spell('CAT'); submit();
    expect(document.querySelector('[data-pulse="true"]')?.textContent).toContain('CAT');
    expect(screen.getByTestId('word-builder').getAttribute('data-state')).not.toBe('accepted');
  });
});
