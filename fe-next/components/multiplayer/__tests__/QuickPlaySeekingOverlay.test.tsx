import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuickPlaySeekingOverlay } from '../QuickPlaySeekingOverlay';

vi.mock('@/components/ui/SilentVideo', () => ({
  SilentVideo: ({ className }: { className?: string }) => (
    <div data-testid="mascot-video" className={className} />
  ),
}));

const t = (key: string): string => {
  const keys: Record<string, string> = {
    'quickPlay.seekingMatch': 'Finding a match…',
    'quickPlay.seekingMatchSub': 'Setting up your game',
  };
  return keys[key] ?? key;
};

describe('QuickPlaySeekingOverlay', () => {
  it('renders seeking headline', () => {
    render(<QuickPlaySeekingOverlay t={t} />);
    expect(screen.getByText('Finding a match…')).toBeInTheDocument();
  });

  it('renders sub-text', () => {
    render(<QuickPlaySeekingOverlay t={t} />);
    expect(screen.getByText('Setting up your game')).toBeInTheDocument();
  });

  it('has accessible status role', () => {
    render(<QuickPlaySeekingOverlay t={t} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows mascot', () => {
    render(<QuickPlaySeekingOverlay t={t} />);
    expect(screen.getByTestId('mascot-video')).toBeInTheDocument();
  });
});
