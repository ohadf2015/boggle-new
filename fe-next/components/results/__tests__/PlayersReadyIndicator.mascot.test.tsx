import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayersReadyIndicator from '../PlayersReadyIndicator';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

// Mock MascotWithEntrance
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant, size }: { variant?: string; size?: string }) => (
    <div data-testid="mascot-celebration" data-variant={variant} data-size={size}>Mascot</div>
  ),
}));

describe('PlayersReadyIndicator celebration mascot', () => {
  const players = [
    { username: 'Player1' },
    { username: 'Player2' },
    { username: 'Player3' },
  ];

  // GIVEN all players are ready
  // WHEN the indicator renders
  // THEN a celebration mascot should appear
  it('should show celebration mascot when all players are ready', () => {
    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1', 'Player2', 'Player3']}
        isHost={true}
      />
    );

    expect(screen.getByTestId('mascot-celebration')).toBeInTheDocument();
  });

  // GIVEN all players are ready
  // WHEN the mascot renders
  // THEN it should use 'celebration' variant and 'xs' size
  it('should use celebration variant with xs size', () => {
    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1', 'Player2', 'Player3']}
        isHost={true}
      />
    );

    const mascot = screen.getByTestId('mascot-celebration');
    expect(mascot).toHaveAttribute('data-variant', 'celebration');
    expect(mascot).toHaveAttribute('data-size', 'xs');
  });

  // GIVEN not all players are ready
  // WHEN the indicator renders
  // THEN no celebration mascot should appear
  it('should not show mascot when not all players are ready', () => {
    render(
      <PlayersReadyIndicator
        players={players}
        readyUsernames={['Player1']}
        isHost={true}
      />
    );

    expect(screen.queryByTestId('mascot-celebration')).not.toBeInTheDocument();
  });
});
