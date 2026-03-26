import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileCompactRewards from '../MobileCompactRewards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('MobileCompactRewards', () => {
  it('renders win streak when provided', () => {
    render(<MobileCompactRewards winStreak={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('renders coins when provided', () => {
    render(<MobileCompactRewards coins={25} />);

    expect(screen.getByText('+25')).toBeInTheDocument();
  });

  it('renders both streak and coins inline', () => {
    render(<MobileCompactRewards winStreak={5} coins={50} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
  });

  it('returns null when no rewards', () => {
    const { container } = render(<MobileCompactRewards />);

    expect(container.firstChild).toBeNull();
  });
});
