/**
 * BlastView retry-on-loss flow — after a wave loss (clearPct < 90), the
 * player gets a one-shot rewarded-ad offer to restart that wave with
 * cumulative state rewound to its pre-wave snapshot. Decline falls through
 * to the standard results summary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = () => {
    const Comp = ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      void initial; void animate; void exit; void transition;
      return <div {...rest}>{children}</div>;
    };
    return Comp;
  };
  return {
    AdaptiveMotion: new Proxy({}, { get: () => passthrough() }),
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@/components/blast/legacy/hooks/useBlastCheckpoint', () => ({
  useBlastCheckpoint: () => ({
    checkpoint: null,
    resumeFromWave: 1,
    recordWaveReached: vi.fn(),
  }),
}));

vi.mock('@/components/blast/legacy/utils/saveBlastResult', () => ({
  saveBlastResult: vi.fn().mockResolvedValue(null),
}));

const blastGameProps: { current: any } = { current: null };
vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => {
    blastGameProps.current = props;
    return <div data-testid="mock-blast-game" data-wave={props.waveNumber} />;
  },
}));

vi.mock('@/components/blast/legacy/BlastResultsSummary', () => ({
  BlastResultsSummary: () => <div data-testid="mock-blast-results" />,
}));

const useHasRealAdProviderMock = vi.fn(() => true);
vi.mock('@/hooks/useHasRealAdProvider', () => ({
  useHasRealAdProvider: () => useHasRealAdProviderMock(),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

const unlockOnUnlock: { current: (() => void) | null } = { current: null };
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: (opts: any) => {
    if (opts.placement === 'blast_wave_retry') {
      unlockOnUnlock.current = () => opts.onUnlock();
    }
    return { offer: vi.fn(), canShowAd: true, status: 'idle', rewardAmount: 0, isPlaceholder: false };
  },
}));

import { BlastView } from '../BlastView';

const lossResults = (waveNumber: number, clearPct: number) => ({
  finalScore: 250,
  wordsFound: ['CAT', 'DOG'],
  cascadeCount: 0,
  maxCombo: 1,
  totalMoves: 12,
  movesUsed: 12,
  clearPercentage: clearPct,
  wavesCompleted: waveNumber - 1,
  waveResults: [],
  waveScores: [],
  finalWave: waveNumber,
  difficulty: 'medium' as const,
  language: 'en' as const,
});

const startGame = () => {
  fireEvent.click(screen.getByTestId('play-button'));
};

const triggerLoss = (waveNumber: number, clearPct: number) => {
  act(() => {
    blastGameProps.current.onGameEnd(lossResults(waveNumber, clearPct));
  });
};

describe('BlastView — retry-on-loss flow', () => {
  beforeEach(() => {
    blastGameProps.current = null;
    unlockOnUnlock.current = null;
    useHasRealAdProviderMock.mockReturnValue(true);
  });

  const advanceToWave = (target: number) => {
    for (let w = 1; w < target; w++) {
      act(() => { blastGameProps.current.onWaveComplete(100, ['CAT'], 95); });
      fireEvent.click(screen.getByTestId('next-wave-button'));
    }
  };

  it('shows the retry-wave modal after a wave-2+ loss when ad provider is available', () => {
    render(<BlastView />);
    startGame();
    advanceToWave(2);
    triggerLoss(2, 60);
    expect(screen.getByTestId('blast-retry-wave-modal')).toBeDefined();
  });

  it('does NOT show the retry modal on a wave-1 loss (no progress to preserve)', () => {
    render(<BlastView />);
    startGame();
    triggerLoss(1, 60);
    expect(screen.queryByTestId('blast-retry-wave-modal')).toBeNull();
    expect(screen.getByTestId('mock-blast-results')).toBeDefined();
  });

  it('does NOT show the retry modal when no real ad provider', () => {
    useHasRealAdProviderMock.mockReturnValue(false);
    render(<BlastView />);
    startGame();
    advanceToWave(2);
    triggerLoss(2, 60);
    expect(screen.queryByTestId('blast-retry-wave-modal')).toBeNull();
    expect(screen.getByTestId('mock-blast-results')).toBeDefined();
  });

  it('declining the modal falls through to the standard results summary', () => {
    render(<BlastView />);
    startGame();
    advanceToWave(2);
    triggerLoss(2, 50);
    fireEvent.click(screen.getByTestId('blast-retry-wave-decline'));
    expect(screen.queryByTestId('blast-retry-wave-modal')).toBeNull();
    expect(screen.getByTestId('mock-blast-results')).toBeDefined();
  });

  it('accepting (via ad unlock) restarts the failed wave at the same wave number', () => {
    render(<BlastView />);
    startGame();
    // Complete wave 1, advance to wave 2
    act(() => {
      blastGameProps.current.onWaveComplete(100, ['CAT'], 95);
    });
    fireEvent.click(screen.getByTestId('next-wave-button'));
    expect(screen.getByTestId('mock-blast-game').getAttribute('data-wave')).toBe('2');
    // Lose wave 2
    triggerLoss(2, 60);
    act(() => {
      unlockOnUnlock.current?.();
    });
    expect(screen.queryByTestId('blast-retry-wave-modal')).toBeNull();
    expect(screen.getByTestId('mock-blast-game').getAttribute('data-wave')).toBe('2');
  });

  it('is one-shot per run — a second loss after a retry shows the standard summary, no modal', () => {
    render(<BlastView />);
    startGame();
    advanceToWave(2);
    triggerLoss(2, 60);
    act(() => { unlockOnUnlock.current?.(); }); // accept retry
    triggerLoss(2, 55);                         // lose again
    expect(screen.queryByTestId('blast-retry-wave-modal')).toBeNull();
    expect(screen.getByTestId('mock-blast-results')).toBeDefined();
  });
});
