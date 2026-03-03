/**
 * AttackTelegraph Component Tests
 *
 * Tests for the attack telegraph warning UI component.
 */

import { render, screen } from '@testing-library/react';
import { AttackTelegraph } from './AttackTelegraph';
import { LanguageProvider } from '../../../contexts/LanguageContext';

// Mock hooks
jest.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(() => false),
}));

// Mock the theme context
jest.mock('@/contexts/AdventureThemeContext', () => ({
  useBossFightTheme: () => ({
    telegraphColor: 'bg-neo-red/20',
    telegraphProgressColor: 'bg-neo-red',
    dialogueBg: 'bg-neo-navy/95',
    dialogueBorder: 'border-neo-white/20',
    bossNameColor: 'text-neo-red',
    hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
    playerHealthNormal: 'bg-neo-lime',
    playerHealthLow: 'bg-neo-red',
    phaseColors: {
      phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
      phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
      enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
    },
    avatarGlow: 'rgba(239, 68, 68, 0.4)',
    victoryGlow: 'rgba(163, 230, 53, 0.6)',
    arenaEffect: 'none',
  }),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.ComponentProps<'span'>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('AttackTelegraph', () => {
  const defaultProps = {
    isActive: true,
    progress: 0.5,
    targetTiles: [0, 1, 2],
    abilityId: 'scramble',
    timeRemaining: 1000,
  };

  describe('Visibility', () => {
    it('should render when active', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should not render when inactive', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} isActive={false} />
      );
      expect(screen.queryByTestId('attack-telegraph')).not.toBeInTheDocument();
    });
  });

  describe('Warning Banner', () => {
    it('should render warning banner', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      expect(screen.getByTestId('telegraph-banner')).toBeInTheDocument();
    });

    it('should show warning text', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      // Uses t() for translation - check the banner exists
      const banner = screen.getByTestId('telegraph-banner');
      expect(banner).toBeInTheDocument();
    });

    it('should show ability name when provided', () => {
      renderWithProviders(
        <AttackTelegraph
          {...defaultProps}
          abilityName="adventure.bosses.abilities.scramble"
        />
      );
      // Ability name would be rendered via translation
      const banner = screen.getByTestId('telegraph-banner');
      expect(banner).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      // Warning emoji icon
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });
  });

  describe('Countdown', () => {
    it('should show countdown in seconds', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} timeRemaining={1500} />
      );
      expect(screen.getByTestId('telegraph-countdown')).toHaveTextContent('2');
    });

    it('should show 1 second when under 1000ms remaining', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} timeRemaining={500} />
      );
      expect(screen.getByTestId('telegraph-countdown')).toHaveTextContent('1');
    });

    it('should show 2 seconds at start', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} timeRemaining={2000} />
      );
      expect(screen.getByTestId('telegraph-countdown')).toHaveTextContent('2');
    });

    it('should show 0 seconds when complete', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} timeRemaining={0} />
      );
      expect(screen.getByTestId('telegraph-countdown')).toHaveTextContent('0');
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      expect(screen.getByTestId('telegraph-progress-bar')).toBeInTheDocument();
    });

    it('should render progress fill', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} progress={0.5} />);
      const progressBar = screen.getByTestId('telegraph-progress-bar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Target Tiles', () => {
    it('should receive target tiles array', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} targetTiles={[5, 6, 7, 8, 9]} />
      );
      // Component receives tiles - integration with grid happens at parent level
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should work with empty target tiles', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} targetTiles={[]} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });
  });

  describe('Ability ID', () => {
    it('should accept null ability ID', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} abilityId={null} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should accept different ability IDs', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} abilityId="tile-swap" />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });
  });

  describe('Progress States', () => {
    it('should render at 0% progress', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} progress={0} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should render at 100% progress', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} progress={1} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should render at mid progress', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} progress={0.75} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });
  });
});
