import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SeasonLeaderboardTabs, type SeasonTabKey } from '../SeasonLeaderboardTabs';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'season.thisSeason': 'This Season',
        'season.allTime': 'All Time',
        'season.pastSeasons': 'Past Seasons',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('SeasonLeaderboardTabs', () => {
  it('renders three tab buttons', () => {
    render(<SeasonLeaderboardTabs active="season" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'This Season' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All Time' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Past Seasons' })).toBeInTheDocument();
  });

  it('marks the active tab via aria-selected', () => {
    render(<SeasonLeaderboardTabs active="allTime" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'All Time' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'This Season' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Past Seasons' })).toHaveAttribute('aria-selected', 'false');
  });

  it('emits onChange when a tab is clicked', () => {
    const onChange = vi.fn<(key: SeasonTabKey) => void>();
    render(<SeasonLeaderboardTabs active="season" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'All Time' }));
    expect(onChange).toHaveBeenCalledWith('allTime');
    fireEvent.click(screen.getByRole('tab', { name: 'Past Seasons' }));
    expect(onChange).toHaveBeenCalledWith('pastSeasons');
  });
});
