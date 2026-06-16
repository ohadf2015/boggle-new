/**
 * Tests for SoloRewardCard — the reusable solo daily reward UI.
 * Pure presentational: takes resolved values + a `t` fn, so no provider needed.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { SoloRewardCard } from './SoloRewardCard';
import type { SoloModifier } from '@/lib/solo/soloDaily';

const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    key,
  );
};

const modifier: SoloModifier = {
  id: 'no-clash-penalty',
  labelKey: 'solo.modifier.sealedBid.noClashPenalty.label',
  descKey: 'solo.modifier.sealedBid.noClashPenalty.desc',
};

describe('SoloRewardCard', () => {
  it('shows the coins awarded on a fresh daily completion', () => {
    render(
      <SoloRewardCard
        t={t}
        awarded={125}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText(/125/)).toBeInTheDocument();
  });

  it('surfaces the surprise bonus when bonus > 0', () => {
    render(
      <SoloRewardCard
        t={t}
        awarded={150}
        bonus={25}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByTestId('solo-reward-bonus')).toBeInTheDocument();
    expect(screen.getByTestId('solo-reward-bonus')).toHaveTextContent(/25/);
  });

  it('hides the bonus line when bonus is 0', () => {
    render(
      <SoloRewardCard
        t={t}
        awarded={40}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.queryByTestId('solo-reward-bonus')).not.toBeInTheDocument();
  });

  it('does NOT show a +0 coins block on a zero-reward game (awarded 0, not claimed)', () => {
    render(
      <SoloRewardCard
        t={t}
        awarded={0}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.queryByTestId('solo-reward-coins')).not.toBeInTheDocument();
    expect(screen.getByText('solo.reward.noCoins')).toBeInTheDocument();
  });

  it('frames the modifier as "today\'s twist" (preview), not an active rule', () => {
    render(
      <SoloRewardCard
        t={t}
        awarded={50}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText('solo.modifier.todaysTwist')).toBeInTheDocument();
  });

  it('shows a come-back-tomorrow message on a practice replay (claimed)', () => {
    render(
      <SoloRewardCard
        t={t}
        awarded={0}
        bonus={0}
        modifier={modifier}
        claimed={true}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText('solo.reward.comeBackTomorrow')).toBeInTheDocument();
    // no coin grant shown when already claimed
    expect(screen.queryByTestId('solo-reward-coins')).not.toBeInTheDocument();
  });

  it('always shows the daily modifier badge', () => {
    render(
      <SoloRewardCard
        t={t}
        awarded={50}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.getByText(modifier.labelKey)).toBeInTheDocument();
  });

  it('fires onPlayAgain when the play-again button is clicked', () => {
    const onPlayAgain = vi.fn();
    render(
      <SoloRewardCard
        t={t}
        awarded={50}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={onPlayAgain}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /solo\.reward\.playAgain/ }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('renders a share button only when onShare is provided', () => {
    const { rerender } = render(
      <SoloRewardCard
        t={t}
        awarded={50}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /solo\.reward\.share/ })).not.toBeInTheDocument();
    rerender(
      <SoloRewardCard
        t={t}
        awarded={50}
        bonus={0}
        modifier={modifier}
        claimed={false}
        onPlayAgain={() => {}}
        onShare={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /solo\.reward\.share/ })).toBeInTheDocument();
  });
});
