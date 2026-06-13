/**
 * WordForgeGame sound-unmute wiring. Word Forge authors 14 SFX but never told
 * the sound system a game was active, so `playSound` (default
 * requiresGameActive:true) silently dropped EVERY one. This verifies the mode
 * flips game-active on for the whole run — including the result screens, so the
 * RunSummary / RoundComplete victory sounds (which fire AFTER play ends) stay
 * audible — and clears it on exit/unmount so it can't leak into other modes.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const setGameActiveSpy = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), setGameActive: setGameActiveSpy }),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => true, isLoaded: true }),
}));

const runState: { phase: string } = { phase: 'idle' };
vi.mock('@/hooks/useWordForgeRun', () => ({
  useWordForgeRun: () => ({
    state: {
      phase: runState.phase,
      runes: [], round: 1, maxRounds: 5, timeRemaining: 60, timerDuration: 60,
      roundScore: 0, roundTarget: 100, bossConstraint: null, wordsThisRound: [],
      grid: [], maxRuneSlots: 3, runeOffering: null, roundHistory: [],
    },
    progress: { totalRuns: 0, highestRound: 0, totalXp: 0 },
    lastWordScore: null,
    startRun: vi.fn(), submitWord: vi.fn(), pickRune: vi.fn(), skipRune: vi.fn(),
    startRound: vi.fn(), continueToRunePick: vi.fn(), exitToMenu: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => (props: any) => <div {...props} /> }),
  useReducedMotion: () => false,
}));

vi.mock('../RuneBar', () => ({ RuneBar: () => null }));
vi.mock('../RunePicker', () => ({ RunePicker: () => null }));
vi.mock('../BossReveal', () => ({ BossReveal: () => null }));
vi.mock('../RoundComplete', () => ({ RoundComplete: () => null }));
vi.mock('../RunSummary', () => ({ RunSummary: () => null }));
vi.mock('../ScoreFeedback', () => ({ ScoreFeedback: () => null }));
vi.mock('../WordForgeHUD', () => ({ WordForgeHUD: () => null }));
vi.mock('../WordForgeGrid', () => ({ WordForgeGrid: () => null }));
vi.mock('@/components/ui/button', () => ({ Button: (p: any) => <button {...p} /> }));

import WordForgeGame from '../WordForgeGame';

describe('WordForgeGame — sound unmute wiring', () => {
  it('idle phase keeps sound muted (setGameActive(false))', () => {
    runState.phase = 'idle';
    setGameActiveSpy.mockClear();
    render(<WordForgeGame />);
    expect(setGameActiveSpy).toHaveBeenCalledWith(false);
    expect(setGameActiveSpy).not.toHaveBeenCalledWith(true);
  });

  it('playing phase unmutes sound (setGameActive(true))', () => {
    runState.phase = 'playing';
    setGameActiveSpy.mockClear();
    render(<WordForgeGame />);
    expect(setGameActiveSpy).toHaveBeenCalledWith(true);
  });

  it('runOver phase stays active so victory sounds are audible (bookend)', () => {
    runState.phase = 'runOver';
    setGameActiveSpy.mockClear();
    render(<WordForgeGame />);
    expect(setGameActiveSpy).toHaveBeenCalledWith(true);
  });

  it('unmount clears game-active so it cannot leak into other modes', () => {
    runState.phase = 'playing';
    setGameActiveSpy.mockClear();
    const { unmount } = render(<WordForgeGame />);
    unmount();
    expect(setGameActiveSpy).toHaveBeenLastCalledWith(false);
  });
});
