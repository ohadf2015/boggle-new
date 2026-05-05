/**
 * BlastView — checkpoint persistence on fail.
 * When a player fails a wave (with or without watching the retry ad), the
 * wave they reached must be persisted so a return visit offers Resume from
 * that wave instead of forcing them back to wave 1.
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

const recordWaveReached = vi.fn();
vi.mock('@/components/blast/hooks/useBlastCheckpoint', () => ({
  useBlastCheckpoint: () => ({
    checkpoint: null,
    resumeFromWave: 1,
    recordWaveReached,
    clear: vi.fn(),
  }),
}));

vi.mock('@/components/blast/utils/saveBlastResult', () => ({
  saveBlastResult: vi.fn().mockResolvedValue(null),
}));

const blastGameProps: { current: any } = { current: null };
vi.mock('@/components/blast/BlastGame', () => ({
  BlastGame: (props: any) => {
    blastGameProps.current = props;
    return <div data-testid="mock-blast-game" data-wave={props.waveNumber} />;
  },
}));

vi.mock('@/components/blast/BlastResultsSummary', () => ({
  BlastResultsSummary: () => <div data-testid="mock-blast-results" />,
}));

vi.mock('@/hooks/useHasRealAdProvider', () => ({
  useHasRealAdProvider: () => false,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({
    offer: vi.fn(),
    canShowAd: false,
    status: 'idle' as const,
    rewardAmount: 0,
    isPlaceholder: true,
  }),
}));

import { BlastView } from '../BlastView';

const lossResults = (waveNumber: number, clearPct: number) => ({
  finalScore: 250,
  wordsFound: [],
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

describe('BlastView — checkpoint persistence on fail', () => {
  beforeEach(() => {
    blastGameProps.current = null;
    recordWaveReached.mockClear();
  });

  it('persists wave 1 when player fails wave 1 without watching ad', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(lossResults(1, 40));
    });
    expect(recordWaveReached).toHaveBeenCalledWith(1);
  });

  it('persists the failed wave (not wave-1) when player fails wave 3', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => { blastGameProps.current.onWaveComplete(100, ['CAT'], 95); });
    fireEvent.click(screen.getByTestId('next-wave-button'));
    act(() => { blastGameProps.current.onWaveComplete(100, ['DOG'], 95); });
    fireEvent.click(screen.getByTestId('next-wave-button'));
    expect(screen.getByTestId('mock-blast-game').getAttribute('data-wave')).toBe('3');

    recordWaveReached.mockClear();
    act(() => {
      blastGameProps.current.onGameEnd(lossResults(3, 40));
    });
    expect(recordWaveReached).toHaveBeenCalledWith(3);
  });
});
