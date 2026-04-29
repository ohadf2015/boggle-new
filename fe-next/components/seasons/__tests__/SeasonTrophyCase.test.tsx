/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SeasonTrophyCase } from '../SeasonTrophyCase';
import { getRankBadge } from '@/lib/seasonBadges';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, vars?: Record<string, any>) => {
      if (!vars) return key;
      return key + ':' + JSON.stringify(vars);
    },
  }),
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img alt={props.alt} src={props.src} />,
}));

describe('SeasonTrophyCase', () => {
  it('renders empty state when no badges', () => {
    render(<SeasonTrophyCase badges={[]} />);
    expect(screen.getByText('seasonBadges.section.empty')).toBeInTheDocument();
  });

  it('renders skeleton while loading', () => {
    const { container } = render(<SeasonTrophyCase badges={[]} isLoading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders one card per earned badge', () => {
    const badges = [
      getRankBadge(1, 1)!,
      getRankBadge(2, 3)!,
      getRankBadge(3, 5)!,
    ];
    render(<SeasonTrophyCase badges={badges} />);
    expect(screen.getByTestId('season-badge-1-1')).toBeInTheDocument();
    expect(screen.getByTestId('season-badge-2-3')).toBeInTheDocument();
    expect(screen.getByTestId('season-badge-3-5')).toBeInTheDocument();
  });

  it('shows count chip when badges earned', () => {
    const badges = [getRankBadge(1, 1)!];
    render(<SeasonTrophyCase badges={badges} />);
    expect(
      screen.getByText('seasonBadges.section.count:{"count":1}'),
    ).toBeInTheDocument();
  });
});
