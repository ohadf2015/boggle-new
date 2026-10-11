import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import LeaderboardTabSwitch from '../LeaderboardTabSwitch';

const t = (key: string) => key;

describe('LeaderboardTabSwitch', () => {
  it('shows only Today, Friends and a More button up front', () => {
    render(<LeaderboardTabSwitch t={t} activeTab="today" onTabChange={vi.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /wordHunt.leaderboard.today/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /leaderboard.friends/ })).toBeInTheDocument();
    expect(screen.queryByText('wordHunt.leaderboard.season')).toBeNull();
  });

  it('switches to Friends in one tap', () => {
    const onTabChange = vi.fn();
    render(<LeaderboardTabSwitch t={t} activeTab="today" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /leaderboard.friends/ }));
    expect(onTabChange).toHaveBeenCalledWith('friends');
  });

  it('keeps season, all-time and connections one tap behind More', () => {
    const onTabChange = vi.fn();
    render(<LeaderboardTabSwitch t={t} activeTab="today" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByTestId('leaderboard-more-tabs'));
    fireEvent.click(screen.getByRole('menuitem', { name: /wordHunt.leaderboard.allTime/ }));
    expect(onTabChange).toHaveBeenCalledWith('alltime');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('names the picked secondary board on the More segment', () => {
    render(<LeaderboardTabSwitch t={t} activeTab="season" onTabChange={vi.fn()} />);
    const more = screen.getByTestId('leaderboard-more-tabs');
    expect(more).toHaveAttribute('aria-selected', 'true');
    expect(more.textContent).toContain('wordHunt.leaderboard.season');
  });
});
