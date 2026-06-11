/**
 * LobbyRewardCluster — the MP-lobby reward group that replaced the boost:
 * an auth-agnostic coins button (repeatable) + an authed-only avatar-part
 * button (premium, 1/day). Each child self-hides when it has nothing to offer,
 * so the cluster collapses cleanly to whatever remains (or nothing).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let coinsProps: { goldAmount: number; surface: string } | null = null;
vi.mock('@/components/ads/RewardedAdGoldButton', () => ({
  RewardedAdGoldButton: (p: { goldAmount: number; surface: string }) => {
    coinsProps = p;
    return <div data-testid="coins-btn" />;
  },
}));
vi.mock('@/components/avatar/LobbyAvatarRewardButton', () => ({
  LobbyAvatarRewardButton: () => <div data-testid="avatar-btn" />,
}));

import { LobbyRewardCluster } from '../LobbyRewardCluster';

describe('LobbyRewardCluster', () => {
  it('renders both the coins and avatar-part rewards', () => {
    render(<LobbyRewardCluster surface="host_waiting" />);
    expect(screen.getByTestId('coins-btn')).toBeDefined();
    expect(screen.getByTestId('avatar-btn')).toBeDefined();
  });

  it('passes the analytics surface and default gold amount to the coins button', () => {
    coinsProps = null;
    render(<LobbyRewardCluster surface="player_waiting" />);
    expect(coinsProps?.surface).toBe('player_waiting');
    expect(coinsProps?.goldAmount).toBe(20);
  });

  it('honours a custom gold amount and className', () => {
    coinsProps = null;
    render(<LobbyRewardCluster surface="host_waiting" goldAmount={50} className="mt-4" />);
    expect(coinsProps?.goldAmount).toBe(50);
    const cluster = screen.getByTestId('lobby-reward-cluster');
    expect(cluster.className).toContain('mt-4');
    // collapses to nothing when both children render null (CSS :empty)
    expect(cluster.className).toContain('empty:hidden');
  });
});
