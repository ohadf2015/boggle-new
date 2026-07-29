/**
 * BlastView — progress-save gate.
 * On wave-loss (<90% clear) without watching the rewarded-ad continue, the run
 * MUST NOT persist score/PB/leaderboard. Save fires only when the player either
 * passed the wave (>=90% clear) or accepted the ad-continue offer.
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
    clear: vi.fn(),
  }),
}));

const saveBlastResult = vi.fn().mockResolvedValue(null);
vi.mock('@/components/blast/legacy/utils/saveBlastResult', () => ({
  saveBlastResult: (...args: unknown[]) => saveBlastResult(...args),
}));

const blastGameProps: { current: any } = { current: null };
vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => {
    blastGameProps.current = props;
    return <div data-testid="mock-blast-game" />;
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

vi.mock('@/components/blast/legacy/utils/blastTelemetry', () => ({
  trackBlastRunEnded: vi.fn(),
}));

import { BlastView } from '../BlastView';

const endResults = (overrides: Partial<{
  clearPercentage: number;
  adContinueUsed: boolean;
}>) => ({
  finalScore: 1234,
  wordsFound: ['CAT', 'DOGS'],
  cascadeCount: 0,
  maxCombo: 3,
  totalMoves: 12,
  movesUsed: 12,
  clearPercentage: overrides.clearPercentage ?? 0,
  adContinueUsed: overrides.adContinueUsed ?? false,
  wavesCompleted: 0,
  waveResults: [],
  waveScores: [],
  finalWave: 1,
  difficulty: 'medium' as const,
  language: 'en' as const,
});

describe('BlastView — save gate', () => {
  beforeEach(() => {
    blastGameProps.current = null;
    saveBlastResult.mockClear();
  });

  it('does NOT save when player loses wave without watching ad', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(
        endResults({ clearPercentage: 42, adContinueUsed: false }),
      );
    });
    expect(saveBlastResult).not.toHaveBeenCalled();
  });

  it('saves when wave is passed (>=90% clear) even without ad', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(
        endResults({ clearPercentage: 95, adContinueUsed: false }),
      );
    });
    expect(saveBlastResult).toHaveBeenCalledTimes(1);
  });

  it('saves when ad-continue accepted even on wave-loss', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(
        endResults({ clearPercentage: 30, adContinueUsed: true }),
      );
    });
    expect(saveBlastResult).toHaveBeenCalledTimes(1);
  });

  it('saves at the 90% boundary (passed wave)', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(
        endResults({ clearPercentage: 90, adContinueUsed: false }),
      );
    });
    expect(saveBlastResult).toHaveBeenCalledTimes(1);
  });

  it('does NOT save at 89% with no ad', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(
        endResults({ clearPercentage: 89, adContinueUsed: false }),
      );
    });
    expect(saveBlastResult).not.toHaveBeenCalled();
  });
});
