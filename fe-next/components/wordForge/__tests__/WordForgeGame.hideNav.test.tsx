/**
 * WordForgeGame nav-hide wiring — hide bottom nav only when run phase is
 * 'playing'. Idle/roundResult/pickRune/bossReveal/runOver keep the nav
 * visible (they're between-round screens, not gameplay).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

const setIsInGameSpy = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGameSpy,
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => true, isLoaded: true }),
}));

const runState: { phase: string } = { phase: 'idle' };
vi.mock('@/hooks/useWordForgeRun', () => ({
  useWordForgeRun: () => ({
    state: {
      phase: runState.phase,
      runes: [],
      round: 1,
      maxRounds: 5,
      timeRemaining: 60,
      timerDuration: 60,
      roundScore: 0,
      roundTarget: 100,
      bossConstraint: null,
      wordsThisRound: [],
      grid: [],
      maxRuneSlots: 3,
      runeOffering: null,
      roundHistory: [],
    },
    progress: { totalRuns: 0, highestRound: 0, totalXp: 0 },
    lastWordScore: null,
    startRun: vi.fn(),
    submitWord: vi.fn(),
    endRound: vi.fn(),
    pickRune: vi.fn(),
    skipRune: vi.fn(),
    revealBoss: vi.fn(),
    advanceFromBossReveal: vi.fn(),
    advanceFromRoundResult: vi.fn(),
    resetRun: vi.fn(),
    exitToMenu: vi.fn(),
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

describe('WordForgeGame — bottom-nav hide wiring', () => {
  it('idle phase keeps nav visible (setIsInGame(false))', () => {
    runState.phase = 'idle';
    setIsInGameSpy.mockClear();
    render(<WordForgeGame />);
    expect(setIsInGameSpy).toHaveBeenCalledWith(false);
    expect(setIsInGameSpy).not.toHaveBeenCalledWith(true);
  });

  it('playing phase hides nav (setIsInGame(true))', () => {
    runState.phase = 'playing';
    setIsInGameSpy.mockClear();
    render(<WordForgeGame />);
    expect(setIsInGameSpy).toHaveBeenCalledWith(true);
  });

  it('unmount restores nav (setIsInGame(false))', () => {
    runState.phase = 'playing';
    setIsInGameSpy.mockClear();
    const { unmount } = render(<WordForgeGame />);
    unmount();
    expect(setIsInGameSpy).toHaveBeenLastCalledWith(false);
  });
});
