/**
 * BlastView — canonical run-end telemetry.
 * Production BlastView must fire trackBlastRunEnded on game-end so the
 * canonical `game_completed` cross-mode funnel event reaches PostHog.
 * Was missing → PostHog showed 34 game_started → 2 game_completed (~6%)
 * while server `blast_completed` reported the truth (~65%).
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

vi.mock('@/components/blast/legacy/utils/saveBlastResult', () => ({
  saveBlastResult: vi.fn().mockResolvedValue(null),
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

const trackBlastRunEnded = vi.fn();
vi.mock('@/components/blast/legacy/utils/blastTelemetry', () => ({
  trackBlastRunEnded: (...args: unknown[]) => trackBlastRunEnded(...args),
}));

import { BlastView } from '../BlastView';

const endResults = (clearPct: number) => ({
  finalScore: 1234,
  wordsFound: ['CAT', 'DOGS'],
  cascadeCount: 0,
  maxCombo: 3,
  totalMoves: 12,
  movesUsed: 12,
  clearPercentage: clearPct,
  wavesCompleted: 0,
  waveResults: [],
  waveScores: [],
  finalWave: 1,
  difficulty: 'medium' as const,
  language: 'en' as const,
});

describe('BlastView — canonical run-end telemetry', () => {
  beforeEach(() => {
    blastGameProps.current = null;
    trackBlastRunEnded.mockClear();
  });

  it('fires trackBlastRunEnded once when game ends (loss path)', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(endResults(40));
    });
    expect(trackBlastRunEnded).toHaveBeenCalledTimes(1);
    const call = trackBlastRunEnded.mock.calls[0][0];
    expect(call).toMatchObject({
      finalScore: expect.any(Number),
      difficulty: 'medium',
    });
  });

  it('passes wordCount and clearPct when game ends', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
    act(() => {
      blastGameProps.current.onGameEnd(endResults(72));
    });
    const call = trackBlastRunEnded.mock.calls[0][0];
    expect(call.wordCount).toBe(2);
    expect(call.clearPct).toBe(72);
  });
});
