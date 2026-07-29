/**
 * BlastPregameBuffModal — rewarded-ad pre-game buff picker.
 * 3 buffs (shield/bomb/combo2x). User selects one, watches ad, gets buff
 * before the wave starts. Single use per run (caller enforces).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const offerMock = vi.fn();
type UnlockOpts = {
  placement: string;
  onUnlock: (ctx?: unknown) => void;
  disabled?: boolean;
  context?: Record<string, unknown>;
};
let unlockOpts: UnlockOpts | null = null;
const hookReturn = { canShowAd: true, status: 'idle' as const, rewardAmount: 0, isPlaceholder: false };

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: (opts: UnlockOpts) => {
    unlockOpts = opts;
    return { offer: offerMock, ...hookReturn };
  },
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

import { BlastPregameBuffModal } from '../BlastPregameBuffModal';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  let out = key;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
};

describe('BlastPregameBuffModal', () => {
  beforeEach(() => {
    offerMock.mockClear();
    unlockOpts = null;
    hookReturn.canShowAd = true;
  });

  it('renders when isOpen=true', () => {
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    expect(screen.getByTestId('blast-pregame-buff-modal')).toBeDefined();
  });

  it('does not render when isOpen=false', () => {
    render(<BlastPregameBuffModal isOpen={false} onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    expect(screen.queryByTestId('blast-pregame-buff-modal')).toBeNull();
  });

  it('renders all three buff options', () => {
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    expect(screen.getByTestId('blast-pregame-buff-shield')).toBeDefined();
    expect(screen.getByTestId('blast-pregame-buff-bomb')).toBeDefined();
    expect(screen.getByTestId('blast-pregame-buff-combo2x')).toBeDefined();
  });

  it('uses placement blast_pregame_buff', () => {
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    expect(unlockOpts?.placement).toBe('blast_pregame_buff');
  });

  it('CTA disabled until a buff is selected', () => {
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    const cta = screen.getByTestId('blast-pregame-buff-cta') as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
  });

  it('enables CTA after picking a buff', () => {
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    fireEvent.click(screen.getByTestId('blast-pregame-buff-shield'));
    const cta = screen.getByTestId('blast-pregame-buff-cta') as HTMLButtonElement;
    expect(cta.disabled).toBe(false);
  });

  it('clicking CTA calls offer()', () => {
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    fireEvent.click(screen.getByTestId('blast-pregame-buff-bomb'));
    fireEvent.click(screen.getByTestId('blast-pregame-buff-cta'));
    expect(offerMock).toHaveBeenCalledTimes(1);
  });

  it('onUnlock callback delivers selected buff via onPick', () => {
    const onPick = vi.fn();
    render(<BlastPregameBuffModal isOpen onPick={onPick} onSkip={vi.fn()} t={t} />);
    fireEvent.click(screen.getByTestId('blast-pregame-buff-combo2x'));
    unlockOpts?.onUnlock();
    expect(onPick).toHaveBeenCalledWith('combo2x');
  });

  it('skip button fires onSkip', () => {
    const onSkip = vi.fn();
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={onSkip} t={t} />);
    fireEvent.click(screen.getByTestId('blast-pregame-buff-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('hides CTA when ad unavailable, still shows skip', () => {
    hookReturn.canShowAd = false;
    render(<BlastPregameBuffModal isOpen onPick={vi.fn()} onSkip={vi.fn()} t={t} />);
    expect(screen.queryByTestId('blast-pregame-buff-cta')).toBeNull();
    expect(screen.getByTestId('blast-pregame-buff-skip')).toBeDefined();
  });
});
