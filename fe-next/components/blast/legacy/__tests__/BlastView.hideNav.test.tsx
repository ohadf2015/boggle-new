/**
 * BlastView nav-hide wiring — toggle isInGame=true on entering 'playing'
 * phase, false on unmount/exit. Asserts the bottom-nav contract for the
 * Blast game screen.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

const setIsInGameSpy = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGameSpy,
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

vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: () => <div data-testid="mock-blast-game">mock</div>,
}));

vi.mock('@/components/blast/legacy/BlastResultsSummary', () => ({
  BlastResultsSummary: () => <div />,
}));

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({
    offer: vi.fn(),
    canShowAd: false,
    status: 'idle',
    rewardAmount: 0,
    isPlaceholder: false,
  }),
}));

import { BlastView } from '../BlastView';

describe('BlastView — bottom-nav hide wiring', () => {
  it('ready phase keeps nav visible (setIsInGame called with false)', () => {
    setIsInGameSpy.mockClear();
    render(<BlastView />);
    expect(setIsInGameSpy).toHaveBeenCalledWith(false);
    expect(setIsInGameSpy).not.toHaveBeenCalledWith(true);
  });

  it('clicking play hides nav (setIsInGame(true))', () => {
    setIsInGameSpy.mockClear();
    const { getByTestId } = render(<BlastView />);
    fireEvent.click(getByTestId('play-button'));
    expect(setIsInGameSpy).toHaveBeenCalledWith(true);
  });

  it('unmount restores nav (setIsInGame(false))', () => {
    setIsInGameSpy.mockClear();
    const { unmount } = render(<BlastView />);
    unmount();
    expect(setIsInGameSpy).toHaveBeenLastCalledWith(false);
  });
});
