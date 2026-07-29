/**
 * BlastView pre-game buff wiring — ready-phase "Claim Boost" button opens
 * BlastPregameBuffModal, picking a buff threads it to BlastGame as initialBuff.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string) => k,
  }),
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

const lastBlastGameProps: { current: any } = { current: null };
vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => {
    lastBlastGameProps.current = props;
    return <div data-testid="mock-blast-game">mock</div>;
  },
}));

vi.mock('@/components/blast/legacy/BlastResultsSummary', () => ({
  BlastResultsSummary: () => <div />,
}));

const offerMock = vi.fn();
let unlockOnUnlock: (() => void) | null = null;
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: (opts: any) => {
    unlockOnUnlock = () => opts.onUnlock();
    return { offer: offerMock, canShowAd: true, status: 'idle', rewardAmount: 0, isPlaceholder: false };
  },
}));

import { BlastView } from '../BlastView';

describe('BlastView pre-game buff wiring', () => {
  it('ready phase shows claim-boost button', () => {
    render(<BlastView />);
    expect(screen.getByTestId('blast-claim-boost-button')).toBeInTheDocument();
  });

  it('clicking claim-boost opens the pregame buff modal', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('blast-claim-boost-button'));
    expect(screen.getByTestId('blast-pregame-buff-modal')).toBeInTheDocument();
  });

  it('skip closes the modal', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('blast-claim-boost-button'));
    fireEvent.click(screen.getByTestId('blast-pregame-buff-skip'));
    expect(screen.queryByTestId('blast-pregame-buff-modal')).not.toBeInTheDocument();
  });

  it('picking a buff + ad unlock threads buff to BlastGame', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByTestId('blast-claim-boost-button'));
    fireEvent.click(screen.getByTestId('blast-pregame-buff-shield'));
    fireEvent.click(screen.getByTestId('blast-pregame-buff-cta'));
    act(() => { unlockOnUnlock?.(); });
    fireEvent.click(screen.getByTestId('play-button'));
    expect(lastBlastGameProps.current?.initialBuff).toBe('shield');
  });
});
