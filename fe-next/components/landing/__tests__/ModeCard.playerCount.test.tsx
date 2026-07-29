import { render, screen } from '@testing-library/react';
import ModeCard from '../ModeCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Users } from 'lucide-react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock hooks
vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

describe('ModeCard playerCount', () => {
  const defaultProps = {
    title: 'Multiplayer',
    description: 'Play with friends',
    href: '/multiplayer',
    icon: <Users data-testid="mode-icon" />,
    variant: 'pink' as const,
  };

  it('should NOT show player count badge when count is 0', () => {
    render(
      <LanguageProvider>
        <ModeCard
          {...defaultProps}
          playerCount={{ count: 0, label: 'playing' }}
        />
      </LanguageProvider>
    );

    expect(screen.queryByText('0 playing')).not.toBeInTheDocument();
  });

  it('should show player count badge when count is greater than 0', () => {
    render(
      <LanguageProvider>
        <ModeCard
          {...defaultProps}
          playerCount={{ count: 5, label: 'playing' }}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('5 playing')).toBeInTheDocument();
  });

  it('should show player count badge when liveBadge thresholds not met', () => {
    render(
      <LanguageProvider>
        <ModeCard
          {...defaultProps}
          liveBadge={{
            openRooms: 3,
            totalPlayers: 4,
            roomsLabel: 'rooms',
            playersLabel: 'live',
          }}
          playerCount={{ count: 4, label: 'playing' }}
        />
      </LanguageProvider>
    );

    // Should show playerCount since liveBadge thresholds (>5) not met
    expect(screen.getByText('4 playing')).toBeInTheDocument();
  });

  it('should NOT show player count badge when liveBadge thresholds are met', () => {
    render(
      <LanguageProvider>
        <ModeCard
          {...defaultProps}
          liveBadge={{
            openRooms: 10,
            totalPlayers: 15,
            roomsLabel: 'rooms',
            playersLabel: 'live',
          }}
          playerCount={{ count: 15, label: 'playing' }}
        />
      </LanguageProvider>
    );

    // Should NOT show playerCount since liveBadge thresholds (>5) are met
    expect(screen.queryByText('15 playing')).not.toBeInTheDocument();
    // liveBadge should be shown instead
    expect(screen.getByText('10 rooms')).toBeInTheDocument();
    expect(screen.getByText('15 live')).toBeInTheDocument();
  });

  it('should show animated pulse dot in player count badge', () => {
    const { container } = render(
      <LanguageProvider>
        <ModeCard
          {...defaultProps}
          playerCount={{ count: 8, label: 'playing' }}
        />
      </LanguageProvider>
    );

    // Check for the animated pulse element
    const pulseElement = container.querySelector('.animate-ping');
    expect(pulseElement).toBeInTheDocument();
  });

  it('should use neo-lime background for player count badge', () => {
    const { container } = render(
      <LanguageProvider>
        <ModeCard
          {...defaultProps}
          playerCount={{ count: 3, label: 'playing' }}
        />
      </LanguageProvider>
    );

    const badge = container.querySelector('.bg-neo-lime');
    expect(badge).toBeInTheDocument();
  });
});
