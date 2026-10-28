/**
 * BlastView — progress-save gate, driven the way single-player really runs: every
 * cleared wave goes through onWaveComplete, and the run ends with onGameEnd on the
 * wave that failed. A run saves when it earned something (a cleared wave) or the
 * player took the ad continue; a wave-1 loss with no ad saves nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/components/blast/progress/useBlastLadder', () => ({
  useBlastLadder: () => ({ personalBest: null, rank: null, rivals: [] }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
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

const addCoins = vi.fn();
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ addCoins, coins: 0 }),
}));

vi.mock('@/components/blast/legacy/BlastResultsSummary', () => ({
  BlastResultsSummary: () => <div data-testid="mock-blast-results" />,
}));

vi.mock('@/components/blast/progress/BlastWaveClear', () => ({
  BlastWaveClear: ({ onContinue }: any) => (
    <button data-testid="mock-wave-continue" onClick={onContinue} />
  ),
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
import { overlayQuietZoneReason } from '@/lib/overlayQuietZone';

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
  sessionCoins: 10,
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
    addCoins.mockClear();
  });

  function startRun() {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('play-button'));
  }

  function clearWave() {
    act(() => {
      blastGameProps.current.onWaveComplete(300, ['CAT', 'DOG'], 100, { diamonds: 1, bombs: 0 });
    });
    fireEvent.click(screen.getByTestId('mock-wave-continue'));
  }

  function failWave(over: Partial<{ clearPercentage: number; adContinueUsed: boolean }> = {}) {
    act(() => {
      blastGameProps.current.onGameEnd(endResults({ clearPercentage: 42, ...over }));
    });
  }

  it('saves once and banks coins once when a run with cleared waves dies on a later wave', () => {
    startRun();
    clearWave();
    clearWave();
    failWave();
    expect(saveBlastResult).toHaveBeenCalledTimes(1);
    expect(saveBlastResult.mock.calls[0][0]).toMatchObject({ wavesCompleted: 2, finalScore: 600 + 1234 });
    expect(addCoins).toHaveBeenCalledTimes(1);
  });

  it('does NOT save or bank when wave 1 is lost without the ad', () => {
    startRun();
    failWave();
    expect(saveBlastResult).not.toHaveBeenCalled();
    expect(addCoins).not.toHaveBeenCalled();
  });

  it('remembers the run score on the device for a guest best, even when nothing saves', () => {
    window.localStorage.clear();
    startRun();
    failWave();
    expect(window.localStorage.getItem('blast:best:v1:medium')).toBe('1234');
  });

  it('saves when the ad continue was taken even on a wave-1 loss', () => {
    startRun();
    failWave({ clearPercentage: 30, adContinueUsed: true });
    expect(saveBlastResult).toHaveBeenCalledTimes(1);
    expect(addCoins).toHaveBeenCalledTimes(1);
  });

  it('keeps install prompts off the results and wave-clear screens, not off play', () => {
    startRun();
    expect(overlayQuietZoneReason() ?? '').not.toContain('blast-results');
    act(() => {
      blastGameProps.current.onWaveComplete(300, ['CAT'], 100, { diamonds: 0, bombs: 0 });
    });
    expect(overlayQuietZoneReason()).toContain('blast-results');
    fireEvent.click(screen.getByTestId('mock-wave-continue'));
    expect(overlayQuietZoneReason() ?? '').not.toContain('blast-results');
    failWave();
    expect(overlayQuietZoneReason()).toContain('blast-results');
  });
});
