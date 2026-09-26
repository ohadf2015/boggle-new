/**
 * Perf rule 4 for the MP word hunt: a leaderboard/score update (and any
 * parent re-render) must cause ZERO board (GridComponent) re-renders. The
 * real `useMPFTUEIdle` returns a fresh object each render — the mock does too,
 * so a callback keyed on that object would be caught here.
 */
import React from 'react';
import { render, act } from '@testing-library/react';

const { gridRenders } = vi.hoisted(() => ({ gridRenders: { count: 0 } }));
vi.mock('@/components/GridComponent', async () => {
  const R = await import('react');
  return {
    default: R.memo(() => {
      gridRenders.count += 1;
      return R.createElement('div', { 'data-testid': 'grid' });
    }),
  };
});

const bridge = {
  lifePoints: 90,
  targetFound: false,
  targetLength: 5,
  targetCategory: 'animals',
  playerLives: { me: 90 },
  eliminatedPlayers: [] as string[],
  attempts: [],
  accumulatedClues: new Map(),
  knownLetters: new Set<string>(),
  currentHint: { hint: '_ _ _ _ _', level: 0, unlockCost: 0 },
  showFeedbackOverlay: false,
  latestAttemptFeedback: null,
  isGameOver: false,
  wrongGuessShake: false,
  isClueGaining: false,
  targetFoundBy: null as string | null,
};
vi.mock('../hooks/useWordHuntMultiplayerBridge', () => ({ useWordHuntMultiplayerBridge: () => bridge }));
const t = (k: string) => k;
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'en', dir: 'ltr' }) }));
const EMPTY: never[] = [];
const keyboard = { typedWord: '', isValidOnGrid: false, highlightedCells: EMPTY, clearTypedWord: () => {}, submitTypedWord: () => {}, isTypingMode: false };
vi.mock('@/hooks/useKeyboardWordInput', () => ({ useKeyboardWordInput: () => keyboard }));
vi.mock('@/hooks/useMPFTUEIdle', () => {
  const markActivity = () => {};
  const dismiss = () => {};
  return { useMPFTUEIdle: () => ({ visible: false, markActivity, dismiss }) };
});
vi.mock('@/hooks/useWordHuntDangerAlerts', () => ({ useWordHuntDangerAlerts: () => ({ toasts: [], dismissToast: () => {} }) }));
vi.mock('../WordHuntGameOverOverlay', () => ({ WordHuntGameOverOverlay: () => null }));
vi.mock('../WordHuntFirstTimeNudges', () => ({ WordHuntFirstTimeNudges: () => null }));
vi.mock('../WordHuntQuickRules', () => ({ WordHuntQuickRules: () => null }));

import { WordHuntGame } from '../WordHuntGame';

const grid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];
const onQuit = () => {};
const onWordSubmit = () => {};
const onGuess = () => {};
const foundWords: never[] = [];

function props(over: Record<string, unknown> = {}) {
  return {
    grid,
    gameLanguage: 'en' as const,
    leaderboard: [{ username: 'me', score: 0 }, { username: 'bot', score: 0 }],
    username: 'me',
    score: 0,
    onQuit,
    onWordSubmit,
    onWordHuntGuess: onGuess,
    gameActive: true,
    minWordLength: 3,
    socket: null,
    foundWords,
    mpChrome: true,
    ...over,
  } as React.ComponentProps<typeof WordHuntGame>;
}

describe('WordHuntGame (mpChrome) board isolation', () => {
  beforeEach(() => { gridRenders.count = 0; });

  it('a leaderboard / score update does not re-render the board', () => {
    const { rerender } = render(<WordHuntGame {...props()} />);
    act(() => {});
    const settled = gridRenders.count;
    rerender(<WordHuntGame {...props({ leaderboard: [{ username: 'bot', score: 12 }, { username: 'me', score: 0 }] })} />);
    rerender(<WordHuntGame {...props({ leaderboard: [{ username: 'bot', score: 20 }, { username: 'me', score: 9 }], score: 9 })} />);
    expect(gridRenders.count).toBe(settled);
  });
});
