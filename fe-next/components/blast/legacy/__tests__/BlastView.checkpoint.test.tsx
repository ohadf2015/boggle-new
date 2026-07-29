/**
 * BlastView — checkpoint persistence semantics.
 * Resume must reflect the highest wave the player has *cleared*, not
 * merely attempted. Failing a wave (with or without the retry ad) must
 * NOT advance the checkpoint — only successful wave completions do.
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
vi.mock('@/components/blast/legacy/hooks/useBlastCheckpoint', () => ({
  useBlastCheckpoint: () => ({
    checkpoint: null,
    resumeFromWave: 1,
    recordWaveReached,
    clear: vi.fn(),
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

describe('BlastView — checkpoint reflects cleared waves only', () => {
  beforeEach(() => {
    blastGameProps.current = null;
    recordWaveReached.mockClear();
  });

  it('does NOT persist progress when player fails wave 1 without watching ad', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(lossResults(1, 40));
    });
    expect(recordWaveReached).not.toHaveBeenCalled();
  });

  it('persists wave 2 (last cleared) when player fails wave 3 without ad retry', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => { blastGameProps.current.onWaveComplete(100, ['CAT'], 95); });
    fireEvent.click(screen.getByTestId('next-wave-button'));
    act(() => { blastGameProps.current.onWaveComplete(100, ['DOG'], 95); });
    fireEvent.click(screen.getByTestId('next-wave-button'));
    expect(screen.getByTestId('mock-blast-game').getAttribute('data-wave')).toBe('3');

    // Calls so far: clear-1 + clear-2 — wave 2 is the highest cleared.
    expect(recordWaveReached).toHaveBeenLastCalledWith(2);

    recordWaveReached.mockClear();
    act(() => {
      blastGameProps.current.onGameEnd(lossResults(3, 40));
    });
    expect(recordWaveReached).not.toHaveBeenCalled();
  });
});
