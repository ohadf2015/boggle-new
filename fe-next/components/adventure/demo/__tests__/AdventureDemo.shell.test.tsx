import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import React from 'react';

const submit = vi.fn(async () => ({ ok: true }));
const demoState = {
  phase: 'playing' as const,
  grid: [
    ['c', 'a', 't', 'x'],
    ['q', 'z', 'q', 'z'],
    ['x', 'q', 'z', 'q'],
    ['z', 'x', 'q', 'z'],
  ],
  lvl: { seconds: 60, stars: [10, 20, 30], kind: 'normal' },
  words: ['tax', 'cat'],
  score: 14,
  msLeft: 42_000,
  result: null,
  combat: null,
  combatFx: [],
  start: vi.fn(),
  submit,
};

vi.mock('../useAdventureDemo', () => ({ useAdventureDemo: () => demoState }));
vi.mock('@/components/adventure/play/useWordChecker', () => ({ useWordChecker: () => async () => true }));
vi.mock('@/components/adventure/play/fx/FoeTarget', () => ({ default: () => <div data-testid="foe-target" /> }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import { AdventureDemo } from '../AdventureDemo';

describe('AdventureDemo on the shared desktop shell', () => {
  beforeEach(() => submit.mockClear());

  it('given a fight in play, when rendered, then the board sits in the adventure shell stage between two rails', () => {
    render(<AdventureDemo onExit={() => {}} />);
    const shell = screen.getByTestId('game-shell');
    expect(shell.getAttribute('data-game-shell')).toBe('adventure');
    expect(within(screen.getByTestId('game-shell-stage')).getByTestId('adventure-board')).toBeInTheDocument();
  });

  it('given found words, when rendered, then the end rail lists them newest first', () => {
    render(<AdventureDemo onExit={() => {}} />);
    const feed = within(screen.getByTestId('game-shell-right'));
    const words = feed.getAllByText(/^(tax|cat)$/i).map((n) => n.textContent?.toLowerCase());
    expect(words[0]).toBe('cat');
    expect(words).toContain('tax');
  });

  it('given a fight in play, when rendered, then the start rail carries the clock, the round stats and the keyboard card', () => {
    render(<AdventureDemo onExit={() => {}} />);
    const rail = within(screen.getByTestId('game-shell-left'));
    expect(rail.getByTestId('shell-clock')).toBeInTheDocument();
    expect(rail.getByText('14')).toBeInTheDocument();
    expect(rail.getByTestId('shell-keys')).toBeInTheDocument();
  });

  it('given the keyboard, when a word is typed and Enter pressed, then the fight receives the word', async () => {
    render(<AdventureDemo onExit={() => {}} />);
    for (const key of ['c', 'a', 't', 'Enter']) {
      await act(async () => {
        fireEvent.keyDown(window, { key });
      });
    }
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0].toLowerCase()).toBe('cat');
  });
});
